import React from 'react';
import {
  Lightbulb,
  X,
  TrendingUp,
  Target,
  Sparkles,
  BarChart3,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { InvestigationResult, InvestigationSubject } from '../types';
import { useTheme } from '../context/ThemeContext';

interface InvestigatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: InvestigationResult | null;
  isLoading: boolean;
  language: 'ar' | 'en';
  availableSubjects?: InvestigationSubject[];
  onSelectSubject?: (subject: InvestigationSubject) => void;
}

export const InvestigatorModal: React.FC<InvestigatorModalProps> = ({
  isOpen,
  onClose,
  result,
  isLoading,
  language,
  availableSubjects = [],
  onSelectSubject,
}) => {
  const { theme } = useTheme();
  const isAr = language === 'ar';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ borderColor: theme.colors.border }}
      >
        {/* Header */}
        <div
          className="p-5 sm:p-6 border-b flex items-start justify-between gap-4"
          style={{
            backgroundColor: `${theme.colors.bg}`,
            borderColor: theme.colors.border,
          }}
        >
          <div className="flex items-start gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
              style={{
                backgroundColor: theme.colors.primary,
                color: '#FFF9F2',
              }}
            >
              <Lightbulb className="w-6 h-6 stroke-[2.2]" style={{ color: theme.colors.secondary }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black" style={{ color: theme.colors.textPrimary }}>
                  {isAr ? 'افهم الرقم — محقق البيانات' : 'DataMate Investigator'}
                </h3>
                {result?.isAiEnriched ? (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${theme.colors.secondary}25`,
                      color: theme.colors.primary,
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    {isAr ? 'تحليل ذكي مدعوم' : 'AI-Enriched'}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: theme.colors.background,
                      color: theme.colors.primary,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <BarChart3 className="w-3 h-3" style={{ color: theme.colors.primary }} />
                    {isAr ? 'تحليل إحصائي دقيق' : 'Statistical Evidence'}
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base font-medium mt-1" style={{ color: `${theme.colors.textPrimary}BF` }}>
                {isAr
                  ? 'لماذا يحدث هذا الرقم؟ تحليل الأسباب والعوامل المؤثرة بدلاً من مجرد عرض القيمة.'
                  : 'Understand WHY this number behaves this way based on evidence in your data.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors cursor-pointer shrink-0"
            style={{ color: `${theme.colors.textPrimary}99` }}
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick subject selector pills */}
        {availableSubjects.length > 1 && onSelectSubject && (
          <div
            className="px-5 sm:px-6 py-2.5 border-b flex items-center gap-2 overflow-x-auto no-scrollbar"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <span className="text-xs font-bold shrink-0" style={{ color: `${theme.colors.textPrimary}99` }}>
              {isAr ? 'اختر للتحليل:' : 'Investigate:'}
            </span>
            {availableSubjects.map((sub, idx) => {
              const isActive = result?.subject.title === sub.title;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectSubject(sub)}
                  className={`px-3 py-1 text-xs sm:text-sm font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isActive ? 'shadow-2xs ring-1' : 'hover:bg-black/5'
                  }`}
                  style={{
                    backgroundColor: isActive ? theme.colors.background : undefined,
                    color: isActive ? theme.colors.primary : `${theme.colors.textPrimary}CC`,
                    borderColor: isActive ? theme.colors.primary : 'transparent',
                  }}
                >
                  <span>{sub.title}</span>
                  {sub.formattedValue && (
                    <span className="font-mono text-xs opacity-80">({sub.formattedValue})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Body */}
        <div
          className="p-5 sm:p-6 overflow-y-auto space-y-5.5 flex-1"
          style={{ backgroundColor: theme.colors.surface }}
        >
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div
                className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                style={{
                  borderColor: `${theme.colors.border}`,
                  borderTopColor: theme.colors.primary,
                }}
              />
              <div>
                <p className="text-base font-bold" style={{ color: theme.colors.textPrimary }}>
                  {isAr ? 'جاري فحص وتدقيق عوامل البيانات...' : 'Analyzing underlying data drivers...'}
                </p>
                <p className="text-sm" style={{ color: `${theme.colors.textPrimary}99` }}>
                  {isAr
                    ? 'نبحث في المساهمات النسبية، والتركز، والمتوسطات'
                    : 'Searching for concentration, averages, and key drivers'}
                </p>
              </div>
            </div>
          ) : result ? (
            <>
              {/* Target Banner */}
              <div
                className="p-4 sm:p-4.5 rounded-2xl border flex items-center justify-between flex-wrap gap-3"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                }}
              >
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-wider block"
                    style={{ color: `${theme.colors.textPrimary}99` }}
                  >
                    {isAr ? 'موضوع الفحص' : 'Target Subject'}
                  </span>
                  <h4 className="text-lg sm:text-xl font-black mt-0.5" style={{ color: theme.colors.textPrimary }}>
                    {result.subject.title}
                  </h4>
                </div>
                {result.subject.formattedValue && (
                  <div
                    className="px-4 py-2 rounded-xl text-lg sm:text-xl font-black font-mono shadow-2xs"
                    style={{
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.primary,
                      border: `1.5px solid ${theme.colors.border}`,
                    }}
                  >
                    {result.subject.formattedValue}
                  </div>
                )}
              </div>

              {/* 1. ماذا يحدث؟ */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-base font-bold" style={{ color: theme.colors.textPrimary }}>
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    1
                  </span>
                  <span>{isAr ? 'ماذا يحدث؟' : 'What is happening?'}</span>
                </div>
                <div
                  className="p-4 rounded-xl text-base leading-relaxed font-medium border"
                  style={{
                    backgroundColor: `${theme.colors.background}80`,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  }}
                >
                  {result.summaryWhat}
                </div>
              </div>

              {/* 2. لماذا قد يحدث؟ */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-base font-bold" style={{ color: theme.colors.textPrimary }}>
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0"
                    style={{ backgroundColor: theme.colors.secondary }}
                  >
                    2
                  </span>
                  <span>{isAr ? 'لماذا قد يحدث؟ (الأسباب القائمة على الأدلة)' : 'Why might this happen?'}</span>
                </div>
                <div className="space-y-2">
                  {result.summaryWhy.map((reason, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border flex items-start gap-3"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                        style={{
                          backgroundColor: `${theme.colors.primary}18`,
                          color: theme.colors.primary,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <p className="text-sm sm:text-base font-medium leading-relaxed" style={{ color: theme.colors.textPrimary }}>
                        {reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. الأدلة بالأرقام */}
              {result.evidence && result.evidence.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-base font-bold" style={{ color: theme.colors.textPrimary }}>
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0"
                      style={{ backgroundColor: theme.colors.accent }}
                    >
                      3
                    </span>
                    <span>{isAr ? 'أرقام وحقائق تدعم التحليل' : 'Supporting Evidence in Data'}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {result.evidence.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border flex flex-col justify-between"
                        style={{
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-bold" style={{ color: theme.colors.textPrimary }}>{item.label}</span>
                          <span
                            className="text-base font-black font-mono shrink-0"
                            style={{ color: theme.colors.primary }}
                          >
                            {item.value}
                          </span>
                        </div>
                        {item.percentage !== undefined && (
                          <div className="mt-2 space-y-1">
                            <div className="w-full h-2 rounded-full bg-black/5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, item.percentage)}%`,
                                  backgroundColor: theme.colors.primary,
                                }}
                              />
                            </div>
                            <span className="text-xs block text-right font-medium" style={{ color: `${theme.colors.textPrimary}99` }}>
                              {item.percentage}%
                            </span>
                          </div>
                        )}
                        {item.note && (
                          <span className="text-xs mt-1 block" style={{ color: `${theme.colors.textPrimary}99` }}>
                            {item.note}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. ما الذي ننصح به؟ */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-base font-bold" style={{ color: theme.colors.textPrimary }}>
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0"
                    style={{ backgroundColor: theme.colors.success }}
                  >
                    4
                  </span>
                  <span>{isAr ? 'ما الذي ننصح به؟ (التوصية العملية)' : 'Actionable Recommendation'}</span>
                </div>
                <div
                  className="p-4 rounded-xl border flex items-start gap-3"
                  style={{
                    backgroundColor: `${theme.colors.success}12`,
                    borderColor: `${theme.colors.success}40`,
                  }}
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: theme.colors.success }} />
                  <p className="text-sm sm:text-base font-bold leading-relaxed" style={{ color: theme.colors.textPrimary }}>
                    {result.recommendation}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center" style={{ color: `${theme.colors.textPrimary}99` }}>
              <HelpCircle className="w-10 h-10 mx-auto mb-2" style={{ color: theme.colors.borderAccent }} />
              <p className="text-base font-bold">
                {isAr ? 'اختر رقمًا أو مؤشرًا لبدء الفحص' : 'Select a metric to investigate'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 sm:p-5 border-t flex items-center justify-between gap-3"
          style={{
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
          }}
        >
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: `${theme.colors.textPrimary}99` }}>
            <TrendingUp className="w-4 h-4" style={{ color: theme.colors.secondary }} />
            <span>
              {isAr ? 'تحليل يربط بين الرياضيات وقرارات العمل' : 'Evidence-grounded analytical companion'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-base transition-all cursor-pointer shadow-xs"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#FFF9F2',
            }}
          >
            {isAr ? 'فهمت، شكرًا' : 'Got it, thanks'}
          </button>
        </div>
      </div>
    </div>
  );
};
