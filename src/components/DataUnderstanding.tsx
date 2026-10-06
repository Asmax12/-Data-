import React from 'react';
import {
  CheckCircle,
  FileCheck2,
  Table,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Columns,
  Hash,
  Calendar,
  Layers,
  Info,
} from 'lucide-react';
import { CleanedDataset, ColumnMeta } from '../types';

interface DataUnderstandingProps {
  dataset: CleanedDataset;
  language: 'ar' | 'en';
  onProceedToDashboard: () => void;
  onBack: () => void;
}

export const DataUnderstanding: React.FC<DataUnderstandingProps> = ({
  dataset,
  language,
  onProceedToDashboard,
  onBack,
}) => {
  const isAr = language === 'ar';

  const getRoleBadge = (role: ColumnMeta['inferredRole']) => {
    switch (role) {
      case 'metric':
        return {
          label: isAr ? 'مقياس وحسابات' : 'Metric / Number',
          color: 'text-[#4B315F] bg-[#4B315F]/10',
          icon: Hash,
        };
      case 'time':
        return {
          label: isAr ? 'تاريخ وزمن' : 'Time Dimension',
          color: 'text-[#F4A261] bg-[#F4A261]/15',
          icon: Calendar,
        };
      case 'dimension':
        return {
          label: isAr ? 'تصنيف ومقارنة' : 'Category / Dimension',
          color: 'text-[#E76F7A] bg-[#E76F7A]/15',
          icon: Layers,
        };
      case 'identifier':
        return {
          label: isAr ? 'معرّف فريد' : 'Identifier / ID',
          color: 'text-[#29232D] bg-[#B9A3D4]/20',
          icon: Columns,
        };
      default:
        return {
          label: isAr ? 'نص إضافي' : 'Attribute',
          color: 'text-[#29232D] bg-[#B9A3D4]/20',
          icon: Columns,
        };
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12 space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#B9A3D4]/30 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4B315F]" />
            <span className="text-xs font-bold text-[#4B315F] uppercase tracking-wider">
              {isAr ? 'الخطوة 2: فهم وتنظيم البيانات' : 'Step 2: Understanding Your Data'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#29232D]">
            {isAr ? 'فهمنا بياناتك ونظمناها بنجاح!' : 'We understood and organized your data!'}
          </h2>
          <p className="text-sm text-[#29232D]/70 mt-1">
            {isAr
              ? 'حددنا الأعمدة، نظفنا القيم، واقترحنا أهم الحسابات التلقائية المناسبة.'
              : 'Columns identified, values cleaned, and optimal KPIs calculated.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-white border border-[#B9A3D4]/50 text-[#29232D] hover:bg-[#FFF9F2] transition-colors cursor-pointer"
          >
            {isAr ? 'تغيير البيانات' : 'Change Data'}
          </button>
          <button
            onClick={onProceedToDashboard}
            className="px-6 py-2.5 text-xs font-bold rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span>{isAr ? 'عرض الداشبورد الآن' : 'View Dashboard Now'}</span>
            {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#B9A3D4]/30 shadow-2xs">
          <span className="text-xs text-[#29232D]/60 block mb-1">
            {isAr ? 'عدد السجلات (الصفوف)' : 'Total Records (Rows)'}
          </span>
          <span className="text-2xl font-bold text-[#4B315F] font-mono">
            {dataset.totalRows}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#B9A3D4]/30 shadow-2xs">
          <span className="text-xs text-[#29232D]/60 block mb-1">
            {isAr ? 'الأعمدة المكتشفة' : 'Identified Columns'}
          </span>
          <span className="text-2xl font-bold text-[#4B315F] font-mono">
            {dataset.totalColumns}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#B9A3D4]/30 shadow-2xs">
          <span className="text-xs text-[#29232D]/60 block mb-1">
            {isAr ? 'القيم التي تم تنظيمها' : 'Cleaned Values'}
          </span>
          <span className="text-2xl font-bold text-[#F4A261] font-mono">
            {dataset.cleaningSummary.missingValuesFixed}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#B9A3D4]/30 shadow-2xs">
          <span className="text-xs text-[#29232D]/60 block mb-1">
            {isAr ? 'حالة جودة البيانات' : 'Data Integrity'}
          </span>
          <span className="text-base font-bold text-[#4B315F] flex items-center gap-1.5 mt-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {isAr ? 'جاهزة 100%' : '100% Ready'}
          </span>
        </div>
      </div>

      {/* Cleaning Notes Box */}
      <div className="bg-[#FFF9F2] border border-[#F4A261]/40 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#F4A261] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-[#4B315F] block">
            {isAr ? 'ما تم تنفيذه تلقائيًا:' : 'Automatic actions taken:'}
          </span>
          {dataset.cleaningSummary.notes.map((note, idx) => (
            <p key={idx} className="text-[#29232D]/80">
              • {note}
            </p>
          ))}
        </div>
      </div>

      {/* Identified Columns Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#4B315F] flex items-center gap-2">
          <Columns className="w-4 h-4" />
          {isAr ? 'الأعمدة التي تم التعرف عليها وفهمها:' : 'Columns Understood:'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dataset.columns.map((col) => {
            const badge = getRoleBadge(col.inferredRole);
            const Icon = badge.icon;
            return (
              <div
                key={col.key}
                className="bg-white p-3.5 rounded-xl border border-[#B9A3D4]/30 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#29232D] truncate max-w-[140px]">
                    {col.label}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${badge.color}`}
                  >
                    <Icon className="w-3 h-3" />
                    {badge.label}
                  </span>
                </div>

                <div className="text-[11px] text-[#29232D]/60 flex items-center justify-between font-mono">
                  <span>
                    {isAr ? `${col.uniqueCount} قيمة فريدة` : `${col.uniqueCount} unique`}
                  </span>
                  {col.sum !== undefined && (
                    <span className="text-[#4B315F] font-semibold">
                      {isAr ? `المجموع: ${Math.round(col.sum).toLocaleString('ar-EG')}` : `Sum: ${Math.round(col.sum).toLocaleString()}`}
                    </span>
                  )}
                </div>

                {/* Sample values */}
                <div className="text-[11px] text-[#29232D]/70 bg-[#FFF9F2] px-2 py-1 rounded truncate font-mono">
                  {col.sampleValues.slice(0, 3).join(' · ') || '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sample 5-row preview table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#4B315F] flex items-center gap-2">
          <Table className="w-4 h-4" />
          {isAr ? 'معاينة عينة من البيانات بعد التنظيم:' : 'Preview Sample Cleaned Data:'}
        </h3>

        <div className="bg-white rounded-xl border border-[#B9A3D4]/30 overflow-x-auto shadow-2xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FFF9F2] text-[#4B315F] border-b border-[#B9A3D4]/30 font-bold">
              <tr>
                {dataset.columns.map((c) => (
                  <th key={c.key} className="px-3.5 py-2.5 whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B9A3D4]/20 text-[#29232D]">
              {dataset.rows.slice(0, 5).map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#FFF9F2]/50 transition-colors">
                  {dataset.columns.map((c) => (
                    <td
                      key={c.key}
                      className="px-3.5 py-2 whitespace-nowrap font-mono text-[11px]"
                    >
                      {row[c.key] !== null ? String(row[c.key]) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center pt-4">
        <button
          onClick={onProceedToDashboard}
          className="px-8 py-3 text-sm font-bold rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
        >
          <span>{isAr ? 'كل حاجة جاهزة! افتح الداشبورد' : 'Everything is ready! Open Dashboard'}</span>
          {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
