import type { ChartRecommendation, DataRow, DatasetAnalysis, Insight, QueryResponse } from "@/lib/types";
import { formatNumber, titleCase } from "@/lib/utils";

export function answerDatasetQuestion(question: string, analysis: DatasetAnalysis, rows: DataRow[]): QueryResponse {
  const normalized = question.trim().toLowerCase();
  const numeric = analysis.columns.filter((column) => column.type === "number");
  const categories = analysis.columns.filter((column) => column.type === "category" || column.type === "boolean");
  const dates = analysis.columns.filter((column) => column.type === "date");

  if (!normalized) {
    return {
      answer: "Ask about trends, top performers, missing data, correlations, forecasts, or comparisons in this dataset."
    };
  }

  if (containsAny(normalized, ["top", "highest", "best"])) {
    const limit = Number(normalized.match(/top\s+(\d+)/)?.[1] ?? 5);
    const metric = findColumn(normalized, numeric.map((column) => column.name)) ?? numeric[0]?.name;
    const dimension = findColumn(normalized, categories.map((column) => column.name)) ?? categories[0]?.name;
    if (metric && dimension) {
      const grouped = groupSum(rows, dimension, metric).slice(0, limit);
      return {
        answer: `Top ${Math.min(limit, grouped.length)} ${titleCase(dimension)} values by ${titleCase(metric)} are ${grouped
          .map((row) => `${row.label} (${formatNumber(row.value)})`)
          .join(", ")}.`,
        chart: chartFor("bar", `Top ${titleCase(dimension)} by ${titleCase(metric)}`, dimension, metric),
        rows: grouped.map((row) => ({ [dimension]: row.label, [metric]: row.value }))
      };
    }
  }

  if (containsAny(normalized, ["compare", "versus", "vs"])) {
    const metric = findColumn(normalized, numeric.map((column) => column.name)) ?? numeric[0]?.name;
    const dimension = findColumn(normalized, categories.map((column) => column.name)) ?? categories[0]?.name;
    if (metric && dimension) {
      const grouped = groupSum(rows, dimension, metric).slice(0, 8);
      const leader = grouped[0];
      return {
        answer: `${titleCase(leader.label)} leads ${titleCase(dimension)} with ${formatNumber(leader.value)} ${titleCase(metric)}. The comparison chart highlights the main gaps across segments.`,
        chart: chartFor("bar", `${titleCase(metric)} by ${titleCase(dimension)}`, dimension, metric),
        rows: grouped.map((row) => ({ [dimension]: row.label, [metric]: row.value }))
      };
    }
  }

  if (containsAny(normalized, ["predict", "forecast", "next month", "next quarter", "future"])) {
    if (analysis.forecast) {
      const finalPoint = [...analysis.forecast.points].reverse().find((point) => point.forecast !== undefined);
      return {
        answer: `The current forecast projects ${titleCase(analysis.forecast.valueKey)} around ${formatNumber(finalPoint?.forecast ?? 0)} by ${finalPoint?.label}. The model is a lightweight trend forecast, so seasonality and business events should be layered in for planning.`,
        chart: analysis.chartRecommendations.find((chart) => chart.id === "forecast-primary")
      };
    }
    return {
      answer: "I need a reliable date column and at least one numeric measure to forecast. This file does not have enough time-series structure for a defensible projection."
    };
  }

  if (containsAny(normalized, ["why", "drop", "spike", "increase", "decrease", "fall"])) {
    const anomaly = analysis.insights.find((insight) => insight.kind === "anomaly" || insight.kind === "trend");
    const correlation = analysis.correlations[0];
    if (anomaly || correlation) {
      return {
        answer: anomaly
          ? `${anomaly.detail} A likely next step is to segment the affected metric by ${categories[0]?.name ?? "a business dimension"} and review data collection changes around the same period.`
          : `${titleCase(correlation.x)} and ${titleCase(correlation.y)} show the strongest detected relationship, so changes in one may explain movement in the other. Correlation is not causation, but it is the first driver to inspect.`,
        insight: anomaly ?? insightFromCorrelation(correlation),
        chart: analysis.chartRecommendations.find((chart) => chart.type === "line" || chart.type === "scatter")
      };
    }
  }

  if (containsAny(normalized, ["missing", "quality", "clean", "duplicate"])) {
    const worst = [...analysis.columns].sort((a, b) => b.missingRatio - a.missingRatio)[0];
    return {
      answer: `Data quality is ${analysis.summary.dataQualityScore}/100. Missing cells account for ${(analysis.summary.missingRatio * 100).toFixed(1)}%, duplicate rows total ${analysis.summary.duplicateRows}, and ${titleCase(worst.name)} is the column needing the most attention.`,
      insight: analysis.insights.find((insight) => insight.kind === "risk")
    };
  }

  if (containsAny(normalized, ["correlation", "relationship", "related"])) {
    const top = analysis.correlations[0];
    if (top) {
      return {
        answer: `The strongest detected relationship is ${titleCase(top.x)} vs ${titleCase(top.y)} with a Pearson coefficient of ${top.coefficient.toFixed(2)}. This is a ${top.strength} ${top.coefficient > 0 ? "positive" : "negative"} relationship.`,
        insight: insightFromCorrelation(top),
        chart: analysis.chartRecommendations.find((chart) => chart.type === "heatmap" || chart.type === "scatter")
      };
    }
    return { answer: "No meaningful numeric correlations were detected in this dataset." };
  }

  if (containsAny(normalized, ["summary", "overview", "explain", "what is"])) {
    return {
      answer: analysis.executiveSummary,
      insight: analysis.insights.find((insight) => insight.kind === "executive")
    };
  }

  const chart = bestQuestionChart(normalized, analysis.chartRecommendations, numeric, categories, dates);
  return {
    answer: `I found ${analysis.summary.rows.toLocaleString()} records and ${analysis.summary.columns} fields. The best starting point is ${chart?.title ?? "the executive summary"} because it aligns most closely with the available fields in your question.`,
    chart,
    insight: analysis.insights[0]
  };
}

function containsAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function findColumn(question: string, columns: string[]) {
  return columns.find((column) => question.includes(column.toLowerCase()));
}

function groupSum(rows: DataRow[], categoryKey: string, valueKey: string) {
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const label = String(row[categoryKey] ?? "Unknown");
    const value = Number(row[valueKey]);
    if (!Number.isFinite(value)) return;
    grouped.set(label, (grouped.get(label) ?? 0) + value);
  });

  return Array.from(grouped.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function chartFor(type: ChartRecommendation["type"], title: string, categoryKey: string, valueKey: string): ChartRecommendation {
  return {
    id: `query-${type}`,
    type,
    title,
    description: `Generated from the natural language query.`,
    categoryKey,
    valueKey,
    priority: 99
  };
}

function insightFromCorrelation(pair: DatasetAnalysis["correlations"][number]): Insight {
  return {
    id: `query-correlation-${pair.x}-${pair.y}`,
    kind: "correlation",
    title: `${titleCase(pair.x)} and ${titleCase(pair.y)}`,
    detail: `Correlation coefficient: ${pair.coefficient.toFixed(2)}.`,
    severity: "info",
    confidence: Math.min(0.95, Math.abs(pair.coefficient))
  };
}

function bestQuestionChart(
  question: string,
  charts: ChartRecommendation[],
  numeric: DatasetAnalysis["columns"],
  categories: DatasetAnalysis["columns"],
  dates: DatasetAnalysis["columns"]
) {
  const mentionedColumn = [...numeric, ...categories, ...dates].find((column) => question.includes(column.name.toLowerCase()));
  if (mentionedColumn) {
    return charts.find(
      (chart) =>
        chart.xKey === mentionedColumn.name ||
        chart.yKey === mentionedColumn.name ||
        chart.valueKey === mentionedColumn.name ||
        chart.categoryKey === mentionedColumn.name
    );
  }

  return charts[0];
}
