export type ColumnType = 'numeric' | 'category' | 'date' | 'text' | 'id' | 'rating' | 'age';

export type SemanticRole =
  | 'numeric_financial' // Financial/Quantity (Price, Sales, Revenue, Cost, Amount, Quantity): Sum, Avg, Min, Max
  | 'numeric_discrete'  // Discrete Numeric (Age, Rating 1-5, Score): Average (Mean), Median, Distribution. (NEVER Sum)
  | 'identifier'        // IDs, codes, serials: Unique Count only. (NEVER Sum or Avg)
  | 'categorical'       // Cities, names, gender, categories: Value Counts, Mode, Percentages
  | 'timestamp';        // Timestamps/Dates: Timeline / frequency distribution over time. (NEVER Sum)

export type AllowedAggregationOp =
  | 'sum'
  | 'avg'
  | 'median'
  | 'min'
  | 'max'
  | 'count'
  | 'unique_count'
  | 'distribution'
  | 'timeline';

export interface ColumnMeta {
  key: string;
  label: string;
  type: ColumnType;
  inferredRole: 'metric' | 'dimension' | 'time' | 'identifier' | 'attribute';
  semanticRole: SemanticRole;
  semanticRoleLabelAr: string;
  semanticRoleLabelEn: string;
  allowedOperations: AllowedAggregationOp[];
  sampleValues: (string | number)[];
  missingCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  sum?: number;
  avg?: number;
  median?: number;
  validCount?: number;
  ignoredCount?: number;
  distribution?: { label: string; count: number; percentage: number }[];
  outlierNotes?: string[];
}

export type DataRow = Record<string, string | number | null>;

export interface IgnoredRowRecord {
  rowIndex: number;
  columnKey: string;
  columnLabel: string;
  value: any;
  reason: string;
  reasonAr: string;
}

export interface CleanedDataset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  columns: ColumnMeta[];
  rows: DataRow[];
  analyticalRows: DataRow[];
  totalRows: number;
  validRowsCount: number;
  ignoredRowsCount: number;
  ignoredRows: IgnoredRowRecord[];
  totalColumns: number;
  cleaningSummary: {
    missingValuesFound: number;
    missingValuesFixed: number;
    anomaliesFound: number;
    validRowsCount: number;
    ignoredRowsCount: number;
    outlierDetails: string[];
    notes: string[];
  };
}

export interface KPIItem {
  id: string;
  label: string;
  labelAr: string;
  value: number | string;
  formattedValue: string;
  subtitle: string;
  subtitleAr: string;
  type: 'currency' | 'number' | 'percentage' | 'text';
  change?: string;
  iconName?: string;
  metricKey?: string;
  enabled?: boolean;
  semanticRole?: SemanticRole;
  calculationType?: 'sum' | 'avg' | 'median' | 'count' | 'unique_count' | 'distribution' | 'timeline';
  validRowsUsed?: number;
  ignoredRowsCount?: number;
}

export interface InsightItem {
  id: string;
  type: 'positive' | 'warning' | 'neutral' | 'highlight';
  textAr: string;
  textEn: string;
  metricLabel?: string;
  metricValue?: string;
}

export type ChartType = 'bar' | 'line' | 'donut';

export interface ChartConfig {
  id: string;
  titleAr: string;
  titleEn: string;
  type: ChartType;
  dimensionKey: string;
  metricKey: string;
  aggregation: 'sum' | 'avg' | 'count' | 'distribution' | 'median' | 'timeline';
  data: { label: string; value: number; secondaryValue?: number; percentage?: number }[];
  descriptionAr?: string;
  descriptionEn?: string;
  hidden?: boolean;
}

export interface NaturalQueryMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionTaken?: string;
  directAnswer?: string;
}

export interface AIQueryActions {
  simplify?: boolean;
  selectedMetric?: string | null;
  filterColumn?: string | null;
  filterValue?: string | null;
  groupBy?: string | null;
  chartType?: 'bar' | 'line' | 'donut' | null;
  addKpi?: string | null;
  addProfit?: boolean;
  removeChartId?: string | null;
  changeChartType?: { chartId?: string; chartType: 'bar' | 'line' | 'donut' } | null;
  addColumn?: { name: string; defaultVal?: any } | null;
  correctRowValue?: { rowIndex?: number; columnKey: string; newValue: any } | null;
}

export interface WorkspaceState {
  version: number;
  dataset: CleanedDataset | null;
  selectedMetricKey: string | null;
  selectedDimensionKey: string | null;
  activeFilter: { column: string; value: string } | null;
  isSimplified: boolean;
  kpis: KPIItem[];
  insights: InsightItem[];
  charts: ChartConfig[];
  chatHistory: NaturalQueryMessage[];
  lastUpdated: string;
}

export interface InvestigationSubject {
  type: 'kpi' | 'chart' | 'datapoint';
  id?: string;
  title: string;
  titleEn?: string;
  metricKey?: string;
  dimensionKey?: string;
  filterValue?: string;
  formattedValue?: string;
  currentValue?: number | string;
}

export interface InvestigationEvidence {
  label: string;
  value: string;
  percentage?: number;
  note?: string;
}

export interface InvestigationResult {
  subject: InvestigationSubject;
  summaryWhat: string;
  summaryWhy: string[];
  evidence: InvestigationEvidence[];
  recommendation: string;
  isAiEnriched?: boolean;
}
