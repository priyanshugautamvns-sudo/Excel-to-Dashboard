"use client";

import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import type { DataRow, DatasetAnalysis } from "@/lib/types";

export async function exportElementAsPng(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Dashboard element was not found.");
  const canvas = await html2canvas(element, { backgroundColor: "#08111f", scale: 2 });
  canvas.toBlob((blob) => {
    if (blob) saveAs(blob, fileName);
  });
}

export async function exportElementAsPdf(elementId: string, fileName: string, analysis: DatasetAnalysis) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Dashboard element was not found.");
  const canvas = await html2canvas(element, { backgroundColor: "#08111f", scale: 2 });
  const image = canvas.toDataURL("image/png");
  const pdf = new jsPDF("landscape", "pt", "a4");
  pdf.setFontSize(18);
  pdf.text(`ExcelInsight AI Report: ${analysis.fileName}`, 32, 32);
  pdf.addImage(image, "PNG", 32, 52, 780, 480);
  pdf.save(fileName);
}

export function exportAnnotatedExcel(analysis: DatasetAnalysis, rows: DataRow[], fileName: string) {
  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.json_to_sheet(rows.slice(0, 100_000));
  const insightsSheet = XLSX.utils.json_to_sheet(
    analysis.insights.map((insight) => ({
      type: insight.kind,
      title: insight.title,
      detail: insight.detail,
      severity: insight.severity,
      confidence: insight.confidence
    }))
  );
  const summarySheet = XLSX.utils.json_to_sheet([analysis.summary]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, insightsSheet, "AI Insights");
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Cleaned Data");
  XLSX.writeFile(workbook, fileName);
}

export async function exportPowerPoint(analysis: DatasetAnalysis, fileName: string) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "ExcelInsight AI";

  const title = pptx.addSlide();
  title.background = { color: "08111F" };
  title.addText("ExcelInsight AI", { x: 0.6, y: 0.45, w: 4.6, h: 0.4, color: "6EE7D8", fontSize: 18, bold: true });
  title.addText(analysis.fileName, { x: 0.6, y: 1.1, w: 11.5, h: 0.65, color: "FFFFFF", fontSize: 34, bold: true });
  title.addText(analysis.executiveSummary, { x: 0.6, y: 2, w: 11.4, h: 1.4, color: "D5E7F3", fontSize: 16, breakLine: false });
  title.addText(`Rows: ${analysis.summary.rows.toLocaleString()}   Columns: ${analysis.summary.columns}   Quality: ${analysis.summary.dataQualityScore}/100`, {
    x: 0.6,
    y: 4.1,
    w: 10,
    h: 0.35,
    color: "FFFFFF",
    fontSize: 16
  });

  const insights = pptx.addSlide();
  insights.background = { color: "F8FAFC" };
  insights.addText("Critical Insights", { x: 0.6, y: 0.45, w: 6, h: 0.45, color: "0F172A", fontSize: 26, bold: true });
  analysis.insights.slice(0, 6).forEach((insight, index) => {
    insights.addText(`${index + 1}. ${insight.title}`, { x: 0.7, y: 1.15 + index * 0.78, w: 5.4, h: 0.3, color: "0F172A", fontSize: 14, bold: true });
    insights.addText(insight.detail, { x: 0.7, y: 1.43 + index * 0.78, w: 11.5, h: 0.3, color: "475569", fontSize: 10 });
  });

  await pptx.writeFile({ fileName });
}

export function createShareLink(analysis: DatasetAnalysis) {
  const params = new URLSearchParams({ id: analysis.id });
  return `${window.location.origin}/dashboard?${params.toString()}`;
}
