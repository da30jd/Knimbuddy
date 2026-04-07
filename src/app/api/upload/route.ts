import { NextRequest } from "next/server";
// Import the internal module directly — pdf-parse's index.js runs a debug
// block on import that tries to read a test PDF off disk and crashes.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("[/api/upload] POST received");
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "No file provided under field 'file'" },
        { status: 400 }
      );
    }

    if (file.type && file.type !== "application/pdf") {
      return Response.json(
        { error: `Expected a PDF, got '${file.type}'` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("[/api/upload] parsing", file.name, buffer.length, "bytes");

    const parsed = await pdfParse(buffer);
    console.log(
      "[/api/upload] parsed pages:",
      parsed.numpages,
      "chars:",
      parsed.text.length
    );

    return Response.json({
      text: parsed.text,
      pages: parsed.numpages,
      name: file.name,
    });
  } catch (err) {
    console.error("[/api/upload] error", err);
    return Response.json(
      { error: (err as Error).message || "Failed to parse PDF" },
      { status: 500 }
    );
  }
}
