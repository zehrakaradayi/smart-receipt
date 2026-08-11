import { NextResponse } from "next/server";

export async function GET() {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!scriptUrl) {
    return NextResponse.json(
      { success: false, error: "GOOGLE_APPS_SCRIPT_URL is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(scriptUrl, { method: "GET", cache: "no-store" });
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
