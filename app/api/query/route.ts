import { NextResponse } from "next/server";
import { answerDatasetQuestion } from "@/lib/query-engine";
import type { DataRow, DatasetAnalysis } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      question?: string;
      analysis?: DatasetAnalysis;
      rows?: DataRow[];
    };

    if (!body.question || !body.analysis || !Array.isArray(body.rows)) {
      return NextResponse.json({ error: "question, analysis, and rows are required." }, { status: 400 });
    }

    return NextResponse.json(answerDatasetQuestion(body.question, body.analysis, body.rows));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to answer question." }, { status: 400 });
  }
}
