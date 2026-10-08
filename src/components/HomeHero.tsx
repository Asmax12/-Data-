import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Table,
  PenTool,
  Wand2,
} from 'lucide-react';
import { parseSpreadsheetBuffer, processAndCleanData } from '../utils/dataParser';
import { intelligentParseRawText, SmartParseResult } from '../utils/naturalDataParser';
import { parseUnstructuredTextWithAI } from '../services/aiService';
import { CleanedDataset } from '../types';
import { useTheme } from '../context/ThemeContext';
import { DataConfirmationModal } from './DataConfirmationModal';

interface HomeHeroProps {
  language: 'ar' | 'en';
  onDatasetReady: (dataset: CleanedDataset) => void;
  hasActiveDataset?: boolean;
  onReturnToDashboard?: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  language,
  onDatasetReady,
  hasActiveDataset = false,
  onReturnToDashboard,
}) => {
  const { theme } = useTheme();
  const isAr = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default mode is 'manual' ("اكتب بياناتك بطريقتك، وإحنا هنرتبها")
  const [inputMode, setInputMode] = useState<'manual' | 'upload'>('manual');
  const [manualText, setManualText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // State for Review & Confirmation Modal when ambiguous
  const [confirmationData, setConfirmationData] = useState<{
    isOpen: boolean;
    headers: string[];
    rows: Record<string, any>[];
    columnTypes: Record<string, any>;
    confidenceReason?: string;
    cleaningNotes?: string[];
  } | null>(null);

  // Handle file selection
  const handleFile = async (file: File) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const buffer = await file.arrayBuffer();
      const { headers, rows } = parseSpreadsheetBuffer(buffer, file.name);

      if (rows.length === 0) {
        throw new Error(isAr ? 'الملف لا يحتوي على صفوف بيانات صالحة' : 'The file contains no data rows');
      }

      const dataset = processAndCleanData(headers, rows, file.name.replace(/\.[^/.]+$/, ''));
      onDatasetReady(dataset);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message ||
          (isAr
            ? 'تعذر قراءة هذا الملف. يرجى التأكد من أنه ملف Excel أو CSV صالح.'
            : 'Could not read file. Please ensure it is a valid Excel or CSV.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Handle natural text submission
  const handleNaturalTextSubmit = async () => {
    if (!manualText.trim()) {
      setErrorMessage(
        isAr ? 'يرجى كتابة أو لصق البيانات بأي شكل يناسبك أولاً' : 'Please type or paste your data first'
      );
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      // 1. Run generic intelligent local parser first
      let localResult: SmartParseResult = intelligentParseRawText(manualText);

      // 2. If confidence is low or single-column/unstructured, attempt smart AI extraction
      if (!localResult.isConfident || localResult.rows.length === 0 || localResult.headers.length <= 1) {
        const aiParsed = await parseUnstructuredTextWithAI(manualText, language);
        if (aiParsed && aiParsed.rows && aiParsed.rows.length > 0) {
          localResult = {
            headers: aiParsed.headers,
            rows: aiParsed.rows,
            columnTypes: aiParsed.columnTypes || localResult.columnTypes,
            isConfident: aiParsed.isConfident !== undefined ? aiParsed.isConfident : true,
            confidenceScore: aiParsed.confidenceScore || 0.85,
            confidenceReason: aiParsed.confidenceReason || (isAr ? 'تم استخراج البيانات بذكاء من النص.' : 'Data extracted smartly from text.'),
            cleaningNotes: aiParsed.notes || localResult.cleaningNotes,
          };
        }
      }

      if (!localResult.rows || localResult.rows.length === 0) {
        throw new Error(
          isAr
            ? 'لم نتمكن من استخراج بيانات واضحة من النص. جرّب كتابة أو لصق أسطر تحتوي على تفاصيل أو قيم.'
            : 'Could not extract clear data from text. Please try pasting records or values.'
        );
      }

      // 3. AI / System confidence decision:
      // If confident -> auto-organize into dataset and proceed
      // If uncertain or ambiguous -> show confirmation screen for user review/edit
      if (localResult.isConfident && localResult.confidenceScore >= 0.75) {
        const dataset = processAndCleanData(
          localResult.headers,
          localResult.rows,
          isAr ? 'بياناتي المدخلة' : 'My Input Data'
        );
        // Append cleaning notes
        if (localResult.cleaningNotes && localResult.cleaningNotes.length > 0) {
          dataset.cleaningSummary.notes = [
            ...localResult.cleaningNotes,
            ...dataset.cleaningSummary.notes,
          ];
        }
        onDatasetReady(dataset);
      } else {
        // Show confirmation modal
        setConfirmationData({
          isOpen: true,
          headers: localResult.headers,
          rows: localResult.rows,
          columnTypes: localResult.columnTypes,
          confidenceReason: localResult.confidenceReason,
          cleaningNotes: localResult.cleaningNotes,
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // User confirmed the data from confirmation modal
  const handleModalConfirm = (confirmedHeaders: string[], confirmedRows: Record<string, any>[]) => {
    const dataset = processAndCleanData(
      confirmedHeaders,
      confirmedRows,
      isAr ? 'بياناتي المدخلة' : 'My Input Data'
    );
    if (confirmationData?.cleaningNotes && confirmationData.cleaningNotes.length > 0) {
      dataset.cleaningSummary.notes = [
        ...confirmationData.cleaningNotes,
        ...dataset.cleaningSummary.notes,
      ];
    }
    setConfirmationData(null);
    onDatasetReady(dataset);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-8 lg:py-14 space-y-6 sm:space-y-10">
      {/* Return to Active Dashboard Banner if one exists */}
      {hasActiveDataset && onReturnToDashboard && (
        <div
          className="rounded-2xl p-4 sm:p-4.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-3.5 shadow-xs animate-fade-in border"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.secondary,
          }}
        >
          <div className="flex items-center gap-3 sm:gap-3.5 text-right">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: theme.colors.primary,
                color: '#FFF9F2',
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: theme.colors.secondary }} />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold" style={{ color: theme.colors.primary }}>
                {isAr ? 'لديك تحليل ولوحة بيانات نشطة محفوظة!' : 'You have an active dashboard ready!'}
              </p>
              <p className="text-xs sm:text-sm font-medium" style={{ color: `${theme.colors.textPrimary}B0` }}>
                {isAr
                  ? 'يمكنك متابعة العمل عليها أو إدخال بيانات أخرى جديدة أدناه.'
                  : 'Resume where you left off or upload new data below.'}
              </p>
            </div>
          </div>
          <button
            onClick={onReturnToDashboard}
            className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 text-sm sm:text-base font-bold rounded-xl transition-all flex items-center gap-2 shadow-2xs cursor-pointer shrink-0"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#FFF9F2',
            }}
          >
            <span>{isAr ? 'العودة إلى لوحة البيانات' : 'Return to Dashboard'}</span>
            {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Hero Headline and description */}
      <div className="text-center space-y-3 sm:space-y-4.5 max-w-2xl mx-auto px-1">
        <h1
          className="text-2xl min-[380px]:text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-snug sm:leading-tight"
          style={{ color: theme.colors.primary }}
        >
          {isAr ? 'عندك بيانات؟ اكتبها بطريقتك.' : 'Got Data? Write it your way.'}
        </h1>
        <p
          className="text-sm min-[380px]:text-base sm:text-xl lg:text-2xl leading-relaxed font-normal"
          style={{ color: `${theme.colors.textPrimary}D9` }}
        >
          {isAr
            ? 'اكتب أو الصق بياناتك بأي شكل مناسب ليك، وإحنا هنحاول نفهمها ونرتبها قبل التحليل.'
            : 'Type or paste your data in any form that suits you, and we will understand and organize it before analysis.'}
        </p>

        {/* Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3.5 pt-2">
          <button
            onClick={() => setInputMode('manual')}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-lg font-bold rounded-xl transition-all cursor-pointer shadow-xs border"
            style={{
              backgroundColor: inputMode === 'manual' ? theme.colors.primary : theme.colors.surface,
              color: inputMode === 'manual' ? '#FFF9F2' : theme.colors.textPrimary,
              borderColor: inputMode === 'manual' ? theme.colors.primary : theme.colors.border,
            }}
          >
            <span className="flex items-center justify-center gap-2 sm:gap-2.5">
              <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />
              {isAr ? 'اكتب بياناتك بطريقتك' : 'Write your data naturally'}
            </span>
          </button>

          <button
            onClick={() => setInputMode('upload')}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-lg font-bold rounded-xl transition-all cursor-pointer shadow-xs border"
            style={{
              backgroundColor: inputMode === 'upload' ? theme.colors.primary : theme.colors.surface,
              color: inputMode === 'upload' ? '#FFF9F2' : theme.colors.textPrimary,
              borderColor: inputMode === 'upload' ? theme.colors.primary : theme.colors.border,
            }}
          >
            <span className="flex items-center justify-center gap-2 sm:gap-2.5">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              {isAr ? 'رفع ملف Excel أو CSV' : 'Upload Excel / CSV file'}
            </span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div
          className="px-3.5 sm:px-4.5 py-3 rounded-xl text-sm sm:text-base flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border"
          style={{
            backgroundColor: `${theme.colors.danger}15`,
            borderColor: theme.colors.danger,
            color: theme.colors.textPrimary,
          }}
        >
          <span className="font-medium">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-sm font-bold underline cursor-pointer shrink-0"
            style={{ color: theme.colors.primary }}
          >
            {isAr ? 'إغلاق' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Main Box: Natural Text Input (Default) or File Upload */}
      <div
        className="rounded-2xl border shadow-xs p-3.5 sm:p-9 relative overflow-hidden transition-all"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        {inputMode === 'manual' ? (
          /* Primary Experience: "اكتب بياناتك بطريقتك، وإحنا هنرتبها." */
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="block text-sm sm:text-lg font-black" style={{ color: theme.colors.primary }}>
                  {isAr ? 'اكتب بياناتك بطريقتك، وإحنا هنرتبها:' : 'Write your data naturally, we organize it:'}
                </label>
                <span className="text-xs sm:text-sm font-medium" style={{ color: `${theme.colors.textPrimary}99` }}>
                  {isAr
                    ? 'جدول، أسطر، نص مفصول بمسافات أو فواصل، عبارات، أو Markdown'
                    : 'Table, lines, separated text, sentences, or Markdown'}
                </span>
              </div>

              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={7}
                placeholder={
                  isAr
                    ? 'اكتب أو الصق بياناتك هنا بأي شكل مريح ليك...\n\nأمثلة:\n- جدول أو أسطر: أحمد 3000 القاهرة، سارة 4500 الإسكندرية\n- أو بفاصلة: الطالب, الدرجة, المادة\n- أو كعبارات: العميل محمد اشترى لابتوب بسعر 25000\n- أو جدول منسوخ من أي مكان أو صفوف Markdown'
                    : 'Type or paste your data here in any format...\n\nExamples:\n- Ahmed 3000 Cairo\n- Sara 4500 Alexandria\n- Or simple table, Markdown, or pasted text from anywhere'
                }
                className="w-full p-3.5 sm:p-5 text-xs sm:text-base font-mono rounded-xl focus:outline-none focus:ring-2 font-medium border leading-relaxed"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                }}
              />
            </div>

            {/* Submit Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div
                className="flex items-center gap-2 text-xs sm:text-sm font-medium"
                style={{ color: `${theme.colors.textPrimary}A0` }}
              >
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {isAr
                    ? 'الذكاء بيفهم الأعمدة والأنواع تلقائيًا، وممكن تراجعها قبل التحليل.'
                    : 'Auto-detects columns & types, with a quick review if needed.'}
                </span>
              </div>

              <button
                onClick={handleNaturalTextSubmit}
                disabled={isProcessing}
                className="w-full sm:w-auto justify-center px-7 sm:px-9 py-3 sm:py-3.5 text-sm sm:text-lg font-black rounded-xl transition-all shadow-md inline-flex items-center gap-2.5 cursor-pointer disabled:opacity-50 shrink-0"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: '#FFF9F2',
                }}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isAr ? 'جاري الفهم والترتيب...' : 'Understanding & Organizing...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isAr ? 'رتّب وابدأ التحليل' : 'Organize & Start Analysis'}</span>
                    {isAr ? <ArrowLeft className="w-4.5 h-4.5" /> : <ArrowRight className="w-4.5 h-4.5" />}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* File Upload Mode (Preserved) */
          <div
            className="border-2 border-dashed rounded-xl p-4 sm:p-12 text-center transition-all cursor-pointer"
            style={{
              borderColor: dragActive ? theme.colors.primary : theme.colors.borderAccent,
              backgroundColor: dragActive ? `${theme.colors.primary}0D` : `${theme.colors.background}80`,
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center gap-3 sm:gap-4.5">
              <div
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: `${theme.colors.primary}18`,
                  color: theme.colors.primary,
                }}
              >
                {isProcessing ? (
                  <div
                    className="w-6 h-6 sm:w-7 sm:h-7 border-3 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: theme.colors.primary, borderTopColor: 'transparent' }}
                  />
                ) : (
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8" />
                )}
              </div>

              <div>
                <p className="text-base sm:text-xl font-bold mb-1 sm:mb-1.5" style={{ color: theme.colors.textPrimary }}>
                  {isAr
                    ? 'اسحب ملف Excel أو CSV هنا، أو اضغط للاختيار'
                    : 'Drop your Excel or CSV file here, or click to browse'}
                </p>
                <p className="text-xs sm:text-base font-medium" style={{ color: `${theme.colors.textPrimary}B0` }}>
                  {isAr
                    ? 'يدعم صيغ .xlsx و .xls و .csv و .txt — بنظبط الأعمدة والأرقام تلقائيًا'
                    : 'Supports .xlsx, .xls, .csv, .txt — columns & numbers auto-cleaned'}
                </p>
              </div>

              <div
                className="flex flex-wrap items-center justify-center gap-2 sm:gap-5 text-xs sm:text-sm pt-2 font-bold"
                style={{ color: theme.colors.primary }}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: theme.colors.secondary }} />
                  {isAr ? 'كشف الأعمدة الذكي' : 'Smart Column Detection'}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: theme.colors.secondary }} />
                  {isAr ? 'تنظيف القيم المفقودة' : 'Auto Cleaning'}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: theme.colors.secondary }} />
                  {isAr ? 'داشبورد فورية' : 'Instant Dashboard'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal when data structure was ambiguous */}
      {confirmationData && (
        <DataConfirmationModal
          isOpen={confirmationData.isOpen}
          isAr={isAr}
          initialHeaders={confirmationData.headers}
          initialRows={confirmationData.rows}
          initialColumnTypes={confirmationData.columnTypes}
          confidenceReason={confirmationData.confidenceReason}
          cleaningNotes={confirmationData.cleaningNotes}
          onConfirm={handleModalConfirm}
          onCancel={() => setConfirmationData(null)}
        />
      )}
    </div>
  );
};
