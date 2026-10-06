import React from 'react';
import { Info, CheckCircle2, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { AIHealthStatus, clearAIStatusNotice } from '../services/aiService';

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
      className="bg-[#FFF9F2] border border-[#F4A261] rounded-2xl p-4 shadow-2xs mx-4 lg:mx-8 mb-4 animate-fade-in no-print"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left message & status */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#F4A261]/20 text-[#4B315F] flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-[#F4A261]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#4B315F]">
                {isAr ? 'تنبيه الخدمة الذكية' : 'Service Notice'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                {isAr ? 'الأدوات الأساسية تعمل 100%' : 'Core tools 100% active'}
              </span>
            </div>
            <p className="text-xs text-[#29232D] mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Right actions: Retry & Dismiss */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#B9A3D4]/50 text-[#4B315F] hover:bg-[#FFF9F2] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
          )}

          <button
            onClick={clearAIStatusNotice}
            className="p-1 rounded-lg text-[#29232D]/50 hover:text-[#29232D] hover:bg-white/80 cursor-pointer"
            title={isAr ? 'إغلاق التنبيه' : 'Dismiss notice'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
