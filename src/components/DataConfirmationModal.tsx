import React, { useState } from 'react';
import {
  Check,
  Edit2,
  Trash2,
  Plus,
  HelpCircle,
  AlertCircle,
  Table,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { InferredColumnInfo } from '../utils/naturalDataParser';

interface DataConfirmationModalProps {
  isOpen: boolean;
  isAr: boolean;
  initialHeaders: string[];
  initialRows: Record<string, any>[];
  initialColumnTypes: Record<string, InferredColumnInfo['type']>;
  confidenceReason?: string;
  cleaningNotes?: string[];
  onConfirm: (confirmedHeaders: string[], confirmedRows: Record<string, any>[]) => void;
  onCancel: () => void;
}

const TYPE_TRANSLATIONS: Record<string, { ar: string; en: string; color: string }> = {
  Text: { ar: 'نص', en: 'Text', color: '#6366F1' },
  Number: { ar: 'رقم', en: 'Number', color: '#10B981' },
  Currency: { ar: 'عملة / مالي', en: 'Currency', color: '#059669' },
  Date: { ar: 'تاريخ', en: 'Date', color: '#8B5CF6' },
  Percentage: { ar: 'نسبة مئوية', en: 'Percentage', color: '#EC4899' },
  Category: { ar: 'تصنيف', en: 'Category', color: '#F59E0B' },
  Location: { ar: 'مكان / مدينة', en: 'Location', color: '#3B82F6' },
  ID: { ar: 'معرّف / كود', en: 'ID', color: '#64748B' },
};

export const DataConfirmationModal: React.FC<DataConfirmationModalProps> = ({
  isOpen,
  isAr,
  initialHeaders,
  initialRows,
  initialColumnTypes,
  confidenceReason,
  cleaningNotes = [],
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();

  const [headers, setHeaders] = useState<string[]>(initialHeaders);
  const [rows, setRows] = useState<Record<string, any>[]>(initialRows);
  const [columnTypes, setColumnTypes] = useState(initialColumnTypes);
  const [editingHeaderIndex, setEditingHeaderIndex] = useState<number | null>(null);
  const [tempHeaderName, setTempHeaderName] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);
  const [showHelperMapping, setShowHelperMapping] = useState(false);

  if (!isOpen) return null;

  // Header rename handler
  const handleStartRename = (idx: number) => {
    setEditingHeaderIndex(idx);
    setTempHeaderName(headers[idx]);
  };

  const handleSaveRename = (idx: number) => {
    if (!tempHeaderName.trim()) {
      setEditingHeaderIndex(null);
      return;
    }
    const oldKey = headers[idx];
    const newKey = tempHeaderName.trim();

    const newHeaders = [...headers];
    newHeaders[idx] = newKey;
    setHeaders(newHeaders);

    // Update keys in rows
    const newRows = rows.map((r) => {
      const copy = { ...r };
      copy[newKey] = copy[oldKey];
      if (newKey !== oldKey) {
        delete copy[oldKey];
      }
      return copy;
    });
    setRows(newRows);

    // Update column types
    const newTypes = { ...columnTypes };
    newTypes[newKey] = newTypes[oldKey] || 'Text';
    if (newKey !== oldKey) {
      delete newTypes[oldKey];
    }
    setColumnTypes(newTypes);

    setEditingHeaderIndex(null);
  };

  // Remove column
  const handleRemoveColumn = (colToRemove: string) => {
    if (headers.length <= 1) return; // Keep at least 1 column
    setHeaders(headers.filter((h) => h !== colToRemove));
    setRows(
      rows.map((r) => {
        const copy = { ...r };
        delete copy[colToRemove];
        return copy;
      })
    );
  };

  // Add column
  const handleAddColumn = () => {
    const trimmed = newColumnName.trim();
    if (!trimmed || headers.includes(trimmed)) return;
    setHeaders([...headers, trimmed]);
    setRows(rows.map((r) => ({ ...r, [trimmed]: '' })));
    setColumnTypes({ ...columnTypes, [trimmed]: 'Text' });
    setNewColumnName('');
    setShowAddCol(false);
  };

  // Cell edit
  const handleCellChange = (rowIndex: number, colKey: string, value: string) => {
    const updated = [...rows];
    updated[rowIndex] = { ...updated[rowIndex], [colKey]: value };
    setRows(updated);
  };

  // Remove row
  const handleRemoveRow = (rowIndex: number) => {
    setRows(rows.filter((_, idx) => idx !== rowIndex));
  };

  // Change column type
  const handleTypeChange = (colKey: string, newType: InferredColumnInfo['type']) => {
    setColumnTypes({ ...columnTypes, [colKey]: newType });
  };

  const handleFinalSubmit = () => {
    onConfirm(headers, rows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden my-auto"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          color: theme.colors.textPrimary,
        }}
      >
        {/* Header */}
        <div
          className="p-4 sm:p-6 border-b flex items-start justify-between gap-3 shrink-0"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${theme.colors.primary}20`, color: theme.colors.primary }}
              >
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-2xl font-black" style={{ color: theme.colors.primary }}>
                {isAr
                  ? 'فهمت بياناتك بالشكل ده، راجعيها قبل ما نبدأ التحليل.'
                  : 'Here is how we understood your data. Review before we start.'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm font-medium pr-10" style={{ color: `${theme.colors.textPrimary}B8` }}>
              {isAr
                ? 'تقدر تعدل أي خانة، تغير اسم عمود، أو تضيف أو تحذف حسب راحتك.'
                : 'You can edit any cell, rename columns, add or remove fields as you like.'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Confidence or Notes Banner */}
        <div
          className="px-4 sm:px-6 py-2.5 border-b text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2"
          style={{ backgroundColor: `${theme.colors.background}`, borderColor: theme.colors.border }}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-500" />
            <span className="font-semibold text-amber-800 dark:text-amber-300">
              {confidenceReason || (isAr ? 'تم استخراج الجدول تلقائيًا.' : 'Table extracted automatically.')}
            </span>
          </div>
          <button
            onClick={() => setShowHelperMapping(!showHelperMapping)}
            className="text-xs font-bold underline flex items-center gap-1 cursor-pointer transition-colors"
            style={{ color: theme.colors.primary }}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isAr ? 'ساعديني أفهم البيانات' : 'Help clarify data'}</span>
          </button>
        </div>

        {/* Optional Helper Mapping Panel (Fallback only) */}
        {showHelperMapping && (
          <div
            className="p-4 border-b space-y-3 text-xs sm:text-sm animate-in slide-in-from-top-2 duration-150"
            style={{ backgroundColor: `${theme.colors.primary}0A`, borderColor: theme.colors.border }}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: theme.colors.primary }}>
                {isAr ? 'حدد نوع كل عمود بنفسك بكل بساطة:' : 'Clarify what each column represents:'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {headers.map((colKey) => (
                <div
                  key={colKey}
                  className="p-2.5 rounded-xl border flex flex-col gap-1"
                  style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
                >
                  <span className="font-bold truncate text-xs">{colKey}</span>
                  <select
                    value={columnTypes[colKey] || 'Text'}
                    onChange={(e) => handleTypeChange(colKey, e.target.value as any)}
                    className="text-xs p-1 rounded border bg-transparent font-medium focus:outline-none"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <option value="Text">{isAr ? 'نص' : 'Text'}</option>
                    <option value="Number">{isAr ? 'رقم' : 'Number'}</option>
                    <option value="Currency">{isAr ? 'سعر / مالي' : 'Currency'}</option>
                    <option value="Date">{isAr ? 'تاريخ' : 'Date'}</option>
                    <option value="Percentage">{isAr ? 'نسبة مئوية' : 'Percentage'}</option>
                    <option value="Category">{isAr ? 'تصنيف' : 'Category'}</option>
                    <option value="Location">{isAr ? 'مدينة / مكان' : 'Location'}</option>
                    <option value="ID">{isAr ? 'كود / ID' : 'ID'}</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table View with in-place editing */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-bold" style={{ color: theme.colors.textPrimary }}>
              {isAr
                ? `البيانات المكتشفة (${rows.length} صفوف × ${headers.length} أعمدة):`
                : `Detected Data (${rows.length} rows × ${headers.length} columns):`}
            </span>

            {/* Add Column Button */}
            <div className="flex items-center gap-2">
              {showAddCol ? (
                <div className="flex items-center gap-1.5 animate-in fade-in">
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder={isAr ? 'اسم العمود الجديد' : 'Column name'}
                    className="text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none"
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                  />
                  <button
                    onClick={handleAddColumn}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-bold cursor-pointer"
                    style={{ backgroundColor: theme.colors.primary, color: '#FFF9F2' }}
                  >
                    {isAr ? 'إضافة' : 'Add'}
                  </button>
                  <button
                    onClick={() => setShowAddCol(false)}
                    className="text-xs text-gray-500 px-1 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddCol(true)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.primary,
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إضافة عمود' : 'Add Column'}</span>
                </button>
              )}
            </div>
          </div>

          <div
            className="border rounded-xl overflow-x-auto shadow-2xs"
            style={{ borderColor: theme.colors.border }}
          >
            <table className="w-full text-right text-xs sm:text-sm border-collapse min-w-[500px]">
              <thead>
                <tr
                  className="border-b"
                  style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                >
                  <th className="p-2.5 text-center font-mono w-10 text-xs font-normal text-gray-400">#</th>
                  {headers.map((colKey, colIdx) => {
                    const colType = columnTypes[colKey] || 'Text';
                    const typeBadge = TYPE_TRANSLATIONS[colType] || {
                      ar: colType,
                      en: colType,
                      color: '#64748B',
                    };

                    return (
                      <th
                        key={colIdx}
                        className="p-2.5 font-bold border-r last:border-r-0"
                        style={{ borderColor: theme.colors.border }}
                      >
                        <div className="flex items-center justify-between gap-1.5 group">
                          {editingHeaderIndex === colIdx ? (
                            <div className="flex items-center gap-1 w-full">
                              <input
                                type="text"
                                value={tempHeaderName}
                                onChange={(e) => setTempHeaderName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(colIdx)}
                                className="text-xs px-2 py-1 rounded border w-full font-bold focus:outline-none"
                                style={{
                                  backgroundColor: theme.colors.surface,
                                  borderColor: theme.colors.primary,
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRename(colIdx)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="truncate text-xs sm:text-sm">{colKey}</span>
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.2 rounded w-fit inline-block"
                                  style={{
                                    backgroundColor: `${typeBadge.color}18`,
                                    color: typeBadge.color,
                                  }}
                                >
                                  {isAr ? typeBadge.ar : typeBadge.en}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleStartRename(colIdx)}
                                  className="p-1 hover:text-blue-600 rounded"
                                  title={isAr ? 'تعديل اسم العمود' : 'Rename column'}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                {headers.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveColumn(colKey)}
                                    className="p-1 hover:text-red-500 rounded"
                                    title={isAr ? 'حذف العمود' : 'Remove column'}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="p-2.5 text-center w-12 text-xs font-normal text-gray-400"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <td className="p-2 text-center font-mono text-gray-400 text-xs">{rIdx + 1}</td>
                    {headers.map((colKey, cIdx) => (
                      <td
                        key={cIdx}
                        className="p-1.5 border-r last:border-r-0"
                        style={{ borderColor: theme.colors.border }}
                      >
                        <input
                          type="text"
                          value={row[colKey] !== null && row[colKey] !== undefined ? String(row[colKey]) : ''}
                          onChange={(e) => handleCellChange(rIdx, colKey, e.target.value)}
                          className="w-full px-2 py-1 text-xs sm:text-sm rounded bg-transparent hover:bg-black/5 dark:hover:bg-white/5 focus:bg-white dark:focus:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:outline-none border-transparent border font-medium"
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center">
                      <button
                        onClick={() => handleRemoveRow(rIdx)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title={isAr ? 'حذف الصف' : 'Delete row'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0"
          style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
        >
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl border transition-colors cursor-pointer"
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surface,
            }}
          >
            {isAr ? 'رجوع والتعديل على النص' : 'Back & Edit Text'}
          </button>

          <button
            onClick={handleFinalSubmit}
            className="w-full sm:w-auto px-7 py-3 text-sm sm:text-base font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#FFF9F2',
            }}
          >
            <span>{isAr ? 'اعتماد البيانات والبدء' : 'Confirm Data & Start'}</span>
            {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
