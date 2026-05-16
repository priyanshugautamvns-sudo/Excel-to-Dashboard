import type { ChartRecommendation, ColumnProfile, DataRow, DatasetAnalysis } from "@/lib/types";

export function buildChartData(rows: DataRow[], analysis: DatasetAnalysis, chart: ChartRecommendation) {
  if (chart.type === "line" || chart.type === "area") {
    if (analysis.forecast && chart.id === "forecast-primary") {
      return analysis.forecast.points;
    }

    if (chart.xKey && chart.yKey) {
      return groupByDate(rows, chart.xKey, chart.yKey).slice(-80);
    }
  }

  if (["bar", "pie", "radar", "funnel", "treemap"].includes(chart.type) && chart.categoryKey && chart.valueKey) {
    return groupByCategory(rows, chart.categoryKey, chart.valueKey).slice(0, chart.type === "pie" ? 8 : 14);
  }

  if (chart.type === "scatter" && chart.xKey && chart.yKey) {
    return rows
      .map((row) => ({ x: Number(row[chart.xKey as string]), y: Number(row[chart.yKey as string]) }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .slice(0, 2000);
  }

  if (chart.type === "histogram" && chart.valueKey) {
    return histogram(rows, chart.valueKey);
  }

  if (chart.type === "box" && chart.valueKey) {
    const column = analysis.columns.find((item) => item.name === chart.valueKey);
    return column?.stats ? [column.stats.min, column.stats.q1, column.stats.median, column.stats.q3, column.stats.max] : [];
  }

  if (chart.type === "heatmap") {
    return correlationMatrix(analysis.columns, analysis.correlations);
  }

  if (chart.type === "sankey" && chart.xKey && chart.yKey && chart.valueKey) {
    return sankeyLinks(rows, chart.xKey, chart.yKey, chart.valueKey);
  }

  return [];
}

function groupByDate(rows: DataRow[], dateKey: string, valueKey: string) {
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const date = row[dateKey];
    const value = Number(row[valueKey]);
    if (typeof date !== "string" || !Number.isFinite(value)) return;
    grouped.set(date, (grouped.get(date) ?? 0) + value);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
}

export function groupByCategory(rows: DataRow[], categoryKey: string, valueKey: string) {
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const category = String(row[categoryKey] ?? "Unknown");
    const value = Number(row[valueKey]);
    if (!Number.isFinite(value)) return;
    grouped.set(category, (grouped.get(category) ?? 0) + value);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}

function histogram(rows: DataRow[], valueKey: string) {
  const values = rows.map((row) => Number(row[valueKey])).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return [];
  const min = values[0];
  const max = values[values.length - 1];
  const bucketCount = Math.min(16, Math.max(6, Math.round(Math.sqrt(values.length))));
  const size = (max - min || 1) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    label: `${Math.round(min + index * size)}-${Math.round(min + (index + 1) * size)}`,
    count: 0
  }));

  values.forEach((value) => {
    const index = Math.min(bucketCount - 1, Math.floor((value - min) / size));
    buckets[index].count += 1;
  });

  return buckets;
}

function correlationMatrix(columns: ColumnProfile[], correlations: DatasetAnalysis["correlations"]) {
  const numeric = columns.filter((column) => column.type === "number").slice(0, 8);
  return numeric.flatMap((x) =>
    numeric.map((y) => {
      const found = correlations.find((pair) => (pair.x === x.name && pair.y === y.name) || (pair.x === y.name && pair.y === x.name));
      return {
        x: x.name,
        y: y.name,
        value: x.name === y.name ? 1 : found?.coefficient ?? 0
      };
    })
  );
}

function sankeyLinks(rows: DataRow[], sourceKey: string, targetKey: string, valueKey: string) {
  const grouped = new Map<string, { source: string; target: string; value: number }>();
  rows.forEach((row) => {
    const source = String(row[sourceKey] ?? "Unknown");
    const target = String(row[targetKey] ?? "Unknown");
    const value = Number(row[valueKey]);
    if (!Number.isFinite(value)) return;
    const key = `${source}::${target}`;
    const existing = grouped.get(key) ?? { source, target, value: 0 };
    existing.value += value;
    grouped.set(key, existing);
  });

  return Array.from(grouped.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 25);
}
