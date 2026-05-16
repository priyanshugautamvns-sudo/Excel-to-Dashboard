import type {
  ChartRecommendation,
  ColumnProfile,
  ColumnType,
  CorrelationPair,
  DataRow,
  DataValue,
  DatasetAnalysis,
  DatasetSummary,
  ForecastPoint,
  Insight,
  NumericStats
} from "@/lib/types";
import { clamp, formatNumber, formatPercent, safeId, titleCase } from "@/lib/utils";

type AnalyzeInput = {
  rows: Record<string, unknown>[];
  fileName: string;
  sheetName?: string;
  availableSheets?: string[];
};

const MAX_PROFILE_ROWS = 100_000;
const MAX_SAMPLE_ROWS = 250;

export function analyzeDataset(input: AnalyzeInput): DatasetAnalysis {
  const sourceRows = input.rows.slice(0, MAX_PROFILE_ROWS);
  const headers = discoverHeaders(sourceRows);
  const rawRows = sourceRows.map((row) => normalizeKeys(row, headers));
  const columnTypes = Object.fromEntries(headers.map((header) => [header, detectColumnType(rawRows, header)]));
  const rows = rawRows.map((row) => coerceRow(row, columnTypes));
  const columns = headers.map((header) => profileColumn(rows, header, columnTypes[header]));
  const summary = summarizeDataset(rows, columns);
  const correlations = calculateCorrelations(rows, columns);
  const forecast = buildForecast(rows, columns);
  const chartRecommendations = recommendCharts(columns, correlations, forecast);
  const insights = generateInsights(rows, columns, summary, correlations, forecast);
  const executiveSummary = buildExecutiveSummary(input.fileName, summary, columns, correlations, forecast, insights);

  return {
    id: safeId("dataset"),
    fileName: input.fileName,
    sheetName: input.sheetName,
    availableSheets: input.availableSheets,
    createdAt: new Date().toISOString(),
    summary,
    columns,
    correlations,
    chartRecommendations,
    insights,
    executiveSummary,
    forecast,
    sampleRows: rows.slice(0, MAX_SAMPLE_ROWS),
    warnings: collectWarnings(rows, columns, summary)
  };
}

export function coerceRowsForAnalysis(rows: Record<string, unknown>[]) {
  const headers = discoverHeaders(rows);
  const rawRows = rows.map((row) => normalizeKeys(row, headers));
  const columnTypes = Object.fromEntries(headers.map((header) => [header, detectColumnType(rawRows, header)]));
  return rawRows.map((row) => coerceRow(row, columnTypes));
}

function discoverHeaders(rows: Record<string, unknown>[]) {
  const seen = new Set<string>();
  const headers: string[] = [];

  rows.forEach((row) => {
    Object.keys(row).forEach((key, index) => {
      const fallback = `Column ${index + 1}`;
      const clean = sanitizeHeader(key || fallback);
      if (!seen.has(clean)) {
        seen.add(clean);
        headers.push(clean);
      }
    });
  });

  return headers;
}

function sanitizeHeader(header: string) {
  const clean = String(header)
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return clean || "Untitled";
}

function normalizeKeys(row: Record<string, unknown>, headers: string[]) {
  const normalized: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[sanitizeHeader(key)] = value;
  });

  headers.forEach((header) => {
    if (!(header in normalized)) normalized[header] = null;
  });

  return normalized;
}

function detectColumnType(rows: Record<string, unknown>[], key: string): ColumnType {
  const values = rows.map((row) => row[key]).filter((value) => !isMissing(value));
  if (!values.length) return "mixed";

  const numericCount = values.filter((value) => parseNumber(value) !== null).length;
  const dateCount = values.filter((value) => parseDate(value) !== null).length;
  const booleanCount = values.filter((value) => parseBoolean(value) !== null).length;
  const uniqueValues = new Set(values.map((value) => String(value).trim().toLowerCase())).size;
  const avgLength = values.reduce<number>((sum, value) => sum + String(value).length, 0) / values.length;

  if (booleanCount / values.length >= 0.85 && uniqueValues <= 4) return "boolean";
  if (dateCount / values.length >= 0.72 && numericCount / values.length < 0.7) return "date";
  if (numericCount / values.length >= 0.82) return "number";
  if (uniqueValues <= Math.max(12, values.length * 0.2) || (uniqueValues <= 60 && avgLength <= 28)) return "category";
  if (avgLength > 34 || uniqueValues / values.length > 0.72) return "text";

  return "mixed";
}

function coerceRow(row: Record<string, unknown>, types: Record<string, ColumnType>): DataRow {
  return Object.fromEntries(
    Object.entries(types).map(([key, type]) => {
      const value = row[key];
      if (isMissing(value)) return [key, null];
      if (type === "number") return [key, parseNumber(value)];
      if (type === "date") return [key, parseDate(value)];
      if (type === "boolean") return [key, parseBoolean(value)];
      return [key, String(value).trim()];
    })
  );
}

function profileColumn(rows: DataRow[], name: string, type: ColumnType): ColumnProfile {
  const values = rows.map((row) => row[name]);
  const nonMissing = values.filter((value) => value !== null);
  const missingCount = values.length - nonMissing.length;
  const uniqueValues = new Set(nonMissing.map((value) => String(value))).size;
  const warnings: string[] = [];

  if (missingCount > 0) warnings.push(`${formatPercent(missingCount / Math.max(rows.length, 1))} missing`);
  if (uniqueValues === rows.length && type !== "number" && type !== "date") warnings.push("Likely identifier");

  const profile: ColumnProfile = {
    name,
    type,
    missingCount,
    missingRatio: missingCount / Math.max(rows.length, 1),
    uniqueCount: uniqueValues,
    uniqueness: uniqueValues / Math.max(nonMissing.length, 1),
    sampleValues: nonMissing.slice(0, 5),
    warnings
  };

  if (type === "number") {
    profile.stats = numericStats(nonMissing.map(Number).filter(Number.isFinite));
    if (profile.stats.outlierCount) warnings.push(`${profile.stats.outlierCount} statistical outliers`);
  }

  if (type === "category" || type === "boolean" || type === "text") {
    profile.topValues = topValues(nonMissing);
  }

  if (type === "date") {
    const dates = nonMissing.map((value) => new Date(String(value))).filter((date) => !Number.isNaN(date.valueOf()));
    if (dates.length) {
      const sorted = dates.sort((a, b) => a.valueOf() - b.valueOf());
      profile.dateRange = {
        min: toDateKey(sorted[0]),
        max: toDateKey(sorted[sorted.length - 1])
      };
    }
  }

  return profile;
}

function summarizeDataset(rows: DataRow[], columns: ColumnProfile[]): DatasetSummary {
  const cells = rows.length * Math.max(columns.length, 1);
  const missingCells = columns.reduce((sum, column) => sum + column.missingCount, 0);
  const duplicateRows = countDuplicates(rows);
  const missingPenalty = (missingCells / Math.max(cells, 1)) * 45;
  const duplicatePenalty = (duplicateRows / Math.max(rows.length, 1)) * 25;
  const outlierPenalty =
    columns.reduce((sum, column) => sum + (column.stats?.outlierCount ?? 0), 0) / Math.max(rows.length, 1) * 18;
  const mixedPenalty = columns.filter((column) => column.type === "mixed").length * 4;
  const dataQualityScore = clamp(Math.round(100 - missingPenalty - duplicatePenalty - outlierPenalty - mixedPenalty), 1, 100);
  const complexityScore = clamp(
    Math.round(
      Math.log10(rows.length + 1) * 18 +
        columns.length * 2.2 +
        columns.filter((column) => column.type === "date").length * 8 +
        columns.filter((column) => column.type === "number").length * 5
    ),
    1,
    100
  );

  return {
    rows: rows.length,
    columns: columns.length,
    numericColumns: columns.filter((column) => column.type === "number").length,
    categoricalColumns: columns.filter((column) => column.type === "category" || column.type === "boolean").length,
    dateColumns: columns.filter((column) => column.type === "date").length,
    missingCells,
    missingRatio: missingCells / Math.max(cells, 1),
    duplicateRows,
    dataQualityScore,
    complexityScore
  };
}

function calculateCorrelations(rows: DataRow[], columns: ColumnProfile[]): CorrelationPair[] {
  const numericColumns = columns.filter((column) => column.type === "number" && column.stats && column.stats.count > 2);
  const pairs: CorrelationPair[] = [];

  for (let i = 0; i < numericColumns.length; i += 1) {
    for (let j = i + 1; j < numericColumns.length; j += 1) {
      const x = numericColumns[i].name;
      const y = numericColumns[j].name;
      const paired = rows
        .map((row) => [Number(row[x]), Number(row[y])] as const)
        .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));

      if (paired.length < 5) continue;
      const coefficient = pearson(paired.map(([a]) => a), paired.map(([, b]) => b));
      if (!Number.isFinite(coefficient) || Math.abs(coefficient) < 0.28) continue;

      pairs.push({
        x,
        y,
        coefficient,
        strength: Math.abs(coefficient) >= 0.72 ? "strong" : Math.abs(coefficient) >= 0.48 ? "moderate" : "weak"
      });
    }
  }

  return pairs.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)).slice(0, 20);
}

function buildForecast(rows: DataRow[], columns: ColumnProfile[]): DatasetAnalysis["forecast"] {
  const dateColumn = columns.find((column) => column.type === "date");
  const numericCandidates = columns
    .filter((column) => column.type === "number" && column.stats && column.stats.count >= 6)
    .sort((a, b) => (b.stats?.variance ?? 0) - (a.stats?.variance ?? 0));
  const valueColumn = numericCandidates[0];

  if (!dateColumn || !valueColumn) return undefined;

  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const date = row[dateColumn.name];
    const value = row[valueColumn.name];
    if (typeof date !== "string" || typeof value !== "number") return;
    const key = toDateKey(new Date(date));
    grouped.set(key, (grouped.get(key) ?? 0) + value);
  });

  const actuals = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, actual: value }));

  if (actuals.length < 5) return undefined;

  const points = actuals.map((point, index) => ({ x: index, y: point.actual ?? 0 }));
  const { slope, intercept } = linearRegression(points);
  const residuals = points.map((point) => point.y - (intercept + slope * point.x));
  const residualStd = standardDeviation(residuals);
  const intervals = actuals
    .slice(1)
    .map((point, index) => new Date(point.label).valueOf() - new Date(actuals[index].label).valueOf())
    .filter((value) => value > 0);
  const interval = median(intervals) || 86_400_000;
  const lastDate = new Date(actuals[actuals.length - 1].label);
  const horizon = Math.min(8, Math.max(4, Math.round(actuals.length * 0.25)));
  const forecastPoints: ForecastPoint[] = [];

  for (let step = 1; step <= horizon; step += 1) {
    const nextIndex = actuals.length - 1 + step;
    const forecast = intercept + slope * nextIndex;
    const date = new Date(lastDate.valueOf() + interval * step);
    forecastPoints.push({
      label: toDateKey(date),
      forecast,
      lower: forecast - residualStd * 1.65,
      upper: forecast + residualStd * 1.65
    });
  }

  return {
    dateKey: dateColumn.name,
    valueKey: valueColumn.name,
    points: [...actuals.slice(-36), ...forecastPoints],
    slope
  };
}

function recommendCharts(
  columns: ColumnProfile[],
  correlations: CorrelationPair[],
  forecast?: DatasetAnalysis["forecast"]
): ChartRecommendation[] {
  const numeric = columns.filter((column) => column.type === "number");
  const categories = columns.filter((column) => column.type === "category" || column.type === "boolean");
  const dates = columns.filter((column) => column.type === "date");
  const recommendations: ChartRecommendation[] = [];

  numeric.slice(0, 4).forEach((column, index) => {
    recommendations.push({
      id: `kpi-${index}`,
      type: "kpi",
      title: `${titleCase(column.name)} KPI`,
      description: `Summary statistic for ${column.name}.`,
      valueKey: column.name,
      priority: 100 - index
    });
  });

  if (forecast) {
    recommendations.push({
      id: "forecast-primary",
      type: "line",
      title: `${titleCase(forecast.valueKey)} Forecast`,
      description: `Actual and forecasted ${forecast.valueKey} over ${forecast.dateKey}.`,
      xKey: forecast.dateKey,
      yKey: forecast.valueKey,
      priority: 98
    });
    recommendations.push({
      id: "area-primary",
      type: "area",
      title: `${titleCase(forecast.valueKey)} Momentum`,
      description: `Area view of ${forecast.valueKey} over time.`,
      xKey: forecast.dateKey,
      yKey: forecast.valueKey,
      priority: 85
    });
  } else if (dates.length && numeric.length) {
    recommendations.push({
      id: "line-time",
      type: "line",
      title: `${titleCase(numeric[0].name)} Trend`,
      description: `${numeric[0].name} plotted against ${dates[0].name}.`,
      xKey: dates[0].name,
      yKey: numeric[0].name,
      priority: 94
    });
  }

  if (categories.length && numeric.length) {
    recommendations.push(
      {
        id: "bar-category",
        type: "bar",
        title: `${titleCase(numeric[0].name)} by ${titleCase(categories[0].name)}`,
        description: `Compare ${numeric[0].name} across ${categories[0].name}.`,
        categoryKey: categories[0].name,
        valueKey: numeric[0].name,
        priority: 92
      },
      {
        id: "pie-category",
        type: "pie",
        title: `${titleCase(categories[0].name)} Share`,
        description: `Category contribution by ${numeric[0].name}.`,
        categoryKey: categories[0].name,
        valueKey: numeric[0].name,
        priority: 78
      },
      {
        id: "treemap-category",
        type: "treemap",
        title: `${titleCase(categories[0].name)} Contribution Map`,
        description: `Treemap sized by ${numeric[0].name}.`,
        categoryKey: categories[0].name,
        valueKey: numeric[0].name,
        priority: 72
      }
    );
  }

  if (categories.length >= 2 && numeric.length) {
    recommendations.push(
      {
        id: "sankey-flow",
        type: "sankey",
        title: `${titleCase(categories[0].name)} to ${titleCase(categories[1].name)} Flow`,
        description: `Flow volume weighted by ${numeric[0].name}.`,
        xKey: categories[0].name,
        yKey: categories[1].name,
        valueKey: numeric[0].name,
        priority: 68
      },
      {
        id: "radar-segments",
        type: "radar",
        title: `${titleCase(categories[0].name)} Performance Radar`,
        description: `Radar comparison for the leading segments.`,
        categoryKey: categories[0].name,
        valueKey: numeric[0].name,
        priority: 64
      },
      {
        id: "funnel-category",
        type: "funnel",
        title: `${titleCase(categories[0].name)} Funnel`,
        description: `Ranked funnel view for ${categories[0].name}.`,
        categoryKey: categories[0].name,
        valueKey: numeric[0].name,
        priority: 61
      }
    );
  }

  if (numeric.length) {
    recommendations.push(
      {
        id: "histogram-primary",
        type: "histogram",
        title: `${titleCase(numeric[0].name)} Distribution`,
        description: `Histogram for ${numeric[0].name}.`,
        valueKey: numeric[0].name,
        priority: 88
      },
      {
        id: "box-primary",
        type: "box",
        title: `${titleCase(numeric[0].name)} Spread`,
        description: `Box plot and outlier profile for ${numeric[0].name}.`,
        valueKey: numeric[0].name,
        priority: 80
      }
    );
  }

  if (correlations.length) {
    recommendations.push(
      {
        id: "correlation-heatmap",
        type: "heatmap",
        title: "Correlation Matrix",
        description: "Strength and direction of numeric relationships.",
        priority: 90
      },
      {
        id: "scatter-correlation",
        type: "scatter",
        title: `${titleCase(correlations[0].x)} vs ${titleCase(correlations[0].y)}`,
        description: `Scatter plot for the strongest detected relationship.`,
        xKey: correlations[0].x,
        yKey: correlations[0].y,
        priority: 82
      }
    );
  }

  return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 14);
}

function generateInsights(
  rows: DataRow[],
  columns: ColumnProfile[],
  summary: DatasetSummary,
  correlations: CorrelationPair[],
  forecast?: DatasetAnalysis["forecast"]
): Insight[] {
  const insights: Insight[] = [];
  const numeric = columns.filter((column) => column.type === "number" && column.stats);
  const categories = columns.filter((column) => column.type === "category" && column.topValues?.length);

  insights.push({
    id: "executive-health",
    kind: "executive",
    title: "Dataset Health",
    detail: `This dataset contains ${formatNumber(summary.rows, 0)} rows and ${summary.columns} columns with a ${summary.dataQualityScore}/100 data quality score.`,
    severity: summary.dataQualityScore >= 78 ? "positive" : summary.dataQualityScore >= 55 ? "warning" : "critical",
    confidence: 0.94
  });

  numeric
    .filter((column) => (column.stats?.outlierCount ?? 0) > 0)
    .slice(0, 4)
    .forEach((column) => {
      insights.push({
        id: `outlier-${column.name}`,
        kind: "anomaly",
        title: `${titleCase(column.name)} Has Outliers`,
        detail: `${column.stats?.outlierCount} values sit outside the expected IQR range, which may represent anomalies, exceptional performance, or data entry issues.`,
        severity: (column.stats?.outlierCount ?? 0) / Math.max(rows.length, 1) > 0.08 ? "critical" : "warning",
        metric: column.name,
        confidence: 0.83
      });
    });

  if (summary.missingRatio > 0.03) {
    const worst = [...columns].sort((a, b) => b.missingRatio - a.missingRatio)[0];
    insights.push({
      id: "missing-data",
      kind: "risk",
      title: "Missing Data May Affect Accuracy",
      detail: `${titleCase(worst.name)} has the highest missing rate at ${formatPercent(worst.missingRatio)}. Imputation or source cleanup should happen before high-stakes decisions.`,
      severity: summary.missingRatio > 0.15 ? "critical" : "warning",
      metric: worst.name,
      confidence: 0.9
    });
  }

  if (summary.duplicateRows > 0) {
    insights.push({
      id: "duplicates",
      kind: "risk",
      title: "Duplicate Records Detected",
      detail: `${formatNumber(summary.duplicateRows, 0)} rows appear duplicated. De-duplicating can improve KPI accuracy and prevent inflated totals.`,
      severity: summary.duplicateRows / Math.max(rows.length, 1) > 0.05 ? "critical" : "warning",
      confidence: 0.86
    });
  }

  correlations.slice(0, 4).forEach((pair) => {
    insights.push({
      id: `correlation-${pair.x}-${pair.y}`,
      kind: "correlation",
      title: `${titleCase(pair.x)} and ${titleCase(pair.y)} Move ${pair.coefficient > 0 ? "Together" : "Inversely"}`,
      detail: `The Pearson correlation is ${pair.coefficient.toFixed(2)}, a ${pair.strength} ${pair.coefficient > 0 ? "positive" : "negative"} relationship worth investigating for drivers and dependencies.`,
      severity: "info",
      metric: `${pair.x}, ${pair.y}`,
      confidence: Math.min(0.96, Math.abs(pair.coefficient))
    });
  });

  if (forecast) {
    const direction = forecast.slope >= 0 ? "upward" : "downward";
    const lastActual = [...forecast.points].reverse().find((point) => point.actual !== undefined)?.actual ?? 0;
    const lastForecast = [...forecast.points].reverse().find((point) => point.forecast !== undefined)?.forecast ?? lastActual;
    const delta = lastActual ? (lastForecast - lastActual) / Math.abs(lastActual) : 0;
    insights.push({
      id: "forecast-trend",
      kind: "forecast",
      title: `${titleCase(forecast.valueKey)} Forecast Points ${direction}`,
      detail: `The time-series model projects ${formatPercent(delta)} change by the end of the forecast window. Treat this as directional guidance unless seasonality and external drivers are added.`,
      severity: forecast.slope >= 0 ? "positive" : "warning",
      metric: forecast.valueKey,
      confidence: 0.72
    });
  }

  categories.slice(0, 3).forEach((column) => {
    const top = column.topValues?.[0];
    if (!top || top.ratio < 0.35) return;
    insights.push({
      id: `concentration-${column.name}`,
      kind: "key",
      title: `${titleCase(column.name)} Is Concentrated`,
      detail: `${top.value} accounts for ${formatPercent(top.ratio)} of records. This concentration can be an opportunity or a dependency risk depending on business context.`,
      severity: top.ratio > 0.65 ? "warning" : "info",
      metric: column.name,
      confidence: 0.81
    });
  });

  if (numeric.length >= 2 && categories.length) {
    insights.push({
      id: "ml-suggestion",
      kind: "recommendation",
      title: "Predictive Modeling Is Applicable",
      detail: `The mix of ${summary.numericColumns} numeric and ${summary.categoricalColumns} categorical fields can support clustering, regression, or classification experiments once a target metric is selected.`,
      severity: "positive",
      confidence: 0.78
    });
  }

  if (summary.dataQualityScore < 75) {
    insights.push({
      id: "quality-recommendation",
      kind: "recommendation",
      title: "Clean Before Final Reporting",
      detail: "Resolve missing values, duplicates, and extreme outliers before presenting this dashboard to stakeholders or training predictive models.",
      severity: "warning",
      confidence: 0.88
    });
  } else {
    insights.push({
      id: "activation-recommendation",
      kind: "recommendation",
      title: "Ready For Stakeholder Review",
      detail: "The data profile is healthy enough for exploratory dashboarding. Add domain-specific targets to make the recommendations more prescriptive.",
      severity: "positive",
      confidence: 0.8
    });
  }

  return insights;
}

function buildExecutiveSummary(
  fileName: string,
  summary: DatasetSummary,
  columns: ColumnProfile[],
  correlations: CorrelationPair[],
  forecast: DatasetAnalysis["forecast"],
  insights: Insight[]
) {
  const numericNames = columns.filter((column) => column.type === "number").map((column) => column.name);
  const dateNames = columns.filter((column) => column.type === "date").map((column) => column.name);
  const strongest = correlations[0];
  const quality = summary.dataQualityScore >= 80 ? "strong" : summary.dataQualityScore >= 60 ? "moderate" : "fragile";
  const trendText = forecast
    ? `${titleCase(forecast.valueKey)} shows a ${forecast.slope >= 0 ? "positive" : "negative"} forecast trajectory.`
    : dateNames.length
      ? "A date field is available for trend analysis."
      : "No reliable date field was detected, so time-series forecasting is limited.";
  const relationshipText = strongest
    ? `The strongest relationship is ${titleCase(strongest.x)} vs ${titleCase(strongest.y)} with correlation ${strongest.coefficient.toFixed(2)}.`
    : "No strong numeric correlations were detected.";
  const riskCount = insights.filter((insight) => insight.kind === "risk" || insight.kind === "anomaly").length;

  return `${fileName} contains ${formatNumber(summary.rows, 0)} records across ${summary.columns} fields. Data quality is ${quality} at ${summary.dataQualityScore}/100, with ${formatPercent(summary.missingRatio)} missing cells and ${formatNumber(summary.duplicateRows, 0)} duplicate rows detected. The core quantitative fields are ${numericNames.slice(0, 4).map(titleCase).join(", ") || "limited"}, while ${trendText} ${relationshipText} ${riskCount ? `${riskCount} risk or anomaly signals should be reviewed before final decisions.` : "No major risk signal was detected in the automated scan."}`;
}

function collectWarnings(rows: DataRow[], columns: ColumnProfile[], summary: DatasetSummary) {
  const warnings: string[] = [];
  if (rows.length >= MAX_PROFILE_ROWS) warnings.push(`Only the first ${formatNumber(MAX_PROFILE_ROWS, 0)} rows were profiled for browser performance.`);
  if (summary.missingRatio > 0.1) warnings.push("High missing data ratio.");
  if (summary.duplicateRows > 0) warnings.push("Duplicate rows detected.");
  columns
    .filter((column) => column.type === "mixed")
    .slice(0, 3)
    .forEach((column) => warnings.push(`${column.name} contains mixed values.`));
  return warnings;
}

function countDuplicates(rows: DataRow[]) {
  const seen = new Set<string>();
  let duplicates = 0;
  rows.forEach((row) => {
    const signature = JSON.stringify(row);
    if (seen.has(signature)) duplicates += 1;
    seen.add(signature);
  });
  return duplicates;
}

function numericStats(values: number[]): NumericStats {
  if (!values.length) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      mode: null,
      variance: 0,
      standardDeviation: 0,
      skewness: 0,
      kurtosis: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      outlierCount: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - iqr * 1.5;
  const upper = q3 + iqr * 1.5;
  const avg = mean(sorted);
  const std = standardDeviation(sorted);

  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: avg,
    median: median(sorted),
    mode: mode(sorted),
    variance: variance(sorted),
    standardDeviation: std,
    skewness: skewness(sorted, avg, std),
    kurtosis: kurtosis(sorted, avg, std),
    q1,
    q3,
    iqr,
    outlierCount: sorted.filter((value) => value < lower || value > upper).length
  };
}

function topValues(values: DataValue[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const key = String(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({
      value,
      count,
      ratio: count / Math.max(values.length, 1)
    }));
}

function isMissing(value: unknown) {
  return value === null || value === undefined || String(value).trim() === "" || String(value).trim().toLowerCase() === "nan";
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[$,\s]/g, "").replace(/%$/, "");
  if (!cleaned || cleaned === "-" || cleaned.toLowerCase() === "nan") return null;
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return null;
  return value.trim().endsWith("%") ? numeric / 100 : numeric;
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const clean = String(value).trim().toLowerCase();
  if (["true", "yes", "y", "1", "active", "success"].includes(clean)) return true;
  if (["false", "no", "n", "0", "inactive", "fail", "failed"].includes(clean)) return false;
  return null;
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return toDateKey(value);
  if (typeof value === "number") {
    if (value > 20_000 && value < 80_000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      return toDateKey(new Date(excelEpoch.valueOf() + value * 86_400_000));
    }
    return null;
  }

  const clean = String(value).trim();
  if (!clean || /^\d+(\.\d+)?$/.test(clean) || clean.length < 5) return null;
  const parsed = new Date(clean);
  if (Number.isNaN(parsed.valueOf())) return null;
  if (parsed.getFullYear() < 1900 || parsed.getFullYear() > 2200) return null;
  return toDateKey(parsed);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function variance(values: number[]) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
}

function standardDeviation(values: number[]) {
  return Math.sqrt(Math.max(variance(values), 0));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return quantile(sorted, 0.5);
}

function quantile(sortedValues: number[], q: number) {
  if (!sortedValues.length) return 0;
  const position = (sortedValues.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  const next = sortedValues[base + 1];
  return next === undefined ? sortedValues[base] : sortedValues[base] + rest * (next - sortedValues[base]);
}

function mode(values: number[]) {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const [topValue, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  return count > 1 ? topValue : null;
}

function skewness(values: number[], avg: number, std: number) {
  if (values.length < 3 || std === 0) return 0;
  const thirdMoment = values.reduce((sum, value) => sum + ((value - avg) / std) ** 3, 0) / values.length;
  return thirdMoment;
}

function kurtosis(values: number[], avg: number, std: number) {
  if (values.length < 4 || std === 0) return 0;
  const fourthMoment = values.reduce((sum, value) => sum + ((value - avg) / std) ** 4, 0) / values.length;
  return fourthMoment - 3;
}

function pearson(xs: number[], ys: number[]) {
  const xMean = mean(xs);
  const yMean = mean(ys);
  const numerator = xs.reduce((sum, x, index) => sum + (x - xMean) * (ys[index] - yMean), 0);
  const xDenom = Math.sqrt(xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0));
  const yDenom = Math.sqrt(ys.reduce((sum, y) => sum + (y - yMean) ** 2, 0));
  return numerator / (xDenom * yDenom || 1);
}

function linearRegression(points: Array<{ x: number; y: number }>) {
  const xMean = mean(points.map((point) => point.x));
  const yMean = mean(points.map((point) => point.y));
  const numerator = points.reduce((sum, point) => sum + (point.x - xMean) * (point.y - yMean), 0);
  const denominator = points.reduce((sum, point) => sum + (point.x - xMean) ** 2, 0);
  const slope = denominator === 0 ? 0 : numerator / denominator;
  return {
    slope,
    intercept: yMean - slope * xMean
  };
}
