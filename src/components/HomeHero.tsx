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
} from 'lucide-react';
import { parseSpreadsheetBuffer, parseRawTextTable, processAndCleanData } from '../utils/dataParser';
import { parseUnstructuredTextWithAI } from '../services/aiService';
import { CleanedDataset } from '../types';
import { useTheme } from '../context/ThemeContext';

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

  const [inputMode, setInputMode] = useState<'upload' | 'manual'>('upload');
  const [manualText, setManualText] = useState('');
  const [userPrompt, setUserPrompt] = useState(
    'عندي بيانات مبيعات فيها العميل، والمدينة، والمنتج، والسعر، والكمية، والتاريخ. نظمها واعملي داشبورد.'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

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

  // Handle manual text / table submission
  const handleManualSubmit = async () => {
    if (!manualText.trim()) {
      setErrorMessage(isAr ? 'يرجى كتابة أو لصق البيانات أولاً' : 'Please paste or type data first');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      // 1. Try deterministic local parsing first (preserves API limits and works offline)
      let parsed = parseRawTextTable(manualText);

      // 2. Only if local parsing found zero rows or unstructured text, try AI
      if (!parsed.rows || parsed.rows.length === 0 || (parsed.headers.length === 1 && !manualText.includes(','))) {
        const aiParsed = await parseUnstructuredTextWithAI(manualText, language);
        if (aiParsed && aiParsed.rows.length > 0) {
          parsed = aiParsed;
        }
      }

      if (!parsed.rows || parsed.rows.length === 0) {
        throw new Error(
          isAr
            ? 'لم نتمكن من استخراج بيانات واضحة من النص. يرجى تجربة لصق جدول أو ملف.'
            : 'Could not extract clean data from text. Try pasting a table or file.'
        );
      }

      const dataset = processAndCleanData(
        parsed.headers,
        parsed.rows,
        isAr ? 'بيانات مدخلة يدويًا' : 'Manual Input Data'
      );

      onDatasetReady(dataset);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
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
          {isAr ? 'عندك بيانات؟ سيب الباقي علينا.' : 'Got Data? Leave the rest to us.'}
        </h1>
        <p
          className="text-sm min-[380px]:text-base sm:text-xl lg:text-2xl leading-relaxed font-normal"
          style={{ color: `${theme.colors.textPrimary}D9` }}
        >
          {isAr
            ? 'ارفع بياناتك أو اكتبها بطريقتك، وإحنا ننظمها ونحللها ونحوّلها لداشبورد واضحة من غير ما تحتاج تعرف Excel.'
            : 'Upload your data or type it in your own words. We clean, organize, and turn it into a clear interactive dashboard without you needing to know Excel.'}
        </p>

        {/* Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3.5 pt-2">
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
              {isAr ? 'ابدأ التحليل' : 'Start Analysis (Upload)'}
            </span>
          </button>

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
              <Table className="w-4 h-4 sm:w-5 sm:h-5" />
              {isAr ? 'أدخل البيانات يدويًا' : 'Enter Data Manually'}
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

      {/* Main Box: File Upload or Manual Input */}
      <div
        className="rounded-2xl border shadow-xs p-3.5 sm:p-9 relative overflow-hidden transition-all"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        {inputMode === 'upload' ? (
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
        ) : (
          /* Manual Input Mode */
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm sm:text-base font-bold mb-2" style={{ color: theme.colors.textPrimary }}>
                {isAr ? 'الصق جدولك أو اكتب بياناتك كنص عادي:' : 'Paste table or raw text:'}
              </label>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={5}
                placeholder={
                  isAr
                    ? 'العميل, المدينة, المنتج, السعر, الكمية, التاريخ\nأحمد, القاهرة, لابتوب, 30000, 2, 2024-01-15\nسارة, الإسكندرية, سماعة, 2500, 3, 2024-01-18...'
                    : 'Customer, City, Product, Price, Quantity, Date\nAhmed, Cairo, Laptop, 30000, 2, 2024-01-15\nSara, Alexandria, Headset, 2500, 3, 2024-01-18...'
                }
                className="w-full p-3 sm:p-4 text-xs sm:text-base font-mono rounded-xl focus:outline-none focus:ring-2 font-medium border"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                }}
              />
            </div>

            {/* Optional Natural Prompt */}
            <div>
              <label className="block text-sm sm:text-base font-bold mb-1.5" style={{ color: theme.colors.primary }}>
                {isAr ? 'عايز تعمل إيه بالبيانات؟ (بلغتك العادية):' : 'What do you want to achieve? (natural language):'}
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full flex-1 px-3.5 sm:px-4 py-2.5 text-sm sm:text-base rounded-xl focus:outline-none focus:ring-2 font-medium border"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  }}
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={isProcessing}
                  className="w-full sm:w-auto justify-center px-6 py-2.5 text-sm sm:text-base font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: '#FFF9F2',
                  }}
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isAr ? 'تنظيم وتحليل' : 'Process & Analyze'}</span>
                      {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
