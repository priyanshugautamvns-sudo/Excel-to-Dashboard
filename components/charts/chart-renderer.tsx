"use client";

import { Fragment } from "react";
import dynamic from "next/dynamic";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Chart as ChartJS, Filler, Legend as ChartLegend, LineElement, PointElement, RadialLinearScale, Tooltip as ChartTooltip } from "chart.js";
import { Radar } from "react-chartjs-2";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildChartData } from "@/lib/chart-data";
import { formatNumber } from "@/lib/utils";
import type { ChartRecommendation, ChartType, DataRow, DatasetAnalysis } from "@/lib/types";
import { ArrowDown, ArrowUp, Expand, Shrink } from "lucide-react";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, ChartTooltip, ChartLegend);

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-muted-foreground">Loading visual engine...</div>
});

const COLORS = ["#14b8a6", "#f59e0b", "#ef476f", "#3b82f6", "#8b5cf6", "#22c55e", "#f97316", "#06b6d4", "#a3e635"];

type ChartRendererProps = {
  chart: ChartRecommendation;
  rows: DataRow[];
  analysis: DatasetAnalysis;
  overrideType?: ChartType;
  compact?: boolean;
  onTypeChange?: (type: ChartType) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onToggleSize?: () => void;
  onDrillDown?: (key: string, value: string) => void;
};

const chartTypes: ChartType[] = ["bar", "line", "area", "pie", "scatter", "heatmap", "histogram", "box", "radar", "funnel", "treemap", "sankey"];

export function ChartRenderer({
  chart,
  rows,
  analysis,
  overrideType,
  compact,
  onTypeChange,
  onMoveUp,
  onMoveDown,
  onToggleSize,
  onDrillDown
}: ChartRendererProps) {
  const type = overrideType ?? chart.type;
  const data = buildChartData(rows, analysis, { ...chart, type });
  const height = compact ? 260 : 340;

  if (type === "kpi") return <KpiCard chart={chart} analysis={analysis} />;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate">{chart.title}</CardTitle>
              <Badge variant="outline">{type}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{chart.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {onTypeChange && (
              <select
                className="h-9 rounded-lg border border-border bg-card px-2 text-xs"
                value={type}
                onChange={(event) => onTypeChange(event.target.value as ChartType)}
                aria-label="Chart type"
              >
                {chartTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            )}
            {onToggleSize && (
              <Button size="icon" variant="outline" onClick={onToggleSize} title={compact ? "Expand" : "Compact"}>
                {compact ? <Expand className="h-4 w-4" /> : <Shrink className="h-4 w-4" />}
              </Button>
            )}
            {onMoveUp && (
              <Button size="icon" variant="ghost" onClick={onMoveUp} title="Move up">
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
            {onMoveDown && (
              <Button size="icon" variant="ghost" onClick={onMoveDown} title="Move down">
                <ArrowDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div style={{ height }} className="w-full">
          {renderChart(type, data, chart, onDrillDown)}
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({ chart, analysis }: { chart: ChartRecommendation; analysis: DatasetAnalysis }) {
  const column = analysis.columns.find((item) => item.name === chart.valueKey);
  const stats = column?.stats;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-muted-foreground">{chart.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{formatNumber(stats?.mean ?? 0)}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Metric label="Median" value={formatNumber(stats?.median ?? 0)} />
          <Metric label="Min" value={formatNumber(stats?.min ?? 0)} />
          <Metric label="Max" value={formatNumber(stats?.max ?? 0)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function renderChart(type: ChartType, data: unknown, chart: ChartRecommendation, onDrillDown?: (key: string, value: string) => void) {
  if (!Array.isArray(data) || !data.length) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Not enough compatible data for this chart.</div>;
  }

  if (type === "bar") {
    const rows = data as Array<{ label: string; value: number }>;
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={rows.length > 6 ? -25 : 0} textAnchor={rows.length > 6 ? "end" : "middle"} height={60} />
          <YAxis tickFormatter={(value) => formatNumber(Number(value))} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(value) => formatNumber(Number(value))} />
          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
            onClick={(payload) => {
              const label = (payload as { payload?: { label?: string } }).payload?.label;
              if (chart.categoryKey && label) onDrillDown?.(chart.categoryKey, label);
            }}
          >
            {rows.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <LineChart data={data as object[]}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis tickFormatter={(value) => formatNumber(Number(value))} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(value) => formatNumber(Number(value))} />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="actual" stroke="#14b8a6" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={3} strokeDasharray="6 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <AreaChart data={data as object[]}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.55} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis tickFormatter={(value) => formatNumber(Number(value))} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(value) => formatNumber(Number(value))} />
          <Area type="monotone" dataKey="value" stroke="#14b8a6" fill="url(#areaFill)" strokeWidth={3} />
          <Area type="monotone" dataKey="actual" stroke="#14b8a6" fill="url(#areaFill)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "pie") {
    const rows = data as Array<{ label: string; value: number }>;
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="82%" paddingAngle={2}>
            {rows.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} onClick={() => chart.categoryKey && onDrillDown?.(chart.categoryKey, rows[index].label)} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(value) => formatNumber(Number(value))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "scatter") {
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" dataKey="x" name={chart.xKey} tick={{ fontSize: 11 }} tickFormatter={(value) => formatNumber(Number(value))} />
          <YAxis type="number" dataKey="y" name={chart.yKey} tick={{ fontSize: 11 }} tickFormatter={(value) => formatNumber(Number(value))} />
          <Tooltip contentStyle={{ borderRadius: 8 }} cursor={{ strokeDasharray: "3 3" }} formatter={(value) => formatNumber(Number(value))} />
          <Scatter data={data as object[]} fill="#14b8a6" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (type === "histogram") {
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={data as object[]}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={58} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8 }} />
          <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "heatmap") {
    return <Heatmap data={data as Array<{ x: string; y: string; value: number }>} />;
  }

  if (type === "radar") {
    const rows = (data as Array<{ label: string; value: number }>).slice(0, 8);
    return (
      <Radar
        data={{
          labels: rows.map((row) => row.label),
          datasets: [
            {
              label: chart.valueKey ?? "Value",
              data: rows.map((row) => row.value),
              borderColor: "#14b8a6",
              backgroundColor: "rgba(20, 184, 166, 0.22)",
              pointBackgroundColor: "#f59e0b"
            }
          ]
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: { r: { ticks: { display: false }, grid: { color: "rgba(148,163,184,.25)" } } },
          plugins: { legend: { labels: { color: "#94a3b8" } } }
        }}
      />
    );
  }

  if (type === "funnel") {
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <FunnelChart>
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
          <Funnel dataKey="value" data={data as object[]} isAnimationActive>
            <LabelList position="right" fill="currentColor" stroke="none" dataKey="label" />
            {(data as object[]).map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    );
  }

  if (type === "treemap") {
    const rows = data as Array<{ label: string; value: number }>;
    return (
      <Plot
        data={[{ type: "treemap", labels: rows.map((row) => row.label), parents: rows.map(() => ""), values: rows.map((row) => row.value), marker: { colors: COLORS } }]}
        layout={plotLayout()}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: "100%" }}
      />
    );
  }

  if (type === "sankey") {
    const rows = data as Array<{ source: string; target: string; value: number }>;
    const labels = Array.from(new Set(rows.flatMap((row) => [row.source, row.target])));
    return (
      <Plot
        data={[
          {
            type: "sankey",
            orientation: "h",
            node: { pad: 12, thickness: 14, line: { color: "rgba(148,163,184,.35)", width: 1 }, label: labels, color: labels.map((_, index) => COLORS[index % COLORS.length]) },
            link: {
              source: rows.map((row) => labels.indexOf(row.source)),
              target: rows.map((row) => labels.indexOf(row.target)),
              value: rows.map((row) => row.value)
            }
          }
        ]}
        layout={plotLayout()}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: "100%" }}
      />
    );
  }

  if (type === "box") {
    return (
      <Plot
        data={[{ type: "box", y: data as number[], marker: { color: "#14b8a6" }, boxpoints: "all", jitter: 0.3 }]}
        layout={plotLayout()}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: "100%" }}
      />
    );
  }

  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Chart type unavailable.</div>;
}

function Heatmap({ data }: { data: Array<{ x: string; y: string; value: number }> }) {
  const xs = Array.from(new Set(data.map((item) => item.x)));
  const ys = Array.from(new Set(data.map((item) => item.y)));
  const color = d3.scaleSequential((value: number) => d3.interpolateRdBu(1 - value)).domain([-1, 1]);

  return (
    <div className="grid h-full gap-1" style={{ gridTemplateColumns: `120px repeat(${xs.length}, minmax(42px, 1fr))`, gridTemplateRows: `32px repeat(${ys.length}, minmax(34px, 1fr))` }}>
      <div />
      {xs.map((x) => (
        <div key={x} className="truncate text-center text-[10px] text-muted-foreground" title={x}>
          {x}
        </div>
      ))}
      {ys.map((y) => (
        <Fragment key={y}>
          <div key={`${y}-label`} className="truncate pr-2 text-right text-[10px] text-muted-foreground" title={y}>
            {y}
          </div>
          {xs.map((x) => {
            const value = data.find((item) => item.x === x && item.y === y)?.value ?? 0;
            return (
              <div key={`${x}-${y}`} className="flex items-center justify-center rounded-md text-[10px] font-semibold text-white" style={{ backgroundColor: color(value) }} title={`${x} / ${y}: ${value.toFixed(2)}`}>
                {value.toFixed(1)}
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

function plotLayout() {
  return {
    margin: { t: 8, r: 8, b: 8, l: 8 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#94a3b8", size: 11 },
    autosize: true
  };
}
