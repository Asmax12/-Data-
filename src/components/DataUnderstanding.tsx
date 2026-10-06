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
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();
  const isAr = language === 'ar';

  const getRoleBadge = (role: ColumnMeta['inferredRole']) => {
    switch (role) {
      case 'metric':
        return {
          label: isAr ? 'مقياس وحسابات' : 'Metric / Number',
          style: {
            color: theme.colors.primary,
            backgroundColor: `${theme.colors.primary}18`,
          },
          icon: Hash,
        };
      case 'time':
        return {
          label: isAr ? 'تاريخ وزمن' : 'Time Dimension',
          style: {
            color: theme.colors.secondary,
            backgroundColor: `${theme.colors.secondary}22`,
          },
          icon: Calendar,
        };
      case 'dimension':
        return {
          label: isAr ? 'تصنيف ومقارنة' : 'Category / Dimension',
          style: {
            color: theme.colors.accent,
            backgroundColor: `${theme.colors.accent}20`,
          },
          icon: Layers,
        };
      case 'identifier':
        return {
          label: isAr ? 'معرّف فريد' : 'Identifier / ID',
          style: {
            color: theme.colors.textPrimary,
            backgroundColor: `${theme.colors.borderAccent}25`,
          },
          icon: Columns,
        };
      default:
        return {
          label: isAr ? 'نص إضافي' : 'Attribute',
          style: {
            color: theme.colors.textPrimary,
            backgroundColor: `${theme.colors.borderAccent}25`,
          },
          icon: Columns,
        };
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12 space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b pb-6"
        style={{ borderColor: theme.colors.border }}
      >
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
            <span
              className="text-sm sm:text-base font-bold uppercase tracking-wider"
              style={{ color: theme.colors.primary }}
            >
              {isAr ? 'الخطوة 2: فهم وتنظيم البيانات' : 'Step 2: Understanding Your Data'}
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight"
            style={{ color: theme.colors.textPrimary }}
          >
            {isAr ? 'فهمنا بياناتك ونظمناها بنجاح!' : 'We understood and organized your data!'}
          </h2>
          <p
            className="text-base sm:text-lg mt-1.5 font-medium"
            style={{ color: `${theme.colors.textPrimary}CC` }}
          >
            {isAr
              ? 'حددنا الأعمدة، نظفنا القيم، واقترحنا أهم الحسابات التلقائية المناسبة.'
              : 'Columns identified, values cleaned, and optimal KPIs calculated.'}
          </p>
        </div>

        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="px-5 py-2.5 text-base font-bold rounded-xl border transition-colors cursor-pointer"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            }}
          >
            {isAr ? 'تغيير البيانات' : 'Change Data'}
          </button>
          <button
            onClick={onProceedToDashboard}
            className="px-7 py-2.5 text-base sm:text-lg font-bold rounded-xl transition-all shadow-xs flex items-center gap-2.5 cursor-pointer"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#FFF9F2',
            }}
          >
            <span>{isAr ? 'عرض الداشبورد الآن' : 'View Dashboard Now'}</span>
            {isAr ? <ArrowLeft className="w-4.5 h-4.5" /> : <ArrowRight className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div
          className="p-6 rounded-2xl border shadow-2xs"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          <span
            className="text-sm sm:text-base block mb-1.5 font-bold"
            style={{ color: `${theme.colors.textPrimary}B0` }}
          >
            {isAr ? 'عدد السجلات (الصفوف)' : 'Total Records (Rows)'}
          </span>
          <span className="text-4xl sm:text-5xl font-black font-mono" style={{ color: theme.colors.primary }}>
            {dataset.totalRows}
          </span>
        </div>

        <div
          className="p-6 rounded-2xl border shadow-2xs"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          <span
            className="text-sm sm:text-base block mb-1.5 font-bold"
            style={{ color: `${theme.colors.textPrimary}B0` }}
          >
            {isAr ? 'الأعمدة المكتشفة' : 'Identified Columns'}
          </span>
          <span className="text-4xl sm:text-5xl font-black font-mono" style={{ color: theme.colors.primary }}>
            {dataset.totalColumns}
          </span>
        </div>

        <div
          className="p-6 rounded-2xl border shadow-2xs"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          <span
            className="text-sm sm:text-base block mb-1.5 font-bold"
            style={{ color: `${theme.colors.textPrimary}B0` }}
          >
            {isAr ? 'القيم التي تم تنظيمها' : 'Cleaned Values'}
          </span>
          <span className="text-4xl sm:text-5xl font-black font-mono" style={{ color: theme.colors.secondary }}>
            {dataset.cleaningSummary.missingValuesFixed}
          </span>
        </div>

        <div
          className="p-6 rounded-2xl border shadow-2xs"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          <span
            className="text-sm sm:text-base block mb-1.5 font-bold"
            style={{ color: `${theme.colors.textPrimary}B0` }}
          >
            {isAr ? 'حالة جودة البيانات' : 'Data Integrity'}
          </span>
          <span
            className="text-lg sm:text-xl font-black flex items-center gap-2 mt-1"
            style={{ color: theme.colors.primary }}
          >
            <CheckCircle className="w-5.5 h-5.5 text-emerald-600" />
            {isAr ? 'جاهزة 100%' : '100% Ready'}
          </span>
        </div>
      </div>

      {/* Cleaning Notes Box */}
      <div
        className="border rounded-2xl p-6 flex items-start gap-4 shadow-2xs"
        style={{
          backgroundColor: theme.colors.background,
          borderColor: `${theme.colors.secondary}60`,
        }}
      >
        <Info className="w-6 h-6 shrink-0 mt-0.5" style={{ color: theme.colors.secondary }} />
        <div className="text-base space-y-2">
          <span className="font-bold text-lg block" style={{ color: theme.colors.primary }}>
            {isAr ? 'ما تم تنفيذه تلقائيًا:' : 'Automatic actions taken:'}
          </span>
          {dataset.cleaningSummary.notes.map((note, idx) => (
            <p
              key={idx}
              className="font-medium leading-relaxed"
              style={{ color: `${theme.colors.textPrimary}D9` }}
            >
              • {note}
            </p>
          ))}
        </div>
      </div>

      {/* Identified Columns Grid */}
      <div className="space-y-4.5">
        <h3 className="text-lg sm:text-xl font-black flex items-center gap-2.5" style={{ color: theme.colors.primary }}>
          <Columns className="w-5.5 h-5.5" style={{ color: theme.colors.secondary }} />
          <span>{isAr ? 'الأعمدة التي تم التعرف عليها وفهمها:' : 'Columns Understood:'}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {dataset.columns.map((col) => {
            const badge = getRoleBadge(col.inferredRole);
            const Icon = badge.icon;
            return (
              <div
                key={col.key}
                className="p-5 rounded-2xl border shadow-2xs space-y-3"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-bold text-base sm:text-lg truncate max-w-[170px]"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    {col.label}
                  </span>
                  <span
                    className="text-xs sm:text-sm px-3 py-1 rounded-lg font-bold flex items-center gap-1.5"
                    style={badge.style}
                  >
                    <Icon className="w-4 h-4" />
                    {badge.label}
                  </span>
                </div>

                <div
                  className="text-sm sm:text-base flex items-center justify-between font-mono font-medium"
                  style={{ color: `${theme.colors.textPrimary}BF` }}
                >
                  <span>
                    {isAr ? `${col.uniqueCount} قيمة فريدة` : `${col.uniqueCount} unique`}
                  </span>
                  {col.sum !== undefined && (
                    <span className="font-bold" style={{ color: theme.colors.primary }}>
                      {isAr ? `المجموع: ${Math.round(col.sum).toLocaleString('ar-EG')}` : `Sum: ${Math.round(col.sum).toLocaleString()}`}
                    </span>
                  )}
                </div>

                {/* Sample values */}
                <div
                  className="text-sm sm:text-base px-3 py-2 rounded-xl truncate font-mono border"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: `${theme.colors.border}80`,
                    color: theme.colors.textPrimary,
                  }}
                >
                  {col.sampleValues.slice(0, 3).join(' · ') || '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sample 5-row preview table */}
      <div className="space-y-4.5">
        <h3 className="text-lg sm:text-xl font-black flex items-center gap-2.5" style={{ color: theme.colors.primary }}>
          <Table className="w-5.5 h-5.5" style={{ color: theme.colors.secondary }} />
          <span>{isAr ? 'معاينة عينة من البيانات بعد التنظيم:' : 'Preview Sample Cleaned Data:'}</span>
        </h3>

        <div
          className="rounded-2xl border overflow-x-auto shadow-2xs"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          <table className="w-full text-right text-base">
            <thead
              className="border-b font-bold"
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
              style={{
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              }}
            >
              {dataset.rows.slice(0, 5).map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="transition-colors hover:bg-black/2"
                >
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
          className="px-10 py-4 text-lg font-black rounded-xl transition-all shadow-md inline-flex items-center gap-3 cursor-pointer"
          style={{
            backgroundColor: theme.colors.primary,
            color: '#FFF9F2',
          }}
        >
          <span>{isAr ? 'كل حاجة جاهزة! افتح الداشبورد' : 'Everything is ready! Open Dashboard'}</span>
          {isAr ? <ArrowLeft className="w-4.5 h-4.5" /> : <ArrowRight className="w-4.5 h-4.5" />}
        </button>
      </div>
    </div>
  );
};
