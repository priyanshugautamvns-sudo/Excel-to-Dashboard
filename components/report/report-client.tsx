"use client";

import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText, Lightbulb, Target, TrendingUp } from "lucide-react";
import { EmptyDashboard } from "@/components/dashboard/empty-dashboard";
import { SummaryStrip } from "@/components/dashboard/summary-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataset } from "@/hooks/use-dataset";
import { exportAnnotatedExcel, exportElementAsPdf, exportPowerPoint } from "@/lib/exporters";
import { formatNumber, formatPercent, titleCase } from "@/lib/utils";
import type { Insight } from "@/lib/types";

export function ReportClient() {
  const searchParams = useSearchParams();
  const { dataset, loading, error } = useDataset(searchParams.get("id"));

  if (loading) return <ReportLoading />;
  if (!dataset || error) return <EmptyDashboard message={error ?? undefined} />;

  const { analysis, rows } = dataset;
  const exportName = analysis.fileName.replace(/\.[^.]+$/, "");
  const riskInsights = analysis.insights.filter((insight) => insight.kind === "risk" || insight.kind === "anomaly");
  const recommendations = analysis.insights.filter((insight) => insight.kind === "recommendation");
  const keyInsights = analysis.insights.filter((insight) => insight.kind !== "recommendation" && insight.kind !== "risk" && insight.kind !== "anomaly");

  return (
    <section className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary">
            <FileText className="h-4 w-4" />
            <span>Analysis report</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">{analysis.fileName}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{analysis.executiveSummary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void exportElementAsPdf("report-export-surface", `${exportName}-analysis-report.pdf`, analysis)}>
            PDF
          </Button>
          <Button variant="outline" onClick={() => exportAnnotatedExcel(analysis, rows, `${exportName}-annotated.xlsx`)}>
            Excel
          </Button>
          <Button variant="primary" onClick={() => void exportPowerPoint(analysis, `${exportName}-insights.pptx`)}>
            PowerPoint
          </Button>
        </div>
      </div>

      <div id="report-export-surface" className="space-y-6 rounded-lg bg-background p-0">
        <SummaryStrip analysis={analysis} />

        <ReportSection title="Executive Summary" icon={CheckCircle2}>
          <p className="text-base leading-8 text-muted-foreground">{analysis.executiveSummary}</p>
        </ReportSection>

        <div className="grid gap-5 lg:grid-cols-2">
          <InsightList title="Critical Observations" icon={Lightbulb} insights={keyInsights} />
          <InsightList title="Risk Alerts" icon={AlertTriangle} insights={riskInsights} />
        </div>

        <InsightList title="Business Recommendations" icon={Target} insights={recommendations} />

        {analysis.forecast && (
          <ReportSection title="Predictive Analytics" icon={TrendingUp}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric title="Forecast Metric" value={titleCase(analysis.forecast.valueKey)} />
              <Metric title="Time Field" value={titleCase(analysis.forecast.dateKey)} />
              <Metric title="Direction" value={analysis.forecast.slope >= 0 ? "Upward" : "Downward"} />
            </div>
          </ReportSection>
        )}

        <ReportSection title="Column Intelligence" icon={FileText}>
          <div className="overflow-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  {["Column", "Type", "Unique", "Missing", "Sample", "Signals"].map((header) => (
                    <th key={header} className="border-b border-border px-3 py-2">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.columns.map((column) => (
                  <tr key={column.name} className="border-b border-border/60">
                    <td className="px-3 py-3 font-medium">{column.name}</td>
                    <td className="px-3 py-3"><Badge variant="outline">{column.type}</Badge></td>
                    <td className="px-3 py-3">{formatNumber(column.uniqueCount, 0)}</td>
                    <td className="px-3 py-3">{formatPercent(column.missingRatio)}</td>
                    <td className="max-w-[260px] truncate px-3 py-3">{column.sampleValues.map(String).join(", ")}</td>
                    <td className="px-3 py-3">{column.warnings.join(", ") || "Stable"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>
      </div>
    </section>
  );
}

function InsightList({ title, icon: Icon, insights }: { title: string; icon: typeof Lightbulb; insights: Insight[] }) {
  return (
    <ReportSection title={title} icon={Icon}>
      <div className="space-y-3">
        {insights.length ? (
          insights.map((insight) => (
            <div key={insight.id} className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{insight.title}</p>
                <Badge variant={insight.severity === "critical" ? "danger" : insight.severity === "warning" ? "warning" : insight.severity === "positive" ? "success" : "outline"}>
                  {insight.kind}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.detail}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No major signal detected in this category.</p>
        )}
      </div>
    </ReportSection>
  );
}

function ReportSection({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ReportLoading() {
  return (
    <section className="mx-auto max-w-[1200px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-20 w-full max-w-3xl" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-72 w-full" />
    </section>
  );
}
