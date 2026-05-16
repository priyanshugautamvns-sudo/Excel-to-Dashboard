"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { AiAnalyst } from "@/components/dashboard/ai-analyst";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { DashboardControls } from "@/components/dashboard/dashboard-controls";
import { DataTable } from "@/components/dashboard/data-table";
import { EmptyDashboard } from "@/components/dashboard/empty-dashboard";
import { StatsPanel } from "@/components/dashboard/stats-panel";
import { SummaryStrip } from "@/components/dashboard/summary-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataset } from "@/hooks/use-dataset";
import { createShareLink, exportAnnotatedExcel, exportElementAsPdf, exportElementAsPng, exportPowerPoint } from "@/lib/exporters";
import type { ChartRecommendation, ChartType, DashboardTheme, DataRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type LayoutState = {
  order: string[];
  overrides: Record<string, ChartType>;
  compact: Record<string, boolean>;
  theme: DashboardTheme;
};

export function DashboardClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { dataset, loading, error } = useDataset(id);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<DashboardTheme>("dark");
  const [order, setOrder] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ChartType>>({});
  const [compact, setCompact] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) return;
    const raw = localStorage.getItem(layoutKey(dataset.analysis.id));
    if (raw) {
      const saved = JSON.parse(raw) as LayoutState;
      setOrder(saved.order);
      setOverrides(saved.overrides ?? {});
      setCompact(saved.compact ?? {});
      setTheme(saved.theme ?? "dark");
    } else {
      setOrder(dataset.analysis.chartRecommendations.map((chart) => chart.id));
    }
  }, [dataset]);

  const filteredRows = useMemo(() => {
    if (!dataset) return [];
    return applyFilters(dataset.rows, search, filters);
  }, [dataset, filters, search]);

  const charts = useMemo(() => {
    if (!dataset) return [];
    const byId = new Map(dataset.analysis.chartRecommendations.map((chart) => [chart.id, chart]));
    const ordered = order.map((chartId) => byId.get(chartId)).filter(Boolean) as ChartRecommendation[];
    const missing = dataset.analysis.chartRecommendations.filter((chart) => !order.includes(chart.id));
    return [...ordered, ...missing];
  }, [dataset, order]);

  if (loading) return <DashboardLoading />;
  if (!dataset || error) return <EmptyDashboard message={error ?? undefined} />;

  const { analysis } = dataset;

  const updateFilter = (column: string, value: string) => {
    setFilters((current) => {
      const next = { ...current };
      if (value) next[column] = value;
      else delete next[column];
      return next;
    });
  };

  const saveLayout = () => {
    const state: LayoutState = {
      order: charts.map((chart) => chart.id),
      overrides,
      compact,
      theme
    };
    localStorage.setItem(layoutKey(analysis.id), JSON.stringify(state));
    flash("Layout saved");
  };

  const moveChart = (chartId: string, direction: -1 | 1) => {
    setOrder((current) => {
      const base = current.length ? [...current] : charts.map((chart) => chart.id);
      const index = base.indexOf(chartId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= base.length) return base;
      const [removed] = base.splice(index, 1);
      base.splice(nextIndex, 0, removed);
      return base;
    });
  };

  const exportName = analysis.fileName.replace(/\.[^.]+$/, "");

  return (
    <div data-dashboard-theme={theme} className={cn(theme === "dark" || theme === "neon" ? "dark" : "", "min-h-screen pb-24 md:pb-10")}>
      <section className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Generated dashboard</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">{analysis.fileName}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              {analysis.sheetName ? `Sheet: ${analysis.sheetName}. ` : ""}
              {analysis.executiveSummary}
            </p>
          </div>
          {notice && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-300">
              <Check className="h-4 w-4" />
              {notice}
            </div>
          )}
        </motion.div>

        <DashboardControls
          columns={analysis.columns}
          filters={filters}
          search={search}
          theme={theme}
          onSearchChange={setSearch}
          onFilterChange={updateFilter}
          onThemeChange={setTheme}
          onSaveLayout={saveLayout}
          onExportPng={() => void exportElementAsPng("dashboard-export-surface", `${exportName}-dashboard.png`)}
          onExportPdf={() => void exportElementAsPdf("dashboard-export-surface", `${exportName}-report.pdf`, analysis)}
          onExportExcel={() => exportAnnotatedExcel(analysis, filteredRows, `${exportName}-annotated.xlsx`)}
          onExportPowerPoint={() => void exportPowerPoint(analysis, `${exportName}-insights.pptx`)}
          onShare={() => {
            void navigator.clipboard.writeText(createShareLink(analysis));
            flash("Share link copied");
          }}
        />

        <div id="dashboard-export-surface" className="space-y-6 rounded-lg bg-background/80 p-0">
          <SummaryStrip analysis={analysis} />

          <div className="grid gap-5 lg:grid-cols-4">
            {charts
              .filter((chart) => chart.type === "kpi")
              .slice(0, 4)
              .map((chart) => (
                <ChartRenderer key={chart.id} chart={chart} rows={filteredRows} analysis={analysis} />
              ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {charts
              .filter((chart) => chart.type !== "kpi")
              .map((chart) => (
                <ChartRenderer
                  key={chart.id}
                  chart={chart}
                  rows={filteredRows}
                  analysis={analysis}
                  compact={compact[chart.id]}
                  overrideType={overrides[chart.id]}
                  onTypeChange={(type) => setOverrides((current) => ({ ...current, [chart.id]: type }))}
                  onMoveUp={() => moveChart(chart.id, -1)}
                  onMoveDown={() => moveChart(chart.id, 1)}
                  onToggleSize={() => setCompact((current) => ({ ...current, [chart.id]: !current[chart.id] }))}
                  onDrillDown={(column, value) => {
                    updateFilter(column, value);
                    flash(`Filtered ${column}: ${value}`);
                  }}
                />
              ))}
          </div>

          <AiAnalyst analysis={analysis} rows={filteredRows} />
          <StatsPanel analysis={analysis} />
          <DataTable rows={filteredRows} />
        </div>
      </section>
    </div>
  );

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 1800);
  }
}

function applyFilters(rows: DataRow[], search: string, filters: Record<string, string>) {
  const query = search.trim().toLowerCase();
  const filterEntries = Object.entries(filters).filter(([, value]) => value);
  return rows.filter((row) => {
    if (query && !Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query))) return false;
    return filterEntries.every(([key, value]) => String(row[key] ?? "") === value);
  });
}

function layoutKey(id: string) {
  return `excelinsight.layout.${id}`;
}

function DashboardLoading() {
  return (
    <section className="mx-auto max-w-[1500px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-16 w-full max-w-3xl" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </section>
  );
}
