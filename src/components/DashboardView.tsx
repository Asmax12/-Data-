import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  ShoppingBag,
  PieChart,
  Lightbulb,
  Filter,
  X,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  Maximize2,
  Minimize2,
  Sparkles,
  Award,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import {
  CleanedDataset,
  KPIItem,
  ChartConfig,
  InsightItem,
  NaturalQueryMessage,
  InvestigationSubject,
  InvestigationResult,
} from '../types';
import { BarChart } from './Charts/BarChart';
import { LineChart } from './Charts/LineChart';
import { DonutChart } from './Charts/DonutChart';
import { NaturalLanguageBar } from './NaturalLanguageBar';
import { ExportDropdown } from './ExportDropdown';
import { useTheme } from '../context/ThemeContext';
import { investigateSubject } from '../services/aiService';
import { investigateSubjectLocally } from '../utils/analyticsEngine';
import { InvestigatorModal } from './InvestigatorModal';

interface DashboardViewProps {
  dataset: CleanedDataset;
  kpis: KPIItem[];
  charts: ChartConfig[];
  insights: InsightItem[];
  chatHistory: NaturalQueryMessage[];
  isSimplified: boolean;
  activeFilter: { column: string; value: string } | null;
  language: 'ar' | 'en';
  isProcessingQuery: boolean;
  onFilterChange: (filter: { column: string; value: string } | null) => void;
  onToggleSimplify: () => void;
  onSendMessage: (query: string) => Promise<void>;
  onOpenUpdateModal: () => void;
  onNewAnalysis: () => void;
  onOpenEditModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  dataset,
  kpis,
  charts,
  insights,
  chatHistory,
  isSimplified,
  activeFilter,
  language,
  isProcessingQuery,
  onFilterChange,
  onToggleSimplify,
  onSendMessage,
  onOpenUpdateModal,
  onNewAnalysis,
  onOpenEditModal,
}) => {
  const { theme } = useTheme();
  const isAr = language === 'ar';
  const [showTable, setShowTable] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 10;

  // DataMate Investigator Modal State
  const [isInvestigatorOpen, setIsInvestigatorOpen] = useState(false);
  const [investigationResult, setInvestigationResult] = useState<InvestigationResult | null>(null);
  const [isInvestigating, setIsInvestigating] = useState(false);

  // Filtered rows if activeFilter is present
  const filteredRows = dataset.rows.filter((r) => {
    if (!activeFilter) return true;
    return String(r[activeFilter.column] || '').toLowerCase() === activeFilter.value.toLowerCase();
  });

  // Search filtered rows for the preview table
  const searchResults = filteredRows.filter((r) => {
    if (!tableSearch.trim()) return true;
    const term = tableSearch.toLowerCase();
    return Object.values(r).some((val) => String(val || '').toLowerCase().includes(term));
  });

  const totalPages = Math.ceil(searchResults.length / pageSize) || 1;
  const paginatedRows = searchResults.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  // Active visible KPIs and Charts
  const visibleKPIs = kpis.filter((k) => k.enabled !== false);
  const visibleCharts = charts.filter((c) => !c.hidden);

  // Split charts into Primary Insights vs Detailed Distribution
  const primaryCharts = visibleCharts.slice(0, 2);
  const supportingCharts = visibleCharts.slice(2);

  // Available subjects for the Investigator
  const availableSubjects: InvestigationSubject[] = [
    ...visibleKPIs.map((k) => ({
      type: 'kpi' as const,
      id: k.id,
      title: isAr ? k.labelAr : k.label,
      formattedValue: k.formattedValue,
      metricKey: k.metricKey,
      currentValue: k.value,
    })),
    ...visibleCharts.map((c) => ({
      type: 'chart' as const,
      id: c.id,
      title: isAr ? c.titleAr : c.titleEn,
      dimensionKey: c.dimensionKey,
      metricKey: c.metricKey,
    })),
  ];

  // Trigger DataMate Investigator with immediate local calculation then AI enrichment
  const handleTriggerInvestigate = async (subject: InvestigationSubject) => {
    setIsInvestigatorOpen(true);
    setIsInvestigating(true);

    // 1. Immediately provide accurate local statistical calculation
    const localResult = investigateSubjectLocally(subject, dataset, language);
    setInvestigationResult(localResult);

    // 2. Try enriching with Gemini AI
    try {
      const enrichedResult = await investigateSubject(subject, dataset, language);
      setInvestigationResult(enrichedResult);
    } catch (err) {
      console.warn('Investigator enrichment error, staying with verified local result:', err);
    } finally {
      setIsInvestigating(false);
    }
  };

  // Export clean CSV
  const handleExportCSV = () => {
    const headers = dataset.columns.map((c) => c.label).join(',');
    const rows = dataset.rows
      .map((r) => dataset.columns.map((c) => `"${r[c.key] ?? ''}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name}_DataMate.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getKPIIcon = (iconName?: string) => {
    switch (iconName) {
      case 'DollarSign':
        return DollarSign;
      case 'TrendingUp':
        return TrendingUp;
      case 'PieChart':
        return PieChart;
      case 'Package':
        return Package;
      default:
        return ShoppingBag;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-7 space-y-8 animate-fade-in">
      {/* 1. TOP CONTROL & CONTEXT BAR */}
      <div
        className="no-print p-5 sm:p-6 rounded-2xl border flex flex-wrap items-center justify-between gap-4 shadow-xs"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-xs shrink-0"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#FFF9F2',
            }}
          >
            <FileSpreadsheet className="w-6 h-6" style={{ color: theme.colors.secondary }} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight"
                style={{ color: theme.colors.primary }}
              >
                {dataset.name}
              </h1>
              {activeFilter && (
                <span
                  className="flex items-center gap-1.5 text-sm sm:text-base font-bold px-3.5 py-1.5 rounded-full border"
                  style={{
                    color: theme.colors.primary,
                    backgroundColor: `${theme.colors.primary}18`,
                    borderColor: `${theme.colors.primary}33`,
                  }}
                >
                  <Filter className="w-4 h-4" style={{ color: theme.colors.secondary }} />
                  <span>
                    {activeFilter.column}: <strong>{activeFilter.value}</strong>
                  </span>
                  <button
                    onClick={() => onFilterChange(null)}
                    className="mr-1 cursor-pointer opacity-75 hover:opacity-100"
                    title={isAr ? 'إلغاء التصفية' : 'Clear filter'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
            </div>
            <div
              className="flex items-center gap-3 text-sm sm:text-base mt-1 font-medium"
              style={{ color: `${theme.colors.textPrimary}B8` }}
            >
              <span className="font-bold">{filteredRows.length} {isAr ? 'سجل مكتمل' : 'records'}</span>
              <span>·</span>
              <span className="text-emerald-700 flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                {isAr ? 'بيانات منظمة ومحسوبة' : 'Clean & calculated'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Edit button */}
          <button
            onClick={onOpenEditModal}
            className="flex items-center gap-2 px-5 py-2.5 text-base font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#FFF9F2',
            }}
            title={isAr ? 'تعديل البيانات، المخططات، والمؤشرات' : 'Edit data, charts & KPIs'}
          >
            <Edit3 className="w-4.5 h-4.5" style={{ color: theme.colors.secondary }} />
            <span>{isAr ? 'تعديل' : 'Edit'}</span>
          </button>

          {/* Export Dropdown with real PDF, PNG, Print */}
          <ExportDropdown
            language={language}
            targetElementId="datamate-printable-dashboard"
            datasetName={dataset.name}
          />

          {/* Simplify Toggle */}
          <button
            onClick={onToggleSimplify}
            className="flex items-center gap-2 px-5 py-2.5 text-base font-bold rounded-xl border transition-all cursor-pointer"
            style={{
              backgroundColor: isSimplified ? theme.colors.primary : theme.colors.surface,
              color: isSimplified ? '#FFF9F2' : theme.colors.textPrimary,
              borderColor: isSimplified ? theme.colors.primary : theme.colors.border,
            }}
          >
            {isSimplified ? (
              <Minimize2 className="w-4.5 h-4.5" />
            ) : (
              <Maximize2 className="w-4.5 h-4.5" style={{ color: theme.colors.primary }} />
            )}
            <span>{isSimplified ? (isAr ? 'مبسط (مفعّل)' : 'Simplified') : (isAr ? 'تبسيط' : 'Simplify')}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="hidden sm:flex items-center gap-2 px-4.5 py-2.5 text-base font-bold rounded-xl border transition-colors cursor-pointer"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            }}
            title={isAr ? 'تصدير البيانات كـ CSV' : 'Export clean CSV'}
          >
            <Download className="w-4.5 h-4.5" style={{ color: theme.colors.primary }} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* 1.5. DATAMATE INVESTIGATOR QUICK BAR */}
      <div
        className="no-print p-5 sm:p-6 rounded-2xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#FFF9F2',
            }}
          >
            <Lightbulb className="w-6 h-6 stroke-[2.2]" style={{ color: theme.colors.secondary }} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black" style={{ color: theme.colors.textPrimary }}>
                {isAr ? '💡 محقق البيانات: افهم الرقم' : '💡 DataMate Investigator: Why this number?'}
              </h3>
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${theme.colors.secondary}25`,
                  color: theme.colors.primary,
                }}
              >
                {isAr ? 'تحليل الأسباب والعوامل' : 'Causal Drivers'}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: `${theme.colors.textPrimary}B8` }}>
              {isAr
                ? 'اكتشف لماذا تظهر هذه الأرقام بهذا الشكل، وما هي العوامل والشرائح الأكثر تأثيراً في نتائجك.'
                : 'Discover what is driving your numbers and what underlying factors matter most.'}
            </p>
          </div>
        </div>

        {/* Quick chips to investigate immediately */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold shrink-0" style={{ color: `${theme.colors.textPrimary}99` }}>
            {isAr ? 'فحص سريع:' : 'Quick analyze:'}
          </span>
          {availableSubjects.slice(0, 4).map((sub, i) => (
            <button
              key={i}
              onClick={() => handleTriggerInvestigate(sub)}
              className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer shadow-2xs hover:shadow-xs flex items-center gap-1.5 hover:scale-105"
              style={{
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.primary,
              }}
              title={isAr ? `افهم الأسباب وراء ${sub.title}` : `Investigate ${sub.title}`}
            >
              <Lightbulb className="w-3.5 h-3.5" style={{ color: theme.colors.secondary }} />
              <span>{sub.title}</span>
              {sub.formattedValue && (
                <span className="font-mono text-xs opacity-75">({sub.formattedValue})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* CAPTURED & PRINTABLE REPORT CONTAINER */}
      {/* ============================================================== */}
      <div id="datamate-printable-dashboard" className="space-y-10 dashboard-printable">
        {/* Printable report header */}
        <div
          className="hidden print:block border-b-2 pb-4 mb-6"
          style={{ borderColor: theme.colors.primary }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black" style={{ color: theme.colors.primary }}>{dataset.name}</h1>
              <p className="text-base mt-1 font-medium" style={{ color: `${theme.colors.textPrimary}BF` }}>
                {isAr ? 'تقرير تحليلي تنفيذي — منصة DataMate' : 'Executive Analytical Report — DataMate'}
              </p>
            </div>
            <div className="text-left text-base font-mono space-y-1" style={{ color: `${theme.colors.textPrimary}BF` }}>
              <div>{new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</div>
              <div className="font-bold">{dataset.totalRows} {isAr ? 'سجل معتمد' : 'verified records'}</div>
            </div>
          </div>
        </div>

        {/* 2. SECTION: KEY METRICS */}
        <section className="space-y-4 break-inside-avoid">
          <div className="flex items-center justify-between px-1">
            <h2
              className="text-lg sm:text-xl font-black uppercase tracking-wider flex items-center gap-2.5"
              style={{ color: theme.colors.primary }}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <span>{isAr ? 'المؤشرات الرئيسية' : 'Key Metrics'}</span>
            </h2>
            <span className="text-sm sm:text-base font-bold" style={{ color: `${theme.colors.textPrimary}B0` }}>
              {isAr ? 'حسابات وإجماليات دقيقة' : 'Exact Calculations'}
            </span>
          </div>

          <div
            className={`grid gap-6 ${
              isSimplified
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {visibleKPIs.slice(0, isSimplified ? 3 : 4).map((kpi, idx) => {
              const Icon = getKPIIcon(kpi.iconName);

              // Distinct visual accents for intentional hierarchy
              const topAccent =
                idx === 0
                  ? `linear-gradient(to right, ${theme.colors.secondary}, ${theme.colors.accent}, ${theme.colors.primary})`
                  : idx === 1
                  ? `linear-gradient(to right, ${theme.colors.accent}, ${theme.colors.secondary})`
                  : idx === 2
                  ? `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.borderAccent})`
                  : `linear-gradient(to right, ${theme.colors.secondary}, ${theme.colors.primary})`;

              const iconBadgeStyle =
                idx === 0
                  ? { backgroundColor: `${theme.colors.secondary}25`, color: theme.colors.primary }
                  : idx === 1
                  ? { backgroundColor: `${theme.colors.accent}25`, color: theme.colors.accent }
                  : idx === 2
                  ? { backgroundColor: `${theme.colors.primary}18`, color: theme.colors.primary }
                  : { backgroundColor: `${theme.colors.borderAccent}30`, color: theme.colors.textPrimary };

              return (
                <div
                  key={kpi.id}
                  className="rounded-2xl border hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between break-inside-avoid p-6 sm:p-7"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    boxShadow: `0 2px 12px ${theme.colors.primary}0D`,
                  }}
                >
                  {/* Subtle top accent gradient strip */}
                  <div
                    className="absolute top-0 inset-x-0 h-1.5"
                    style={{ background: topAccent }}
                  />

                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span
                      className="text-base sm:text-lg font-bold truncate max-w-[210px]"
                      style={{ color: theme.colors.textPrimary }}
                    >
                      {isAr ? kpi.labelAr : kpi.label}
                    </span>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={iconBadgeStyle}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div>
                    <div
                      className="text-4xl sm:text-5xl lg:text-[3rem] font-black font-mono tracking-tight leading-none my-1"
                      style={{ color: theme.colors.primary }}
                    >
                      {kpi.formattedValue}
                    </div>
                    <div
                      className="text-sm sm:text-base mt-3 font-medium flex items-center justify-between gap-1.5 flex-wrap"
                      style={{ color: `${theme.colors.textPrimary}CC` }}
                    >
                      <span>{isAr ? kpi.subtitleAr : kpi.subtitle}</span>
                      <button
                        onClick={() =>
                          handleTriggerInvestigate({
                            type: 'kpi',
                            id: kpi.id,
                            title: isAr ? kpi.labelAr : kpi.label,
                            formattedValue: kpi.formattedValue,
                            metricKey: kpi.metricKey,
                            currentValue: kpi.value,
                          })
                        }
                        className="no-print inline-flex items-center gap-1 px-2.5 py-1 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer hover:shadow-2xs"
                        style={{
                          backgroundColor: `${theme.colors.primary}12`,
                          color: theme.colors.primary,
                        }}
                        title={isAr ? 'افهم الأسباب وراء هذا الرقم' : 'Investigate why this number happens'}
                      >
                        <Lightbulb className="w-3.5 h-3.5" style={{ color: theme.colors.secondary }} />
                        <span>{isAr ? 'افهم الرقم' : 'Why?'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>


        {/* 3. SECTION: MAIN VISUAL INSIGHTS (DOMINANT CHARTS) */}
        {primaryCharts.length > 0 && (
          <section className="space-y-4 break-inside-avoid">
            <div className="flex items-center justify-between px-1">
              <h2
                className="text-lg sm:text-xl font-black uppercase tracking-wider flex items-center gap-2.5"
                style={{ color: theme.colors.primary }}
              >
                <BarChart3 className="w-5 h-5" style={{ color: theme.colors.secondary }} />
                <span>{isAr ? 'التحليلات والمقارنات الرئيسية' : 'Main Visual Insights'}</span>
              </h2>
              <span className="text-sm sm:text-base font-bold" style={{ color: `${theme.colors.textPrimary}B0` }}>
                {isAr ? 'مقارنات تفاعلية مباشرة' : 'Interactive comparison'}
              </span>
            </div>

            <div
              className={`grid gap-6 break-inside-avoid ${
                primaryCharts.length === 1 || isSimplified
                  ? 'grid-cols-1'
                  : 'grid-cols-1 lg:grid-cols-2'
              }`}
            >
              {primaryCharts.map((chart) => (
                <div
                  key={chart.id}
                  className="rounded-2xl border p-6 sm:p-7 flex flex-col justify-between break-inside-avoid shadow-xs"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    boxShadow: `0 2px 12px ${theme.colors.primary}0D`,
                  }}
                >
                  <div
                    className="flex items-center justify-between pb-3.5 mb-3.5 border-b gap-3 flex-wrap"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <div>
                      <h3
                        className="text-lg sm:text-xl font-bold"
                        style={{ color: theme.colors.primary }}
                      >
                        {isAr ? chart.titleAr : chart.titleEn}
                      </h3>
                      {chart.descriptionAr && (
                        <p
                          className="text-sm sm:text-base mt-1 font-medium"
                          style={{ color: `${theme.colors.textPrimary}BF` }}
                        >
                          {isAr ? chart.descriptionAr : chart.descriptionEn}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleTriggerInvestigate({
                            type: 'chart',
                            id: chart.id,
                            title: isAr ? chart.titleAr : chart.titleEn,
                            dimensionKey: chart.dimensionKey,
                            metricKey: chart.metricKey,
                          })
                        }
                        className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                        style={{
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.primary,
                        }}
                        title={isAr ? 'افهم الأسباب وراء هذا الرسم' : 'Analyze chart drivers'}
                      >
                        <Lightbulb className="w-3.5 h-3.5" style={{ color: theme.colors.secondary }} />
                        <span>{isAr ? 'افهم الرسم' : 'Analyze'}</span>
                      </button>
                      <span
                        className="text-xs sm:text-sm uppercase font-bold px-3 py-1.5 rounded-lg border"
                        style={{
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.border,
                          color: theme.colors.primary,
                        }}
                      >
                        {chart.type === 'bar'
                          ? isAr
                            ? 'مقارنة'
                            : 'Bar'
                          : chart.type === 'line'
                          ? isAr
                            ? 'تطور زمني'
                            : 'Trend'
                          : isAr
                          ? 'توزيع'
                          : 'Donut'}
                      </span>
                    </div>
                  </div>

                  {/* Chart view */}
                  <div className="pt-2 min-h-[260px]">
                    {chart.type === 'bar' && (
                      <BarChart
                        data={chart.data}
                        title={chart.titleAr}
                        activeFilter={activeFilter?.value}
                        onBarClick={(label) => {
                          if (activeFilter?.value === label) {
                            onFilterChange(null);
                          } else {
                            onFilterChange({ column: chart.dimensionKey, value: label });
                          }
                        }}
                      />
                    )}
                    {chart.type === 'line' && (
                      <LineChart data={chart.data} title={chart.titleAr} />
                    )}
                    {chart.type === 'donut' && (
                      <DonutChart
                        data={chart.data}
                        title={chart.titleAr}
                        activeFilter={activeFilter?.value}
                        onSliceClick={(label) => {
                          if (activeFilter?.value === label) {
                            onFilterChange(null);
                          } else {
                            onFilterChange({ column: chart.dimensionKey, value: label });
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. SECTION: SUPPORTING ANALYSIS (e.g. Distribution Donut) */}
        {supportingCharts.length > 0 && !isSimplified && (
          <section className="space-y-4 break-inside-avoid">
            <div className="flex items-center justify-between px-1">
              <h2
                className="text-lg sm:text-xl font-black uppercase tracking-wider flex items-center gap-2.5"
                style={{ color: theme.colors.primary }}
              >
                <PieChart className="w-5 h-5" style={{ color: theme.colors.accent }} />
                <span>{isAr ? 'التحليل التفصيلي والتوزيع' : 'Detailed Analysis'}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {supportingCharts.map((chart) => (
                <div
                  key={chart.id}
                  className="rounded-2xl border p-6 sm:p-7 flex flex-col justify-between break-inside-avoid shadow-xs"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    boxShadow: `0 2px 12px ${theme.colors.primary}0D`,
                  }}
                >
                  <div
                    className="flex items-center justify-between pb-3.5 mb-3.5 border-b gap-3 flex-wrap"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <div>
                      <h3
                        className="text-lg sm:text-xl font-bold"
                        style={{ color: theme.colors.primary }}
                      >
                        {isAr ? chart.titleAr : chart.titleEn}
                      </h3>
                      {chart.descriptionAr && (
                        <p
                          className="text-sm sm:text-base mt-1 font-medium"
                          style={{ color: `${theme.colors.textPrimary}BF` }}
                        >
                          {isAr ? chart.descriptionAr : chart.descriptionEn}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        handleTriggerInvestigate({
                          type: 'chart',
                          id: chart.id,
                          title: isAr ? chart.titleAr : chart.titleEn,
                          dimensionKey: chart.dimensionKey,
                          metricKey: chart.metricKey,
                        })
                      }
                      className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        color: theme.colors.primary,
                      }}
                      title={isAr ? 'افهم الأسباب وراء هذا الرسم' : 'Analyze chart drivers'}
                    >
                      <Lightbulb className="w-3.5 h-3.5" style={{ color: theme.colors.secondary }} />
                      <span>{isAr ? 'افهم الرسم' : 'Analyze'}</span>
                    </button>
                  </div>

                  <div className="pt-2 min-h-[250px]">
                    {chart.type === 'donut' ? (
                      <DonutChart
                        data={chart.data}
                        title={chart.titleAr}
                        activeFilter={activeFilter?.value}
                        onSliceClick={(label) => {
                          if (activeFilter?.value === label) {
                            onFilterChange(null);
                          } else {
                            onFilterChange({ column: chart.dimensionKey, value: label });
                          }
                        }}
                      />
                    ) : chart.type === 'bar' ? (
                      <BarChart
                        data={chart.data}
                        title={chart.titleAr}
                        activeFilter={activeFilter?.value}
                        onBarClick={(label) => {
                          if (activeFilter?.value === label) {
                            onFilterChange(null);
                          } else {
                            onFilterChange({ column: chart.dimensionKey, value: label });
                          }
                        }}
                      />
                    ) : (
                      <LineChart data={chart.data} title={chart.titleAr} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. SECTION: "WHAT SHOULD I KNOW?" (إيه المهم اللي لازم تعرفه؟) */}
        <section
          className="rounded-2xl border p-7 sm:p-8 space-y-5 break-inside-avoid shadow-xs"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 50%, ${theme.colors.background} 100%)`,
            borderColor: `${theme.colors.secondary}66`,
            boxShadow: `0 2px 12px ${theme.colors.primary}0A`,
          }}
        >
          <div
            className="flex items-center justify-between pb-3 border-b"
            style={{ borderColor: `${theme.colors.secondary}40` }}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs"
                style={{
                  backgroundColor: theme.colors.secondary,
                  color: '#FFF9F2',
                }}
              >
                <Lightbulb className="w-5 h-5" style={{ color: '#FFF9F2' }} />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black" style={{ color: theme.colors.primary }}>
                  {isAr ? 'إيه المهم اللي لازم تعرفه؟' : 'What should I know?'}
                </h3>
                <p className="text-sm sm:text-base font-medium mt-0.5" style={{ color: `${theme.colors.textPrimary}CC` }}>
                  {isAr
                    ? 'أهم 3–5 استنتاجات عملية مصاغة بلغة طبيعية ومباشرة'
                    : 'Actionable takeaways summarized in plain language'}
                </p>
              </div>
            </div>
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold px-3.5 py-1.5 rounded-full border shadow-2xs"
              style={{
                color: theme.colors.primary,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <Sparkles className="w-4 h-4" style={{ color: theme.colors.secondary }} />
              <span>{isAr ? 'استنتاجات فورية' : 'Instant Insights'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 pt-1">
            {insights.map((item, idx) => {
              const badgeStyle =
                idx === 0
                  ? {
                      backgroundColor: `${theme.colors.secondary}25`,
                      color: theme.colors.primary,
                      borderColor: `${theme.colors.secondary}60`,
                    }
                  : {
                      backgroundColor: theme.colors.background,
                      color: theme.colors.primary,
                      borderColor: theme.colors.border,
                    };

              return (
                <div
                  key={item.id}
                  className="rounded-xl p-5 border flex items-start gap-4 shadow-2xs hover:shadow-xs transition-shadow break-inside-avoid"
                  style={{
                    backgroundColor: `${theme.colors.surface}FA`,
                    borderColor: theme.colors.border,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold border"
                    style={badgeStyle}
                  >
                    {idx === 0 ? <Award className="w-4.5 h-4.5" style={{ color: theme.colors.secondary }} /> : idx + 1}
                  </div>
                  <div
                    className="flex-1 text-base sm:text-lg leading-relaxed font-semibold"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    <span>
                      {isAr ? item.textAr : item.textEn}
                    </span>
                    {item.metricValue && (
                      <div
                        className="mt-2.5 inline-block font-mono text-sm sm:text-base font-bold px-3 py-1 rounded-md border"
                        style={{
                          color: theme.colors.primary,
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.border,
                        }}
                      >
                        {item.metricValue}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 6. NATURAL LANGUAGE INTERACTION BAR (Hidden on print) */}
      <div className="no-print pt-2">
        <NaturalLanguageBar
          language={language}
          onSendMessage={onSendMessage}
          chatHistory={chatHistory}
          isProcessing={isProcessingQuery}
        />
      </div>

      {/* 7. COLLAPSIBLE DATA TABLE PREVIEW (Hidden on print) */}
      <div
        className="no-print rounded-2xl border shadow-xs overflow-hidden"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        <button
          onClick={() => setShowTable(!showTable)}
          className="w-full px-6 py-5 flex items-center justify-between text-right cursor-pointer hover:bg-black/2 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <FileSpreadsheet className="w-5 h-5" style={{ color: theme.colors.primary }} />
            <span className="text-base sm:text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
              {isAr ? 'عرض جدول البيانات المنظمة بالكامل' : 'View Full Cleaned Data Table'}
            </span>
            <span
              className="text-sm sm:text-base font-mono font-bold"
              style={{ color: `${theme.colors.textPrimary}B0` }}
            >
              ({filteredRows.length} {isAr ? 'سجل' : 'rows'})
            </span>
          </div>
          {showTable ? (
            <ChevronUp className="w-5 h-5" style={{ color: theme.colors.primary }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: theme.colors.primary }} />
          )}
        </button>

        {showTable && (
          <div
            className="p-6 border-t space-y-5"
            style={{ borderColor: theme.colors.border }}
          >
            {/* Search Input */}
            <div className="flex items-center justify-between gap-4">
              <input
                type="text"
                placeholder={isAr ? 'بحث في السجلات...' : 'Search records...'}
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setTablePage(1);
                }}
                className="w-full max-w-sm px-4 py-2.5 text-base rounded-xl focus:outline-none focus:ring-2 font-medium border"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                }}
              />
              <span
                className="text-sm sm:text-base font-mono font-bold"
                style={{ color: `${theme.colors.textPrimary}BF` }}
              >
                {searchResults.length} {isAr ? 'نتيجة مطابقة' : 'matching results'}
              </span>
            </div>

            {/* Table with comfortable readable rows */}
            <div
              className="overflow-x-auto rounded-xl border"
              style={{ borderColor: theme.colors.border }}
            >
              <table className="w-full text-right text-base">
                <thead
                  className="font-bold border-b"
                  style={{
                    backgroundColor: theme.colors.surfaceSecondary,
                    borderColor: theme.colors.border,
                    color: theme.colors.primary,
                  }}
                >
                  <tr>
                    {dataset.columns.map((c) => (
                      <th key={c.key} className="px-5 py-3.5 whitespace-nowrap text-base font-bold">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody
                  className="divide-y"
                  style={{ borderColor: theme.colors.border }}
                >
                  {paginatedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-black/2 transition-colors"
                    >
                      {dataset.columns.map((c) => (
                        <td
                          key={c.key}
                          className="px-5 py-3.5 whitespace-nowrap font-mono text-sm sm:text-base"
                          style={{ color: theme.colors.textPrimary }}
                        >
                          {row[c.key] !== null ? String(row[c.key]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-base pt-1">
                <span
                  className="font-mono font-bold"
                  style={{ color: `${theme.colors.textPrimary}BF` }}
                >
                  {isAr ? `صفحة ${tablePage} من ${totalPages}` : `Page ${tablePage} of ${totalPages}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={tablePage === 1}
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-xl border disabled:opacity-40 cursor-pointer text-base font-bold"
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {isAr ? 'السابق' : 'Prev'}
                  </button>
                  <button
                    disabled={tablePage === totalPages}
                    onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 rounded-xl border disabled:opacity-40 cursor-pointer text-base font-bold"
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {isAr ? 'التالي' : 'Next'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. DATAMATE INVESTIGATOR MODAL */}
      <InvestigatorModal
        isOpen={isInvestigatorOpen}
        onClose={() => setIsInvestigatorOpen(false)}
        result={investigationResult}
        isLoading={isInvestigating}
        language={language}
        availableSubjects={availableSubjects}
        onSelectSubject={handleTriggerInvestigate}
      />
    </div>
  );
};

