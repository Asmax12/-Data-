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
} from '../types';
import { BarChart } from './Charts/BarChart';
import { LineChart } from './Charts/LineChart';
import { DonutChart } from './Charts/DonutChart';
import { NaturalLanguageBar } from './NaturalLanguageBar';
import { ExportDropdown } from './ExportDropdown';

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
  const isAr = language === 'ar';
  const [showTable, setShowTable] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 10;

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
      <div className="no-print bg-white p-5 sm:p-6 rounded-2xl border border-[#B9A3D4]/35 shadow-[0_2px_12px_rgba(75,49,95,0.04)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4B315F] to-[#29232D] text-[#FFF9F2] flex items-center justify-center shadow-xs shrink-0">
            <FileSpreadsheet className="w-6 h-6 text-[#F4A261]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#4B315F] tracking-tight">
                {dataset.name}
              </h1>
              {activeFilter && (
                <span className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#4B315F] bg-[#4B315F]/10 px-3.5 py-1.5 rounded-full border border-[#4B315F]/20">
                  <Filter className="w-4 h-4 text-[#F4A261]" />
                  <span>
                    {activeFilter.column}: <strong>{activeFilter.value}</strong>
                  </span>
                  <button
                    onClick={() => onFilterChange(null)}
                    className="hover:text-[#E76F7A] mr-1 cursor-pointer"
                    title={isAr ? 'إلغاء التصفية' : 'Clear filter'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm sm:text-base text-[#29232D]/75 mt-1 font-medium">
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
            className="flex items-center gap-2 px-5 py-2.5 text-base font-bold rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 shadow-2xs transition-all cursor-pointer"
            title={isAr ? 'تعديل البيانات، المخططات، والمؤشرات' : 'Edit data, charts & KPIs'}
          >
            <Edit3 className="w-4.5 h-4.5 text-[#F4A261]" />
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
            className={`flex items-center gap-2 px-5 py-2.5 text-base font-bold rounded-xl border transition-all cursor-pointer ${
              isSimplified
                ? 'bg-[#4B315F] text-[#FFF9F2] border-[#4B315F]'
                : 'bg-white text-[#29232D] border-[#B9A3D4]/40 hover:bg-[#FFF9F2]'
            }`}
          >
            {isSimplified ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5 text-[#4B315F]" />}
            <span>{isSimplified ? (isAr ? 'مبسط (مفعّل)' : 'Simplified') : (isAr ? 'تبسيط' : 'Simplify')}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="hidden sm:flex items-center gap-2 px-4.5 py-2.5 text-base font-bold rounded-xl bg-white border border-[#B9A3D4]/40 text-[#29232D] hover:bg-[#FFF9F2] transition-colors cursor-pointer"
            title={isAr ? 'تصدير البيانات كـ CSV' : 'Export clean CSV'}
          >
            <Download className="w-4.5 h-4.5 text-[#4B315F]" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CAPTURED & PRINTABLE REPORT CONTAINER */}
      {/* ============================================================== */}
      <div id="datamate-printable-dashboard" className="space-y-10 dashboard-printable">
        {/* Printable report header */}
        <div className="hidden print:block border-b-2 border-[#4B315F] pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-[#4B315F]">{dataset.name}</h1>
              <p className="text-base text-[#29232D]/75 mt-1 font-medium">
                {isAr ? 'تقرير تحليلي تنفيذي — منصة DataMate' : 'Executive Analytical Report — DataMate'}
              </p>
            </div>
            <div className="text-left text-base font-mono text-[#29232D]/75 space-y-1">
              <div>{new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</div>
              <div className="font-bold">{dataset.totalRows} {isAr ? 'سجل معتمد' : 'verified records'}</div>
            </div>
          </div>
        </div>

        {/* 2. SECTION: KEY METRICS */}
        <section className="space-y-4 break-inside-avoid">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-[#4B315F] flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#4B315F]" />
              <span>{isAr ? 'المؤشرات الرئيسية' : 'Key Metrics'}</span>
            </h2>
            <span className="text-sm sm:text-base text-[#29232D]/70 font-bold">
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
                  ? 'from-[#F4A261] via-[#E76F7A] to-[#4B315F]'
                  : idx === 1
                  ? 'from-[#E76F7A] to-[#F4A261]'
                  : idx === 2
                  ? 'from-[#4B315F] to-[#B9A3D4]'
                  : 'from-[#F4A261] to-[#4B315F]';

              const iconBadge =
                idx === 0
                  ? 'bg-[#F4A261]/25 text-[#4B315F]'
                  : idx === 1
                  ? 'bg-[#E76F7A]/25 text-[#E76F7A]'
                  : idx === 2
                  ? 'bg-[#4B315F]/15 text-[#4B315F]'
                  : 'bg-[#B9A3D4]/30 text-[#29232D]';

              return (
                <div
                  key={kpi.id}
                  className="bg-white rounded-2xl border border-[#B9A3D4]/35 shadow-[0_2px_12px_rgba(75,49,95,0.04)] hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between break-inside-avoid p-6 sm:p-7"
                >
                  {/* Subtle top accent gradient strip */}
                  <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${topAccent}`} />

                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span className="text-base sm:text-lg font-bold text-[#29232D] truncate max-w-[210px]">
                      {isAr ? kpi.labelAr : kpi.label}
                    </span>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBadge}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div>
                    <div className="text-4xl sm:text-5xl lg:text-[3rem] font-black text-[#4B315F] font-mono tracking-tight leading-none my-1">
                      {kpi.formattedValue}
                    </div>
                    <div className="text-sm sm:text-base text-[#29232D]/80 mt-3 font-medium flex items-center gap-1.5">
                      <span>{isAr ? kpi.subtitleAr : kpi.subtitle}</span>
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
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-[#4B315F] flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-[#F4A261]" />
                <span>{isAr ? 'التحليلات والمقارنات الرئيسية' : 'Main Visual Insights'}</span>
              </h2>
              <span className="text-sm sm:text-base text-[#29232D]/70 font-bold">
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
                  className="bg-white rounded-2xl border border-[#B9A3D4]/35 p-6 sm:p-7 shadow-[0_2px_12px_rgba(75,49,95,0.04)] flex flex-col justify-between break-inside-avoid"
                >
                  <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#B9A3D4]/20">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-[#4B315F]">
                        {isAr ? chart.titleAr : chart.titleEn}
                      </h3>
                      {chart.descriptionAr && (
                        <p className="text-sm sm:text-base text-[#29232D]/75 mt-1 font-medium">
                          {isAr ? chart.descriptionAr : chart.descriptionEn}
                        </p>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm uppercase font-bold text-[#4B315F] bg-[#FFF9F2] px-3 py-1.5 rounded-lg border border-[#B9A3D4]/30">
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
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-[#4B315F] flex items-center gap-2.5">
                <PieChart className="w-5 h-5 text-[#E76F7A]" />
                <span>{isAr ? 'التحليل التفصيلي والتوزيع' : 'Detailed Analysis'}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {supportingCharts.map((chart) => (
                <div
                  key={chart.id}
                  className="bg-white rounded-2xl border border-[#B9A3D4]/35 p-6 sm:p-7 shadow-[0_2px_12px_rgba(75,49,95,0.04)] flex flex-col justify-between break-inside-avoid"
                >
                  <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#B9A3D4]/20">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-[#4B315F]">
                        {isAr ? chart.titleAr : chart.titleEn}
                      </h3>
                      {chart.descriptionAr && (
                        <p className="text-sm sm:text-base text-[#29232D]/75 mt-1 font-medium">
                          {isAr ? chart.descriptionAr : chart.descriptionEn}
                        </p>
                      )}
                    </div>
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
        <section className="bg-gradient-to-br from-[#FFF9F2] via-white to-[#FFF9F2] rounded-2xl border border-[#F4A261]/50 p-7 sm:p-8 shadow-[0_2px_12px_rgba(75,49,95,0.04)] space-y-5 break-inside-avoid">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4A261]/25">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#F4A261] text-[#29232D] flex items-center justify-center shadow-2xs">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#4B315F]">
                  {isAr ? 'إيه المهم اللي لازم تعرفه؟' : 'What should I know?'}
                </h3>
                <p className="text-sm sm:text-base text-[#29232D]/80 font-medium mt-0.5">
                  {isAr
                    ? 'أهم 3–5 استنتاجات عملية مصاغة بلغة طبيعية ومباشرة'
                    : 'Actionable takeaways summarized in plain language'}
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-[#4B315F] bg-white px-3.5 py-1.5 rounded-full border border-[#B9A3D4]/30 shadow-2xs">
              <Sparkles className="w-4 h-4 text-[#F4A261]" />
              <span>{isAr ? 'استنتاجات فورية' : 'Instant Insights'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 pt-1">
            {insights.map((item, idx) => {
              // Tailored visual identity for each insight card
              const badgeBg =
                idx === 0
                  ? 'bg-[#F4A261]/20 text-[#4B315F] border-[#F4A261]/40'
                  : idx === 1
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-[#FFF9F2] text-[#4B315F] border-[#B9A3D4]/30';

              return (
                <div
                  key={item.id}
                  className="bg-white/95 rounded-xl p-5 border border-[#B9A3D4]/35 flex items-start gap-4 shadow-2xs hover:shadow-xs transition-shadow break-inside-avoid"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold border ${badgeBg}`}
                  >
                    {idx === 0 ? <Award className="w-4.5 h-4.5 text-[#F4A261]" /> : idx + 1}
                  </div>
                  <div className="flex-1 text-base sm:text-lg text-[#29232D] leading-relaxed font-semibold">
                    <span>
                      {isAr ? item.textAr : item.textEn}
                    </span>
                    {item.metricValue && (
                      <div className="mt-2.5 inline-block font-mono text-sm sm:text-base font-bold text-[#4B315F] bg-[#FFF9F2] px-3 py-1 rounded-md border border-[#B9A3D4]/30">
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
      <div className="no-print bg-white rounded-2xl border border-[#B9A3D4]/35 shadow-[0_2px_12px_rgba(75,49,95,0.04)] overflow-hidden">
        <button
          onClick={() => setShowTable(!showTable)}
          className="w-full px-6 py-5 flex items-center justify-between text-right cursor-pointer hover:bg-[#FFF9F2]/60 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <FileSpreadsheet className="w-5 h-5 text-[#4B315F]" />
            <span className="text-base sm:text-lg font-bold text-[#29232D]">
              {isAr ? 'عرض جدول البيانات المنظمة بالكامل' : 'View Full Cleaned Data Table'}
            </span>
            <span className="text-sm sm:text-base text-[#29232D]/70 font-mono font-bold">
              ({filteredRows.length} {isAr ? 'سجل' : 'rows'})
            </span>
          </div>
          {showTable ? (
            <ChevronUp className="w-5 h-5 text-[#4B315F]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#4B315F]" />
          )}
        </button>

        {showTable && (
          <div className="p-6 border-t border-[#B9A3D4]/20 space-y-5">
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
                className="w-full max-w-sm px-4 py-2.5 text-base bg-[#FFF9F2] border border-[#B9A3D4]/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B315F] font-medium"
              />
              <span className="text-sm sm:text-base text-[#29232D]/75 font-mono font-bold">
                {searchResults.length} {isAr ? 'نتيجة مطابقة' : 'matching results'}
              </span>
            </div>

            {/* Table with comfortable readable rows */}
            <div className="overflow-x-auto rounded-xl border border-[#B9A3D4]/30">
              <table className="w-full text-right text-base">
                <thead className="bg-[#FFF9F2] text-[#4B315F] font-bold border-b border-[#B9A3D4]/30">
                  <tr>
                    {dataset.columns.map((c) => (
                      <th key={c.key} className="px-5 py-3.5 whitespace-nowrap text-base font-bold">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B9A3D4]/20">
                  {paginatedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#FFF9F2]/50 transition-colors">
                      {dataset.columns.map((c) => (
                        <td
                          key={c.key}
                          className="px-5 py-3.5 whitespace-nowrap font-mono text-sm sm:text-base text-[#29232D]"
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
                <span className="text-[#29232D]/75 font-mono font-bold">
                  {isAr ? `صفحة ${tablePage} من ${totalPages}` : `Page ${tablePage} of ${totalPages}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={tablePage === 1}
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-xl bg-[#FFF9F2] border border-[#B9A3D4]/30 disabled:opacity-40 cursor-pointer text-base font-bold"
                  >
                    {isAr ? 'السابق' : 'Prev'}
                  </button>
                  <button
                    disabled={tablePage === totalPages}
                    onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 rounded-xl bg-[#FFF9F2] border border-[#B9A3D4]/30 disabled:opacity-40 cursor-pointer text-base font-bold"
                  >
                    {isAr ? 'التالي' : 'Next'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
