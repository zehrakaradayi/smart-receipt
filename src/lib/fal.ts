import { CATEGORIES } from "./categories";
import type { ExtractedReceipt } from "./types";

const FAL_VISION_ENDPOINT = "https://fal.run/openrouter/router/vision";
const FAL_MODEL = "anthropic/claude-sonnet-5";

const SYSTEM_PROMPT = `You are a receipt-scanning assistant. You extract structured data from a photographed or scanned image that may contain one or more separate receipts, and return ONLY valid JSON, with no markdown formatting and no extra commentary.`;

function buildUserPrompt(): string {
  const categoryList = CATEGORIES.join(", ");
  return `This image may contain a single receipt, or it may contain two or more distinct receipts (for example, several receipts photographed side by side, overlapping, or stacked). Identify every distinct receipt in the image and extract the following fields for each one.

Return a JSON ARRAY, one object per distinct receipt found:

[
  {
    "merchant": string or null,
    "date": string in YYYY-MM-DD format or null,
    "time": string in HH:MM (24h) format or null,
    "category": one of [${categoryList}] that best matches the purchase, or null if unclear,
    "total": number (the final total amount paid) or null,
    "currency": ISO-like currency code or symbol as printed on the receipt (e.g. "TRY", "USD", "EUR") or null,
    "tax": number (VAT / tax amount) or null,
    "bankName": string (bank or card issuer name if printed) or null,
    "items": array of strings, one per purchased item/line (short names only, no prices). Use an empty array if items cannot be read.
  }
]

Rules:
- If the image contains exactly one receipt, return an array with exactly one element.
- Do not invent values. If a field is not visible on a receipt, use null (or [] for items).
- "total" and "tax" must be plain numbers (no currency symbols, no thousands separators).
- Return ONLY the JSON array, nothing else.`;
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBracket = candidate.search(/[[{]/);
    const lastBracket = Math.max(candidate.lastIndexOf("]"), candidate.lastIndexOf("}"));
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(candidate.slice(firstBracket, lastBracket + 1));
    }
    throw new Error("Model did not return valid JSON.");
  }
}

function normalizeOne(parsed: unknown): ExtractedReceipt {
  const obj = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;

  const toStringOrNull = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
  const toNumberOrNull = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.replace(/[^0-9.-]/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  return {
    merchant: toStringOrNull(obj.merchant),
    date: toStringOrNull(obj.date),
    time: toStringOrNull(obj.time),
    category: toStringOrNull(obj.category),
    total: toNumberOrNull(obj.total),
    currency: toStringOrNull(obj.currency),
    tax: toNumberOrNull(obj.tax),
    bankName: toStringOrNull(obj.bankName),
    items: Array.isArray(obj.items) ? obj.items.filter((i): i is string => typeof i === "string") : [],
  };
}

function normalizeMany(parsed: unknown): ExtractedReceipt[] {
  if (Array.isArray(parsed)) {
    return parsed.map(normalizeOne);
  }
  return [normalizeOne(parsed)];
}

/**
 * Analyzes a single photo, which may contain one or more distinct receipts.
 * Returns one ExtractedReceipt per receipt detected in the image.
 */
export async function analyzeReceiptImage(imageDataUri: string): Promise<ExtractedReceipt[]> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("FAL_KEY is not configured on the server.");
  }

  const response = await fetch(FAL_VISION_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: FAL_MODEL,
      system_prompt: SYSTEM_PROMPT,
      prompt: buildUserPrompt(),
      image_urls: [imageDataUri],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`fal.ai request failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const json = (await response.json()) as { output?: string };
  if (!json.output) {
    throw new Error("fal.ai response did not include an output field.");
  }

  const parsed = extractJson(json.output);
  const receipts = normalizeMany(parsed);
  return receipts.length > 0 ? receipts : [normalizeOne({})];
}
