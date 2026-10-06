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
  Zap,
} from 'lucide-react';
import { SAMPLE_DATASETS } from '../constants/sampleData';
import { parseSpreadsheetBuffer, parseRawTextTable, processAndCleanData } from '../utils/dataParser';
import { parseUnstructuredTextWithAI } from '../services/aiService';
import { CleanedDataset } from '../types';

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

  // Load sample dataset
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId);
    if (!sample) return;

    try {
      setIsProcessing(true);
      const parsed = parseRawTextTable(sample.rawCsv);
      const dataset = processAndCleanData(
        parsed.headers,
        parsed.rows,
        isAr ? sample.titleAr : sample.titleEn
      );
      onDatasetReady(dataset);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-14 space-y-10">
      {/* Return to Active Dashboard Banner if one exists */}
      {hasActiveDataset && onReturnToDashboard && (
        <div className="bg-white/80 border border-[#F4A261] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3 text-right">
            <div className="w-8 h-8 rounded-xl bg-[#4B315F] text-[#FFF9F2] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#F4A261]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#4B315F]">
                {isAr ? 'لديك تحليل ولوحة بيانات نشطة محفوظة!' : 'You have an active dashboard ready!'}
              </p>
              <p className="text-[11px] text-[#29232D]/60">
                {isAr
                  ? 'يمكنك متابعة العمل عليها أو إدخال بيانات أخرى جديدة أدناه.'
                  : 'Resume where you left off or upload new data below.'}
              </p>
            </div>
          </div>
          <button
            onClick={onReturnToDashboard}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
          >
            <span>{isAr ? 'العودة إلى لوحة البيانات' : 'Return to Dashboard'}</span>
            {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Hero Headline and description */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#4B315F] tracking-tight leading-tight">
          {isAr ? 'عندك بيانات؟ سيب الباقي علينا.' : 'Got Data? Leave the rest to us.'}
        </h1>
        <p className="text-base sm:text-lg text-[#29232D]/80 leading-relaxed font-normal">
          {isAr
            ? 'ارفع بياناتك أو اكتبها بطريقتك، وإحنا ننظمها ونحللها ونحوّلها لداشبورد واضحة من غير ما تحتاج تعرف Excel.'
            : 'Upload your data or type it in your own words. We clean, organize, and turn it into a clear interactive dashboard without you needing to know Excel.'}
        </p>

        {/* Mode Switcher */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setInputMode('upload')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              inputMode === 'upload'
                ? 'bg-[#4B315F] text-[#FFF9F2] shadow-sm'
                : 'bg-white/80 text-[#29232D] hover:bg-white border border-[#B9A3D4]/40'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              {isAr ? 'ابدأ التحليل' : 'Start Analysis (Upload)'}
            </span>
          </button>

          <button
            onClick={() => setInputMode('manual')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              inputMode === 'manual'
                ? 'bg-[#4B315F] text-[#FFF9F2] shadow-sm'
                : 'bg-white/80 text-[#29232D] hover:bg-white border border-[#B9A3D4]/40'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Table className="w-4 h-4" />
              {isAr ? 'أدخل البيانات يدويًا' : 'Enter Data Manually'}
            </span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="bg-[#E76F7A]/15 border border-[#E76F7A] text-[#29232D] px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold underline cursor-pointer text-[#4B315F]"
          >
            {isAr ? 'إغلاق' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Main Box: File Upload or Manual Input */}
      <div className="bg-white rounded-2xl border border-[#B9A3D4]/40 shadow-xs p-6 sm:p-8 relative overflow-hidden transition-all">
        {inputMode === 'upload' ? (
          <div
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-[#4B315F] bg-[#4B315F]/5'
                : 'border-[#B9A3D4]/60 hover:border-[#4B315F] bg-[#FFF9F2]/50'
            }`}
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

            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#4B315F]/10 text-[#4B315F] flex items-center justify-center">
                {isProcessing ? (
                  <div className="w-6 h-6 border-2 border-[#4B315F] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>

              <div>
                <p className="text-base font-bold text-[#29232D] mb-1">
                  {isAr
                    ? 'اسحب ملف Excel أو CSV هنا، أو اضغط للاختيار'
                    : 'Drop your Excel or CSV file here, or click to browse'}
                </p>
                <p className="text-xs text-[#29232D]/60">
                  {isAr
                    ? 'يدعم صيغ .xlsx و .xls و .csv و .txt — بنظبط الأعمدة والأرقام تلقائيًا'
                    : 'Supports .xlsx, .xls, .csv, .txt — columns & numbers auto-cleaned'}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#4B315F]/80 pt-2 font-medium">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#F4A261]" />
                  {isAr ? 'كشف الأعمدة الذكي' : 'Smart Column Detection'}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#F4A261]" />
                  {isAr ? 'تنظيف القيم المفقودة' : 'Auto Cleaning'}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#F4A261]" />
                  {isAr ? 'داشبورد فورية' : 'Instant Dashboard'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Manual Input Mode */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#29232D] mb-1.5">
                {isAr ? 'الصق جدولك أو اكتب بياناتك كنص عادي:' : 'Paste table or raw text:'}
              </label>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={6}
                placeholder={
                  isAr
                    ? 'العميل, المدينة, المنتج, السعر, الكمية, التاريخ\nأحمد, القاهرة, لابتوب, 30000, 2, 2024-01-15\nسارة, الإسكندرية, سماعة, 2500, 3, 2024-01-18...'
                    : 'Customer, City, Product, Price, Quantity, Date\nAhmed, Cairo, Laptop, 30000, 2, 2024-01-15\nSara, Alexandria, Headset, 2500, 3, 2024-01-18...'
                }
                className="w-full p-3.5 text-xs font-mono bg-[#FFF9F2] border border-[#B9A3D4]/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B315F] text-[#29232D]"
              />
            </div>

            {/* Optional Natural Prompt */}
            <div>
              <label className="block text-xs font-bold text-[#4B315F] mb-1">
                {isAr ? 'عايز تعمل إيه بالبيانات؟ (بلغتك العادية):' : 'What do you want to achieve? (natural language):'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-white border border-[#B9A3D4]/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B315F] text-[#29232D]"
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-[#4B315F] text-[#FFF9F2] text-xs font-bold rounded-xl hover:bg-[#4B315F]/90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isAr ? 'تنظيم وتحليل' : 'Process & Analyze'}</span>
                      {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 1-Click Ready Sample Datasets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#4B315F] flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#F4A261]" />
            {isAr ? 'أو جرب بنقرة واحدة على بيانات جاهزة:' : 'Or try with 1-click sample data:'}
          </h2>
          <span className="text-xs text-[#29232D]/60">
            {isAr ? 'جاهزة للاختبار الفوري' : 'Ready for instant demo'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {SAMPLE_DATASETS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleLoadSample(sample.id)}
              disabled={isProcessing}
              className="text-right p-4 rounded-xl bg-white border border-[#B9A3D4]/30 hover:border-[#4B315F] hover:shadow-sm transition-all text-start cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#4B315F] group-hover:text-[#F4A261] transition-colors">
                  {isAr ? sample.titleAr : sample.titleEn}
                </span>
                <span className="text-[10px] bg-[#FFF9F2] text-[#4B315F] border border-[#B9A3D4]/30 px-2 py-0.5 rounded-md font-medium">
                  {sample.category}
                </span>
              </div>
              <p className="text-xs text-[#29232D]/70 line-clamp-2 leading-relaxed">
                {isAr ? sample.descriptionAr : sample.descriptionEn}
              </p>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#4B315F]">
                <span>{isAr ? 'تحميل وعرض الداشبورد' : 'Load and preview'}</span>
                {isAr ? <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
