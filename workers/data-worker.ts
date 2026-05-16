import { analyzeDataset, coerceRowsForAnalysis } from "@/lib/analysis";
import { parseTabularFile } from "@/lib/file-parser";
import type { StoredDataset } from "@/lib/types";

type WorkerRequest = {
  fileName: string;
  buffer: ArrayBuffer;
  sheetName?: string;
};

type WorkerResponse =
  | { type: "progress"; progress: number; message: string }
  | { type: "complete"; dataset: StoredDataset }
  | { type: "error"; message: string };

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { fileName, buffer, sheetName } = event.data;
  const post = (message: WorkerResponse) => ctx.postMessage(message);

  try {
    post({ type: "progress", progress: 18, message: "Reading workbook structure" });
    const parsed = await parseTabularFile(fileName, buffer, sheetName);

    post({ type: "progress", progress: 45, message: "Detecting column types and data quality" });
    const analysis = analyzeDataset({
      rows: parsed.rows,
      fileName,
      sheetName: parsed.sheetName,
      availableSheets: parsed.availableSheets
    });

    post({ type: "progress", progress: 76, message: "Generating charts, anomalies, and forecasts" });
    const rows = coerceRowsForAnalysis(parsed.rows);

    post({ type: "progress", progress: 96, message: "Packaging dashboard" });
    post({
      type: "complete",
      dataset: {
        analysis,
        rows
      }
    });
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : "Unable to process file." });
  }
};

export {};
