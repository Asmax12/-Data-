import React from 'react';
import {
  CheckCircle,
  Table,
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-[#B9A3D4]/30 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="w-3 h-3 rounded-full bg-[#4B315F]" />
            <span className="text-sm sm:text-base font-bold text-[#4B315F] uppercase tracking-wider">
              {isAr ? 'الخطوة 2: فهم وتنظيم البيانات' : 'Step 2: Understanding Your Data'}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#29232D] tracking-tight">
            {isAr ? 'فهمنا بياناتك ونظمناها بنجاح!' : 'We understood and organized your data!'}
          </h2>
          <p className="text-base sm:text-lg text-[#29232D]/80 mt-1.5 font-medium">
            {isAr
              ? 'حددنا الأعمدة، نظفنا القيم، واقترحنا أهم الحسابات التلقائية المناسبة.'
              : 'Columns identified, values cleaned, and optimal KPIs calculated.'}
          </p>
        </div>

        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="px-5 py-2.5 text-base font-bold rounded-xl bg-white border border-[#B9A3D4]/50 text-[#29232D] hover:bg-[#FFF9F2] transition-colors cursor-pointer"
          >
            {isAr ? 'تغيير البيانات' : 'Change Data'}
          </button>
          <button
            onClick={onProceedToDashboard}
            className="px-7 py-2.5 text-base sm:text-lg font-bold rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all shadow-xs flex items-center gap-2.5 cursor-pointer"
          >
            <span>{isAr ? 'عرض الداشبورد الآن' : 'View Dashboard Now'}</span>
            {isAr ? <ArrowLeft className="w-4.5 h-4.5" /> : <ArrowRight className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-[#B9A3D4]/35 shadow-2xs">
          <span className="text-sm sm:text-base text-[#29232D]/70 block mb-1.5 font-bold">
            {isAr ? 'عدد السجلات (الصفوف)' : 'Total Records (Rows)'}
          </span>
          <span className="text-4xl sm:text-5xl font-black text-[#4B315F] font-mono">
            {dataset.totalRows}
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#B9A3D4]/35 shadow-2xs">
          <span className="text-sm sm:text-base text-[#29232D]/70 block mb-1.5 font-bold">
            {isAr ? 'الأعمدة المكتشفة' : 'Identified Columns'}
          </span>
          <span className="text-4xl sm:text-5xl font-black text-[#4B315F] font-mono">
            {dataset.totalColumns}
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#B9A3D4]/35 shadow-2xs">
          <span className="text-sm sm:text-base text-[#29232D]/70 block mb-1.5 font-bold">
            {isAr ? 'القيم التي تم تنظيمها' : 'Cleaned Values'}
          </span>
          <span className="text-4xl sm:text-5xl font-black text-[#F4A261] font-mono">
            {dataset.cleaningSummary.missingValuesFixed}
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#B9A3D4]/35 shadow-2xs">
          <span className="text-sm sm:text-base text-[#29232D]/70 block mb-1.5 font-bold">
            {isAr ? 'حالة جودة البيانات' : 'Data Integrity'}
          </span>
          <span className="text-lg sm:text-xl font-black text-[#4B315F] flex items-center gap-2 mt-1">
            <CheckCircle className="w-5.5 h-5.5 text-emerald-600" />
            {isAr ? 'جاهزة 100%' : '100% Ready'}
          </span>
        </div>
      </div>

      {/* Cleaning Notes Box */}
      <div className="bg-[#FFF9F2] border border-[#F4A261]/40 rounded-2xl p-6 flex items-start gap-4 shadow-2xs">
        <Info className="w-6 h-6 text-[#F4A261] shrink-0 mt-0.5" />
        <div className="text-base space-y-2">
          <span className="font-bold text-[#4B315F] text-lg block">
            {isAr ? 'ما تم تنفيذه تلقائيًا:' : 'Automatic actions taken:'}
          </span>
          {dataset.cleaningSummary.notes.map((note, idx) => (
            <p key={idx} className="text-[#29232D]/85 font-medium leading-relaxed">
              • {note}
            </p>
          ))}
        </div>
      </div>

      {/* Identified Columns Grid */}
      <div className="space-y-4.5">
        <h3 className="text-lg sm:text-xl font-black text-[#4B315F] flex items-center gap-2.5">
          <Columns className="w-5.5 h-5.5 text-[#F4A261]" />
          <span>{isAr ? 'الأعمدة التي تم التعرف عليها وفهمها:' : 'Columns Understood:'}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {dataset.columns.map((col) => {
            const badge = getRoleBadge(col.inferredRole);
            const Icon = badge.icon;
            return (
              <div
                key={col.key}
                className="bg-white p-5 rounded-2xl border border-[#B9A3D4]/35 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base sm:text-lg text-[#29232D] truncate max-w-[170px]">
                    {col.label}
                  </span>
                  <span
                    className={`text-xs sm:text-sm px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 ${badge.color}`}
                  >
                    <Icon className="w-4 h-4" />
                    {badge.label}
                  </span>
                </div>

                <div className="text-sm sm:text-base text-[#29232D]/75 flex items-center justify-between font-mono font-medium">
                  <span>
                    {isAr ? `${col.uniqueCount} قيمة فريدة` : `${col.uniqueCount} unique`}
                  </span>
                  {col.sum !== undefined && (
                    <span className="text-[#4B315F] font-bold">
                      {isAr ? `المجموع: ${Math.round(col.sum).toLocaleString('ar-EG')}` : `Sum: ${Math.round(col.sum).toLocaleString()}`}
                    </span>
                  )}
                </div>

                {/* Sample values */}
                <div className="text-sm sm:text-base text-[#29232D]/85 bg-[#FFF9F2] px-3 py-2 rounded-xl truncate font-mono">
                  {col.sampleValues.slice(0, 3).join(' · ') || '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sample 5-row preview table */}
      <div className="space-y-4.5">
        <h3 className="text-lg sm:text-xl font-black text-[#4B315F] flex items-center gap-2.5">
          <Table className="w-5.5 h-5.5 text-[#F4A261]" />
          <span>{isAr ? 'معاينة عينة من البيانات بعد التنظيم:' : 'Preview Sample Cleaned Data:'}</span>
        </h3>

        <div className="bg-white rounded-2xl border border-[#B9A3D4]/35 overflow-x-auto shadow-2xs">
          <table className="w-full text-right text-base">
            <thead className="bg-[#FFF9F2] text-[#4B315F] border-b border-[#B9A3D4]/30 font-bold">
              <tr>
                {dataset.columns.map((c) => (
                  <th key={c.key} className="px-5 py-3.5 whitespace-nowrap text-base font-bold">
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
                      className="px-5 py-3 whitespace-nowrap font-mono text-sm sm:text-base"
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
          className="px-10 py-4 text-lg font-black rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all shadow-md inline-flex items-center gap-3 cursor-pointer"
        >
          <span>{isAr ? 'كل حاجة جاهزة! افتح الداشبورد' : 'Everything is ready! Open Dashboard'}</span>
          {isAr ? <ArrowLeft className="w-4.5 h-4.5" /> : <ArrowRight className="w-4.5 h-4.5" />}
        </button>
      </div>
    </div>
  );
};
