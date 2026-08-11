import { NextRequest, NextResponse } from "next/server";
import { analyzeReceiptImage } from "@/lib/fal";

interface AnalyzeRequestImage {
  id: string;
  imageBase64: string;
}

export async function POST(request: NextRequest) {
  let body: { images?: AnalyzeRequestImage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const images = body.images;
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ success: false, error: "No images provided." }, { status: 400 });
  }

  const results = await Promise.all(
    images.map(async (image) => {
      try {
        const data = await analyzeReceiptImage(image.imageBase64);
        return { id: image.id, success: true as const, data };
      } catch (error) {
        return {
          id: image.id,
          success: false as const,
          error: error instanceof Error ? error.message : "Unknown error while analyzing receipt.",
        };
      }
    })
  );

  return NextResponse.json({ success: true, results });
}
