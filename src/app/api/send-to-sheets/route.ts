import { NextRequest, NextResponse } from "next/server";
import type { SheetReceiptPayload } from "@/lib/types";

export async function POST(request: NextRequest) {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!scriptUrl) {
    return NextResponse.json(
      { success: false, error: "GOOGLE_APPS_SCRIPT_URL is not configured on the server." },
      { status: 500 }
    );
  }

  let body: { receipts?: SheetReceiptPayload[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const receipts = body.receipts;
  if (!Array.isArray(receipts) || receipts.length === 0) {
    return NextResponse.json({ success: false, error: "No receipts provided." }, { status: 400 });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipts }),
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Apps Script returned a non-JSON response: ${text.slice(0, 300)}`);
    }

    return NextResponse.json(parsed, { status: response.ok ? 200 : 502 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to reach Google Apps Script.",
      },
      { status: 502 }
    );
  }
}
