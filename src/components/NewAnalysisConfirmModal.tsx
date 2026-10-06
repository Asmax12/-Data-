import React from 'react';
import { PlusCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NewAnalysisConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  language: 'ar' | 'en';
}

export const NewAnalysisConfirmModal: React.FC<NewAnalysisConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  language,
}) => {
  if (!isOpen) return null;

  const { theme } = useTheme();
  const isAr = language === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in no-print">
      <div
        className="rounded-2xl border shadow-xl max-w-md w-full p-6 sm:p-7 space-y-6 text-center"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-2xs"
          style={{
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
            color: theme.colors.primary,
          }}
        >
          <PlusCircle className="w-7 h-7" style={{ color: theme.colors.secondary }} />
        </div>

        <div className="space-y-2.5">
          <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: theme.colors.textPrimary }}>
            {isAr
              ? 'هل تريد بدء تحليل جديد؟ سيتم الاحتفاظ بالتحليل الحالي.'
              : 'Start a new analysis? Your current analysis will be preserved.'}
          </h3>
          <p className="text-base leading-relaxed font-medium" style={{ color: `${theme.colors.textPrimary}CC` }}>
            {isAr
              ? 'يمكنك الرجوع إلى لوحة بياناتك الحالية في أي وقت من خلال القائمة العلوية.'
              : 'You can return to your current dashboard anytime from the top navigation.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 text-base font-bold rounded-xl border transition-colors cursor-pointer"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            }}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 px-4 text-base font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#FFF9F2',
            }}
          >
            {isAr ? 'بدء تحليل جديد' : 'Start New Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
};
