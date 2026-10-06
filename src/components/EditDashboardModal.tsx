import React, { useState } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  Table,
  LayoutGrid,
  BarChart2,
  Sparkles,
  Edit2,
  Check,
  Eye,
  EyeOff,
  Columns,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { CleanedDataset, KPIItem, ChartConfig, DataRow, ColumnMeta } from '../types';
import { processAndCleanData } from '../utils/dataParser';
import { generateKPIs, generateCharts, generateInsights } from '../utils/analyticsEngine';

interface EditDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: CleanedDataset;
  kpis: KPIItem[];
  charts: ChartConfig[];
  isSimplified: boolean;
  language: 'ar' | 'en';
  onSave: (
    updatedDataset: CleanedDataset,
    updatedKPIs: KPIItem[],
    updatedCharts: ChartConfig[],
    newSimplified: boolean
  ) => void;
  onNaturalEdit: (command: string) => Promise<void>;
}

export const EditDashboardModal: React.FC<EditDashboardModalProps> = ({
  isOpen,
  onClose,
  dataset,
  kpis,
  charts,
  isSimplified,
  language,
  onSave,
  onNaturalEdit,
}) => {
  if (!isOpen) return null;

  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<'data' | 'charts' | 'kpis' | 'ai'>('data');

  // Local state copies for editing
  const [editableRows, setEditableRows] = useState<DataRow[]>(() =>
    JSON.parse(JSON.stringify(dataset.rows))
  );
  const [editableColumns, setEditableColumns] = useState<ColumnMeta[]>(() =>
    JSON.parse(JSON.stringify(dataset.columns))
  );
  const [editableKPIs, setEditableKPIs] = useState<KPIItem[]>(() =>
    JSON.parse(JSON.stringify(kpis))
  );
  const [editableCharts, setEditableCharts] = useState<ChartConfig[]>(() =>
    JSON.parse(JSON.stringify(charts))
  );
  const [localSimplified, setLocalSimplified] = useState(isSimplified);

  // Column addition / rename states
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnDefault, setNewColumnDefault] = useState('');
  const [editingColKey, setEditingColKey] = useState<string | null>(null);
  const [editingColLabel, setEditingColLabel] = useState('');

  // AI Prompt in Edit
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Cell edit handler
  const handleCellChange = (rowIndex: number, colKey: string, val: string) => {
    setEditableRows((prev) => {
      const copy = [...prev];
      copy[rowIndex] = { ...copy[rowIndex], [colKey]: val };
      return copy;
    });
  };

  // Delete row
  const handleDeleteRow = (rowIndex: number) => {
    setEditableRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
  };

  // Add new row
  const handleAddRow = () => {
    const newRow: DataRow = {};
    editableColumns.forEach((col) => {
      newRow[col.key] = col.type === 'numeric' ? 0 : '';
    });
    setEditableRows((prev) => [newRow, ...prev]);
  };

  // Add new column
  const handleAddColumn = () => {
    const colName = newColumnName.trim();
    if (!colName) return;

    const newKey = colName;
    const isNum = !isNaN(Number(newColumnDefault)) && newColumnDefault.trim() !== '';

    const newColMeta: ColumnMeta = {
      key: newKey,
      label: colName,
      type: isNum ? 'numeric' : 'text',
      inferredRole: isNum ? 'metric' : 'attribute',
      sampleValues: [newColumnDefault || (isNum ? 0 : '—')],
      missingCount: 0,
      uniqueCount: 1,
    };

    setEditableColumns((prev) => [...prev, newColMeta]);
    setEditableRows((prev) =>
      prev.map((r) => ({
        ...r,
        [newKey]: isNum ? Number(newColumnDefault) || 0 : newColumnDefault,
      }))
    );

    setNewColumnName('');
    setNewColumnDefault('');
  };

  // Rename column
  const handleSaveRenameColumn = (oldKey: string) => {
    if (!editingColLabel.trim()) {
      setEditingColKey(null);
      return;
    }
    const newName = editingColLabel.trim();
    setEditableColumns((prev) =>
      prev.map((col) => (col.key === oldKey ? { ...col, label: newName, key: newName } : col))
    );
    setEditableRows((prev) =>
      prev.map((row) => {
        const updated = { ...row };
        if (oldKey !== newName) {
          updated[newName] = updated[oldKey];
          delete updated[oldKey];
        }
        return updated;
      })
    );
    setEditingColKey(null);
  };

  // Delete column
  const handleDeleteColumn = (colKey: string) => {
    if (editableColumns.length <= 1) return;
    setEditableColumns((prev) => prev.filter((c) => c.key !== colKey));
    setEditableRows((prev) =>
      prev.map((r) => {
        const copy = { ...r };
        delete copy[colKey];
        return copy;
      })
    );
  };

  // Toggle KPI visibility
  const handleToggleKPI = (kpiId: string) => {
    setEditableKPIs((prev) =>
      prev.map((k) => (k.id === kpiId ? { ...k, enabled: k.enabled === false ? true : false } : k))
    );
  };

  // Change chart type
  const handleChangeChartType = (chartId: string, newType: 'bar' | 'line' | 'donut') => {
    setEditableCharts((prev) =>
      prev.map((c) => (c.id === chartId ? { ...c, type: newType } : c))
    );
  };

  // Toggle chart visibility
  const handleToggleChart = (chartId: string) => {
    setEditableCharts((prev) =>
      prev.map((c) => (c.id === chartId ? { ...c, hidden: !c.hidden } : c))
    );
  };

  // Commit and recalculate everything
  const handleCommit = () => {
    // Re-process data to recalculate summaries, missing values, sums
    const rawHeaders = editableColumns.map((c) => c.key);
    const updatedDataset = processAndCleanData(rawHeaders, editableRows, dataset.name);

    // Re-sync KPIs and charts based on fresh dataset while respecting user edits
    const freshKpis = generateKPIs(updatedDataset);
    const mergedKPIs = freshKpis.map((k) => {
      const match = editableKPIs.find((ek) => ek.id === k.id);
      return match ? { ...k, enabled: match.enabled } : k;
    });

    const freshCharts = generateCharts(updatedDataset);
    const mergedCharts = freshCharts.map((c) => {
      const match = editableCharts.find((ec) => ec.id === c.id);
      return match ? { ...c, type: match.type, hidden: match.hidden } : c;
    });

    onSave(updatedDataset, mergedKPIs, mergedCharts, localSimplified);
    onClose();
  };

  // Quick AI edit trigger
  const handleQuickAiEdit = async (promptText: string) => {
    setIsAiProcessing(true);
    try {
      await onNaturalEdit(promptText);
      onClose();
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-white rounded-2xl border border-[#B9A3D4]/40 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#B9A3D4]/30 flex items-center justify-between bg-[#FFF9F2]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4B315F] text-[#FFF9F2] flex items-center justify-center">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#4B315F]">
                {isAr ? 'تعديل البيانات ولوحة التحكم' : 'Edit Data & Dashboard'}
              </h2>
              <p className="text-[11px] text-[#29232D]/60">
                {isAr
                  ? 'عدّل السجلات، صحح القيم، أضف أعمدة، أو خصص المخططات والمؤشرات'
                  : 'Edit records, correct values, manage columns, and customize charts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCommit}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#F4A261]" />
              <span>{isAr ? 'حفظ وتحديث الداشبورد' : 'Save & Update'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white text-[#29232D]/60 hover:text-[#29232D] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#B9A3D4]/20 bg-white text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('data')}
            className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'data'
                ? 'border-[#4B315F] text-[#4B315F]'
                : 'border-transparent text-[#29232D]/60 hover:text-[#29232D]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>{isAr ? 'تعديل السجلات والبيانات' : 'Edit Rows & Columns'}</span>
            <span className="text-[10px] bg-[#FFF9F2] px-1.5 py-0.5 rounded font-mono">
              {editableRows.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('charts')}
            className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'charts'
                ? 'border-[#4B315F] text-[#4B315F]'
                : 'border-transparent text-[#29232D]/60 hover:text-[#29232D]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'المخططات والرسوم' : 'Charts & Graphs'}</span>
          </button>

          <button
            onClick={() => setActiveTab('kpis')}
            className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'kpis'
                ? 'border-[#4B315F] text-[#4B315F]'
                : 'border-transparent text-[#29232D]/60 hover:text-[#29232D]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{isAr ? 'كروت المؤشرات (KPIs)' : 'KPI Cards'}</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'ai'
                ? 'border-[#4B315F] text-[#4B315F]'
                : 'border-transparent text-[#29232D]/60 hover:text-[#29232D]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F4A261]" />
            <span>{isAr ? 'تعديل بالأوامر الصوتية أو النص' : 'AI Edit'}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DATA EDITING */}
          {activeTab === 'data' && (
            <div className="space-y-5">
              {/* Controls bar: Add row, add column */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFF9F2] p-3 rounded-xl border border-[#B9A3D4]/30">
                <button
                  onClick={handleAddRow}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#F4A261]" />
                  <span>{isAr ? '+ إضافة صف جديد' : '+ Add New Row'}</span>
                </button>

                {/* Add Column mini form */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={isAr ? 'اسم العمود الجديد...' : 'New column name...'}
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white border border-[#B9A3D4]/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B315F]"
                  />
                  <input
                    type="text"
                    placeholder={isAr ? 'القيمة الافتراضية' : 'Default value'}
                    value={newColumnDefault}
                    onChange={(e) => setNewColumnDefault(e.target.value)}
                    className="w-28 px-2.5 py-1 text-xs bg-white border border-[#B9A3D4]/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B315F]"
                  />
                  <button
                    onClick={handleAddColumn}
                    disabled={!newColumnName.trim()}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-[#B9A3D4]/50 text-[#4B315F] hover:bg-[#FFF9F2] disabled:opacity-40 cursor-pointer"
                  >
                    {isAr ? 'إضافة عمود' : 'Add Column'}
                  </button>
                </div>
              </div>

              {/* Editable Grid */}
              <div className="border border-[#B9A3D4]/40 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FFF9F2] text-[#4B315F] font-bold border-b border-[#B9A3D4]/30">
                    <tr>
                      <th className="px-3 py-2.5 w-12 text-center">#</th>
                      {editableColumns.map((col) => (
                        <th key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                          {editingColKey === col.key ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingColLabel}
                                onChange={(e) => setEditingColLabel(e.target.value)}
                                className="px-2 py-0.5 text-xs bg-white border border-[#4B315F] rounded font-normal"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRenameColumn(col.key)}
                                className="text-emerald-700 hover:text-emerald-800"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 group">
                              <span
                                onClick={() => {
                                  setEditingColKey(col.key);
                                  setEditingColLabel(col.label);
                                }}
                                className="cursor-pointer hover:underline"
                                title={isAr ? 'اضغط لتغيير اسم العمود' : 'Click to rename column'}
                              >
                                {col.label}
                              </span>
                              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                                <button
                                  onClick={() => handleDeleteColumn(col.key)}
                                  className="text-[#E76F7A] hover:opacity-80 p-0.5 cursor-pointer"
                                  title={isAr ? 'حذف هذا العمود' : 'Delete column'}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 w-14 text-center">{isAr ? 'إجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B9A3D4]/20">
                    {editableRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#FFF9F2]/40 group">
                        <td className="px-2.5 py-1.5 text-center font-mono text-[10px] text-[#29232D]/40">
                          {rIdx + 1}
                        </td>
                        {editableColumns.map((col) => (
                          <td key={col.key} className="px-2 py-1">
                            <input
                              type="text"
                              value={row[col.key] !== null ? String(row[col.key]) : ''}
                              onChange={(e) => handleCellChange(rIdx, col.key, e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-transparent hover:bg-white focus:bg-white rounded border border-transparent focus:border-[#4B315F] font-mono focus:outline-none transition-colors"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => handleDeleteRow(rIdx)}
                            className="p-1 rounded text-[#E76F7A] hover:bg-[#E76F7A]/10 opacity-70 group-hover:opacity-100 cursor-pointer"
                            title={isAr ? 'حذف هذا الصف' : 'Delete row'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: CHARTS EDITING */}
          {activeTab === 'charts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#4B315F]">
                    {isAr ? 'التحكم في الرسوم البيانية وأنواعها:' : 'Manage Dashboard Charts:'}
                  </h3>
                  <p className="text-[11px] text-[#29232D]/60">
                    {isAr
                      ? 'يمكنك تغيير نوع المخطط (شريطي، دائري، أو منحنى) أو إخفاء أي رسم'
                      : 'Switch chart types (Bar, Donut, Line) or toggle visibility'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {editableCharts.map((chart) => (
                  <div
                    key={chart.id}
                    className={`p-4 rounded-xl border transition-all ${
                      chart.hidden
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-[#B9A3D4]/40 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-[#29232D]">
                        {isAr ? chart.titleAr : chart.titleEn}
                      </span>
                      <button
                        onClick={() => handleToggleChart(chart.id)}
                        className="text-xs text-[#4B315F] flex items-center gap-1 cursor-pointer"
                      >
                        {chart.hidden ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px]">{isAr ? 'مخفي' : 'Hidden'}</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 text-[#F4A261]" />
                            <span className="text-[10px]">{isAr ? 'ظاهر' : 'Visible'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2">
                      <span className="text-[11px] text-[#29232D]/60 ml-2">
                        {isAr ? 'نوع المخطط:' : 'Chart Type:'}
                      </span>
                      {(['bar', 'donut', 'line'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => handleChangeChartType(chart.id, t)}
                          className={`px-2.5 py-1 text-[11px] rounded font-semibold transition-all cursor-pointer ${
                            chart.type === t
                              ? 'bg-[#4B315F] text-[#FFF9F2]'
                              : 'bg-[#FFF9F2] text-[#29232D]/70 hover:bg-[#B9A3D4]/20'
                          }`}
                        >
                          {t === 'bar'
                            ? isAr
                              ? 'أعمدة'
                              : 'Bar'
                            : t === 'donut'
                            ? isAr
                              ? 'دائري'
                              : 'Donut'
                            : isAr
                            ? 'منحنى'
                            : 'Line'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: KPIS EDITING */}
          {activeTab === 'kpis' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-[#4B315F]">
                  {isAr ? 'اختيار كروت المؤشرات المعروضة في الواجهة:' : 'Select Displayed KPI Cards:'}
                </h3>
                <p className="text-[11px] text-[#29232D]/60">
                  {isAr
                    ? 'اضغط على أي مؤشر لتفعيله أو إلغاء عرضه في الداشبورد'
                    : 'Click any KPI to toggle its visibility on the dashboard'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {editableKPIs.map((kpi) => {
                  const isEnabled = kpi.enabled !== false;
                  return (
                    <div
                      key={kpi.id}
                      onClick={() => handleToggleKPI(kpi.id)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isEnabled
                          ? 'bg-white border-[#4B315F]/40 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 opacity-50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-[#29232D]">
                          {isAr ? kpi.labelAr : kpi.label}
                        </div>
                        <div className="text-sm font-extrabold text-[#4B315F] font-mono mt-0.5">
                          {kpi.formattedValue}
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isEnabled ? 'bg-[#4B315F] text-white' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isEnabled ? '✓' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: NATURAL LANGUAGE EDITING */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="bg-[#FFF9F2] p-4 rounded-xl border border-[#F4A261]/40">
                <h3 className="text-xs font-bold text-[#4B315F] mb-1">
                  {isAr ? 'عدّل باللغة العادية مباشرة:' : 'Edit with natural language:'}
                </h3>
                <p className="text-[11px] text-[#29232D]/70 mb-3">
                  {isAr
                    ? 'يمكنك كتابة طلبك ببساطة وسيقوم المساعد بتطبيقه على الفور'
                    : 'Speak naturally and DataMate executes the changes automatically'}
                </p>

                {/* Example Quick Prompts from requirements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    isAr ? 'الرقم ده غلط، عدله.' : 'This number is wrong, correct it.',
                    isAr ? 'ضيفي عمود الأرباح.' : 'Add the profit column.',
                    isAr ? 'شيل الرسم البياني ده.' : 'Remove this chart.',
                    isAr ? 'بدل الرسم ده بمخطط دائري.' : 'Replace this chart with a donut chart.',
                    isAr ? 'عايزة المبيعات حسب الشهر.' : 'Show sales by month.',
                    isAr ? 'ضيفي عدد الطلبات للـDashboard.' : 'Add order count to the dashboard.',
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAiEdit(chip)}
                      disabled={isAiProcessing}
                      className="text-right p-2 text-xs rounded-lg bg-white border border-[#B9A3D4]/30 hover:border-[#4B315F] text-[#4B315F] font-medium transition-all cursor-pointer disabled:opacity-50 flex items-center justify-between"
                    >
                      <span>{chip}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#F4A261] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#B9A3D4]/30 bg-[#FFF9F2]/50 flex items-center justify-between">
          <span className="text-[11px] text-[#29232D]/60 font-mono">
            {editableRows.length} {isAr ? 'سجل' : 'rows'} · {editableColumns.length}{' '}
            {isAr ? 'عمود' : 'columns'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium rounded-xl bg-white border border-[#B9A3D4]/50 text-[#29232D] hover:bg-[#FFF9F2] cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleCommit}
              className="px-5 py-1.5 text-xs font-bold rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-[#F4A261]" />
              <span>{isAr ? 'تطبيق التعديلات' : 'Apply Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
