"use client";

import { Activity, Boxes, FunctionSquare, GitBranch, Sigma } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { DatasetAnalysis } from "@/lib/types";

export function StatsPanel({ analysis }: { analysis: DatasetAnalysis }) {
  const numeric = analysis.columns.filter((column) => column.type === "number" && column.stats);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Statistical Metrics</CardTitle>
          <p className="text-sm text-muted-foreground">Mean, median, mode, variance, deviation, skewness, kurtosis, and outliers.</p>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                {["Column", "Mean", "Median", "Mode", "Variance", "Std Dev", "Skew", "Kurtosis", "Outliers"].map((header) => (
                  <th key={header} className="border-b border-border px-3 py-2">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numeric.map((column) => (
                <tr key={column.name} className="border-b border-border/60">
                  <td className="px-3 py-3 font-medium">{column.name}</td>
                  <td className="px-3 py-3">{formatNumber(column.stats?.mean ?? 0)}</td>
                  <td className="px-3 py-3">{formatNumber(column.stats?.median ?? 0)}</td>
                  <td className="px-3 py-3">{column.stats?.mode === null ? "None" : formatNumber(column.stats?.mode ?? 0)}</td>
                  <td className="px-3 py-3">{formatNumber(column.stats?.variance ?? 0)}</td>
                  <td className="px-3 py-3">{formatNumber(column.stats?.standardDeviation ?? 0)}</td>
                  <td className="px-3 py-3">{(column.stats?.skewness ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-3">{(column.stats?.kurtosis ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-3">{column.stats?.outlierCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ML Analysis Readiness</CardTitle>
          <p className="text-sm text-muted-foreground">Modeling opportunities inferred from the data profile.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <MlItem icon={Boxes} title="Clustering" active={analysis.summary.numericColumns >= 2} detail="Segment records using numeric dimensions and category overlays." />
          <MlItem icon={FunctionSquare} title="Regression" active={analysis.summary.numericColumns >= 2} detail="Predict a continuous target from related numeric fields." />
          <MlItem icon={GitBranch} title="Classification" active={analysis.summary.categoricalColumns >= 1 && analysis.summary.numericColumns >= 1} detail="Suggest classes once a categorical target is selected." />
          <MlItem icon={Activity} title="Forecasting" active={Boolean(analysis.forecast)} detail="Date and numeric fields support directional time-series forecasting." />
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-2">
              <Sigma className="h-4 w-4 text-primary" />
              <p className="font-medium">Complexity Score</p>
              <Badge variant="outline">{analysis.summary.complexityScore}/100</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Missing data is {formatPercent(analysis.summary.missingRatio)} and duplicate records total {analysis.summary.duplicateRows.toLocaleString()}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MlItem({ icon: Icon, title, active, detail }: { icon: typeof Boxes; title: string; active: boolean; detail: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className={active ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
        <p className="font-medium">{title}</p>
        <Badge variant={active ? "success" : "outline"}>{active ? "Ready" : "Needs fields"}</Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}
