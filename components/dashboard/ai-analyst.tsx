"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Lightbulb, Send, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { answerDatasetQuestion } from "@/lib/query-engine";
import type { DataRow, DatasetAnalysis, Insight, QueryResponse } from "@/lib/types";

type Message = {
  role: "user" | "assistant";
  content: string;
  response?: QueryResponse;
};

export function AiAnalyst({ analysis, rows }: { analysis: DatasetAnalysis; rows: DataRow[] }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: analysis.executiveSummary
    }
  ]);
  const [asking, setAsking] = useState(false);
  const grouped = useMemo(() => groupInsights(analysis.insights), [analysis.insights]);

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    const currentQuestion = question;
    setQuestion("");
    setAsking(true);
    setMessages((current) => [...current, { role: "user", content: currentQuestion }]);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion, analysis, rows })
      });
      const json = (await response.json()) as QueryResponse & { error?: string };
      if (!response.ok) throw new Error(json.error || "Backend query failed.");

      setMessages((current) => [...current, { role: "assistant", content: json.answer, response: json }]);
    } catch {
      const fallback = answerDatasetQuestion(currentQuestion, analysis, rows);
      setMessages((current) => [...current, { role: "assistant", content: fallback.answer, response: fallback }]);
    } finally {
      setAsking(false);
    }
  };

  const lastChart = [...messages].reverse().find((message) => message.response?.chart)?.response?.chart;

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>AI Data Analyst</CardTitle>
              <p className="text-sm text-muted-foreground">Executive summary, risks, trends, and recommendations</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          <InsightGroup title="Key Insights" icon={Lightbulb} insights={grouped.key} />
          <InsightGroup title="Anomalies and Risks" icon={ShieldAlert} insights={grouped.risk} />
          <InsightGroup title="Trends and Forecasts" icon={TrendingUp} insights={grouped.trend} />
          <InsightGroup title="Recommendations" icon={Sparkles} insights={grouped.recommendation} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Natural Language Querying</CardTitle>
          <p className="text-sm text-muted-foreground">Ask about drops, top performers, comparisons, forecasts, quality, or correlations.</p>
        </CardHeader>
        <CardContent className="flex min-h-[560px] flex-col p-5">
          <div className="flex-1 space-y-3 overflow-auto pr-1">
            {messages.map((message, index) => (
              <motion.div
                key={`${message.role}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-[92%] rounded-lg p-3 text-sm leading-6 ${
                  message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                {message.content}
              </motion.div>
            ))}
          </div>

          {lastChart && (
            <div className="mt-4 rounded-lg border border-border bg-card p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Relevant chart</p>
              <div className="pointer-events-none">
                <ChartRenderer chart={lastChart} rows={rows} analysis={analysis} compact />
              </div>
            </div>
          )}

          <form onSubmit={ask} className="mt-4 flex gap-2">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Why did revenue drop? Show top 5 products. Predict next month."
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none ring-primary/30 focus:ring-4"
              disabled={asking}
            />
            <Button type="submit" disabled={asking}>
              <Send className="h-4 w-4" />
              {asking ? "Thinking" : "Ask"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightGroup({ title, icon: Icon, insights }: { title: string; icon: typeof Lightbulb; insights: Insight[] }) {
  if (!insights.length) return null;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-2">
        {insights.slice(0, 4).map((insight) => (
          <div key={insight.id} className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{insight.title}</p>
              <Badge variant={insight.severity === "critical" ? "danger" : insight.severity === "warning" ? "warning" : insight.severity === "positive" ? "success" : "outline"}>
                {Math.round(insight.confidence * 100)}%
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function groupInsights(insights: Insight[]) {
  return {
    key: insights.filter((insight) => insight.kind === "executive" || insight.kind === "key" || insight.kind === "correlation"),
    risk: insights.filter((insight) => insight.kind === "risk" || insight.kind === "anomaly"),
    trend: insights.filter((insight) => insight.kind === "trend" || insight.kind === "forecast"),
    recommendation: insights.filter((insight) => insight.kind === "recommendation")
  };
}
