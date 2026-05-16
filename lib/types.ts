export type DataValue = string | number | boolean | null;

export type DataRow = Record<string, DataValue>;

export type ColumnType = "number" | "category" | "date" | "boolean" | "text" | "mixed";

export type InsightKind =
  | "executive"
  | "key"
  | "anomaly"
  | "trend"
  | "correlation"
  | "risk"
  | "recommendation"
  | "forecast";

export type ChartType =
  | "kpi"
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "scatter"
  | "heatmap"
  | "histogram"
  | "box"
  | "radar"
  | "funnel"
  | "treemap"
  | "sankey";

export type NumericStats = {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  mode: number | null;
  variance: number;
  standardDeviation: number;
  skewness: number;
  kurtosis: number;
  q1: number;
  q3: number;
  iqr: number;
  outlierCount: number;
};

export type ColumnProfile = {
  name: string;
  type: ColumnType;
  missingCount: number;
  missingRatio: number;
  uniqueCount: number;
  uniqueness: number;
  sampleValues: DataValue[];
  stats?: NumericStats;
  topValues?: Array<{ value: string; count: number; ratio: number }>;
  dateRange?: { min: string; max: string };
  warnings: string[];
};

export type CorrelationPair = {
  x: string;
  y: string;
  coefficient: number;
  strength: "weak" | "moderate" | "strong";
};

export type ForecastPoint = {
  label: string;
  actual?: number;
  forecast?: number;
  lower?: number;
  upper?: number;
};

export type ChartRecommendation = {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  xKey?: string;
  yKey?: string;
  zKey?: string;
  categoryKey?: string;
  valueKey?: string;
  priority: number;
};

export type Insight = {
  id: string;
  kind: InsightKind;
  title: string;
  detail: string;
  severity: "info" | "positive" | "warning" | "critical";
  metric?: string;
  confidence: number;
};

export type DatasetSummary = {
  rows: number;
  columns: number;
  numericColumns: number;
  categoricalColumns: number;
  dateColumns: number;
  missingCells: number;
  missingRatio: number;
  duplicateRows: number;
  dataQualityScore: number;
  complexityScore: number;
};

export type DatasetAnalysis = {
  id: string;
  fileName: string;
  sheetName?: string;
  availableSheets?: string[];
  createdAt: string;
  summary: DatasetSummary;
  columns: ColumnProfile[];
  correlations: CorrelationPair[];
  chartRecommendations: ChartRecommendation[];
  insights: Insight[];
  executiveSummary: string;
  forecast?: {
    dateKey: string;
    valueKey: string;
    points: ForecastPoint[];
    slope: number;
  };
  sampleRows: DataRow[];
  warnings: string[];
};

export type StoredDataset = {
  analysis: DatasetAnalysis;
  rows: DataRow[];
};

export type DashboardTheme = "dark" | "glass" | "corporate" | "neon" | "minimal";

export type QueryResponse = {
  answer: string;
  insight?: Insight;
  chart?: ChartRecommendation;
  rows?: DataRow[];
};
