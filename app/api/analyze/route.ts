import { NextResponse } from "next/server";
import { analyzeDataset, coerceRowsForAnalysis } from "@/lib/analysis";
import { parseTabularFile, validateTabularFile } from "@/lib/file-parser";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const sheetName = formData.get("sheetName");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A file field is required." }, { status: 400 });
    }

    validateTabularFile(file);
    const parsed = await parseTabularFile(file.name, await file.arrayBuffer(), typeof sheetName === "string" ? sheetName : undefined);
    const analysis = analyzeDataset({
      rows: parsed.rows,
      fileName: file.name,
      sheetName: parsed.sheetName,
      availableSheets: parsed.availableSheets
    });

    return NextResponse.json({
      analysis,
      rows: coerceRowsForAnalysis(parsed.rows)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to analyze file." }, { status: 400 });
  }
}
