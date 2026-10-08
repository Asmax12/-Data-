import React from 'react';
import { Info, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { AIHealthStatus, clearAIStatusNotice } from '../services/aiService';
import { useTheme } from '../context/ThemeContext';

interface AILimitBannerProps {
  status: AIHealthStatus;
  language: 'ar' | 'en';
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const AILimitBanner: React.FC<AILimitBannerProps> = ({
  status,
  language,
  onRetry,
  isRetrying = false,
}) => {
  const { theme } = useTheme();

  // Only show banner if rate limited or unavailable
  if (!status.isRateLimited && !status.isUnavailable && !status.friendlyMessage) {
    return null;
  }

  const isAr = language === 'ar';

  const defaultMessage = isAr
    ? 'التحليل الذكي غير متاح مؤقتًا، لكن بياناتك ولوحة التحكم محفوظين ويمكنك الاستمرار في استخدام الأدوات الأساسية.'
    : 'Smart AI is temporarily unavailable, but your data and dashboard are safely preserved, and you can continue using all core tools.';

  const message = status.friendlyMessage || defaultMessage;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="rounded-2xl p-3.5 sm:p-5 shadow-2xs mx-3 sm:mx-4 lg:mx-8 mb-4 animate-fade-in no-print border"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderAccent || theme.colors.border,
      }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        {/* Left message & status */}
        <div className="flex items-start gap-2.5 sm:gap-3.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs"
            style={{
              backgroundColor: `${theme.colors.secondary}25`,
              color: theme.colors.primary,
            }}
          >
            <Info className="w-5 h-5" style={{ color: theme.colors.secondary }} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm sm:text-base font-bold" style={{ color: theme.colors.primary }}>
                {isAr ? 'تنبيه الخدمة الذكية' : 'Service Notice'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {isAr ? 'الأدوات الأساسية تعمل 100%' : 'Core tools 100% active'}
              </span>
            </div>
            <p className="text-sm sm:text-base mt-1.5 leading-relaxed font-medium" style={{ color: theme.colors.textPrimary }}>
              {message}
            </p>
          </div>
        </div>

        {/* Right actions: Retry & Dismiss */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="px-4 py-2 text-sm font-bold rounded-xl border transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.primary,
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
          )}

          <button
            onClick={clearAIStatusNotice}
            className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
            style={{ color: `${theme.colors.textPrimary}99` }}
            title={isAr ? 'إغلاق التنبيه' : 'Dismiss notice'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
