"use client";

import { AlertTriangle, Database, Gauge, Layers3, Sigma } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { DatasetAnalysis } from "@/lib/types";

export function SummaryStrip({ analysis }: { analysis: DatasetAnalysis }) {
  const items = [
    { label: "Rows", value: formatNumber(analysis.summary.rows, 0), icon: Database },
    { label: "Columns", value: String(analysis.summary.columns), icon: Layers3 },
    { label: "Quality", value: `${analysis.summary.dataQualityScore}/100`, icon: Gauge },
    { label: "Missing", value: formatPercent(analysis.summary.missingRatio), icon: AlertTriangle },
    { label: "Numeric Fields", value: String(analysis.summary.numericColumns), icon: Sigma }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="glass-panel">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{item.label}</p>
                <p className="truncate text-2xl font-semibold">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
