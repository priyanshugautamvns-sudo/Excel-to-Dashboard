import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedTabularFile = {
  rows: Record<string, unknown>[];
  sheetName?: string;
  availableSheets?: string[];
};

export async function parseTabularFile(fileName: string, buffer: ArrayBuffer, sheetName?: string): Promise<ParsedTabularFile> {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    const text = new TextDecoder("utf-8").decode(buffer);
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (header) => header.trim()
    });

    if (parsed.errors.length) {
      const message = parsed.errors.slice(0, 3).map((error) => error.message).join("; ");
      throw new Error(`CSV parsing failed: ${message}`);
    }

    return {
      rows: parsed.data.filter((row) => Object.values(row).some((value) => value !== null && String(value).trim() !== "")),
      sheetName: "CSV"
    };
  }

  if (extension === "xlsx" || extension === "xls") {
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      dense: false
    });
    const availableSheets = workbook.SheetNames;
    const selectedSheet = sheetName && workbook.Sheets[sheetName] ? sheetName : availableSheets[0];
    const worksheet = workbook.Sheets[selectedSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null,
      raw: true,
      blankrows: false
    });

    return {
      rows,
      sheetName: selectedSheet,
      availableSheets
    };
  }

  throw new Error("Unsupported file type. Upload a .xlsx, .xls, or .csv file.");
}

export function validateTabularFile(file: File) {
  const allowed = [".xlsx", ".xls", ".csv"];
  const isAllowed = allowed.some((extension) => file.name.toLowerCase().endsWith(extension));
  if (!isAllowed) throw new Error("Upload a valid Excel or CSV file.");
  if (file.size > 80 * 1024 * 1024) throw new Error("Files above 80MB should be processed with the server route or split before upload.");
}
