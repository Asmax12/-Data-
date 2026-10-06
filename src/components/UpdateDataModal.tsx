import React, { useState, useRef } from 'react';
import { X, Upload, Table, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { CleanedDataset } from '../types';
import { parseSpreadsheetBuffer, parseRawTextTable, processAndCleanData } from '../utils/dataParser';

interface UpdateDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDataset: CleanedDataset;
  language: 'ar' | 'en';
  onUpdateSuccess: (updatedDataset: CleanedDataset, isAppend: boolean) => void;
}

export const UpdateDataModal: React.FC<UpdateDataModalProps> = ({
  isOpen,
  onClose,
  currentDataset,
  language,
  onUpdateSuccess,
}) => {
  if (!isOpen) return null;

  const isAr = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [pasteText, setPasteText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compare columns and update dataset
  const processIncomingData = (rawHeaders: string[], rawRows: any[], fileName: string) => {
    // Current headers
    const currentKeys = new Set(currentDataset.columns.map((c) => c.key.toLowerCase()));
    const matchingCount = rawHeaders.filter((h) => currentKeys.has(h.toLowerCase())).length;

    let finalRows = rawRows;
    if (mode === 'append') {
      finalRows = [...currentDataset.rows, ...rawRows];
    }

    const updated = processAndCleanData(
      rawHeaders,
      finalRows,
      mode === 'append' ? `${currentDataset.name} (مُحدث)` : fileName
    );

    onUpdateSuccess(updated, mode === 'append');
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const buffer = await file.arrayBuffer();
      const { headers, rows } = parseSpreadsheetBuffer(buffer, file.name);

      if (rows.length === 0) {
        throw new Error(isAr ? 'الملف لا يحتوي على بيانات' : 'The file contains no data');
      }

      processIncomingData(headers, rows, file.name.replace(/\.[^/.]+$/, ''));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || (isAr ? 'تعذر قراءة الملف' : 'Could not read file'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const { headers, rows } = parseRawTextTable(pasteText);
      if (rows.length === 0) {
        throw new Error(isAr ? 'البيانات المدخلة غير صالحة' : 'Invalid data provided');
      }
      processIncomingData(headers, rows, isAr ? 'بيانات محدثة' : 'Updated Data');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#B9A3D4]/40 shadow-xl max-w-lg w-full p-6 space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#B9A3D4]/25">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4B315F] text-[#FFF9F2] flex items-center justify-center">
              <RefreshCw className="w-4.5 h-4.5 text-[#F4A261]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#4B315F]">
                {isAr ? 'تحديث الداشبورد ببيانات جديدة' : 'Update Dashboard with New Data'}
              </h3>
              <p className="text-xs sm:text-sm text-[#29232D]/75 font-medium">
                {isAr
                  ? 'احتفظ بنفس تصميم ومؤشرات الداشبورد مع تطبيق البيانات الجديدة'
                  : 'Keep your exact dashboard logic and layout while refreshing data'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#FFF9F2] text-[#29232D]/60 hover:text-[#29232D] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector: Replace vs Append */}
        <div className="grid grid-cols-2 gap-2 bg-[#FFF9F2] p-1.5 rounded-xl border border-[#B9A3D4]/30 text-sm">
          <button
            onClick={() => setMode('replace')}
            className={`py-2.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
              mode === 'replace'
                ? 'bg-white text-[#4B315F] shadow-xs ring-1 ring-[#4B315F]/20'
                : 'text-[#29232D]/70 hover:text-[#29232D]'
            }`}
          >
            {isAr ? 'استبدال البيانات القديمة' : 'Replace Old Data'}
          </button>
          <button
            onClick={() => setMode('append')}
            className={`py-2.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
              mode === 'append'
                ? 'bg-white text-[#4B315F] shadow-xs ring-1 ring-[#4B315F]/20'
                : 'text-[#29232D]/70 hover:text-[#29232D]'
            }`}
          >
            {isAr ? 'إضافة صفوف جديدة (دمج)' : 'Append New Rows'}
          </button>
        </div>

        {errorMsg && (
          <div className="text-sm bg-[#E76F7A]/15 text-[#29232D] border border-[#E76F7A] p-3 rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* Upload File Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#B9A3D4]/60 hover:border-[#4B315F] rounded-xl p-6 text-center cursor-pointer bg-[#FFF9F2]/40 transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <Upload className="w-9 h-9 text-[#4B315F] mx-auto mb-2 opacity-80" />
          <p className="text-sm sm:text-base font-bold text-[#29232D]">
            {isAr
              ? 'اضغط لاختيار ملف البيانات الجديد (Excel / CSV)'
              : 'Click to select new data file (Excel / CSV)'}
          </p>
          <p className="text-xs sm:text-sm text-[#29232D]/70 mt-1 font-medium">
            {isAr
              ? `يفضل أن يحتوي على نفس الأعمدة: ${currentDataset.columns.map((c) => c.label).slice(0, 4).join('، ')}...`
              : `Matching columns: ${currentDataset.columns.map((c) => c.label).slice(0, 4).join(', ')}...`}
          </p>
        </div>

        {/* Or Paste */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-bold text-[#29232D] block">
            {isAr ? 'أو الصق البيانات الجديدة هنا مباشرة:' : 'Or paste new data directly:'}
          </label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={3}
            placeholder={isAr ? 'الصق الجدول أو الصفوف الإضافية...' : 'Paste rows...'}
            className="w-full p-3 text-sm font-mono bg-[#FFF9F2] border border-[#B9A3D4]/40 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4B315F] font-medium"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm sm:text-base font-bold rounded-xl bg-white border border-[#B9A3D4]/50 text-[#29232D] hover:bg-[#FFF9F2] cursor-pointer"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handlePasteSubmit}
            disabled={isProcessing || !pasteText.trim()}
            className="px-6 py-2.5 text-sm sm:text-base font-bold rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {isProcessing ? 'جاري التحديث...' : isAr ? 'تحديث الداشبورد' : 'Update Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
};
