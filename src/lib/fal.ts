import { CATEGORIES } from "./categories";
import type { ExtractedReceipt } from "./types";

const FAL_VISION_ENDPOINT = "https://fal.run/openrouter/router/vision";
const FAL_MODEL = "anthropic/claude-sonnet-5";

const SYSTEM_PROMPT = `You are a receipt-scanning assistant. You extract structured data from a single photographed or scanned receipt image and return ONLY valid JSON, with no markdown formatting and no extra commentary.`;

function buildUserPrompt(): string {
  const categoryList = CATEGORIES.join(", ");
  return `Read the receipt in this image and extract the following fields as a single JSON object:

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

Rules:
- Do not invent values. If a field is not visible on the receipt, use null (or [] for items).
- "total" and "tax" must be plain numbers (no currency symbols, no thousands separators).
- Return ONLY the JSON object, nothing else.`;
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Model did not return valid JSON.");
  }
}

function normalize(parsed: unknown): ExtractedReceipt {
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

export async function analyzeReceiptImage(imageDataUri: string): Promise<ExtractedReceipt> {
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
      max_tokens: 1000,
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
  return normalize(parsed);
}
