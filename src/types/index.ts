export type ColumnType = 'numeric' | 'category' | 'date' | 'text' | 'id';

export interface ColumnMeta {
  key: string;
  label: string;
  type: ColumnType;
  inferredRole: 'metric' | 'dimension' | 'time' | 'identifier' | 'attribute';
  sampleValues: (string | number)[];
  missingCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  sum?: number;
  avg?: number;
}

export type DataRow = Record<string, string | number | null>;

export interface CleanedDataset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  columns: ColumnMeta[];
  rows: DataRow[];
  totalRows: number;
  totalColumns: number;
  cleaningSummary: {
    missingValuesFound: number;
    missingValuesFixed: number;
    anomaliesFound: number;
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
  aggregation: 'sum' | 'avg' | 'count';
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
