import React from 'react';
import { PlusCircle, X, AlertCircle } from 'lucide-react';

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

  const isAr = language === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-white rounded-2xl border border-[#B9A3D4]/40 shadow-xl max-w-md w-full p-6 space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#FFF9F2] text-[#4B315F] border border-[#B9A3D4]/30 flex items-center justify-center mx-auto">
          <PlusCircle className="w-6 h-6 text-[#F4A261]" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-[#29232D]">
            {isAr
              ? 'هل تريد بدء تحليل جديد؟ سيتم الاحتفاظ بالتحليل الحالي.'
              : 'Start a new analysis? Your current analysis will be preserved.'}
          </h3>
          <p className="text-xs text-[#29232D]/60 leading-relaxed">
            {isAr
              ? 'يمكنك الرجوع إلى لوحة بياناتك الحالية في أي وقت من خلال القائمة العلوية.'
              : 'You can return to your current dashboard anytime from the top navigation.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-white border border-[#B9A3D4]/50 text-[#29232D] hover:bg-[#FFF9F2] transition-colors cursor-pointer"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all shadow-xs cursor-pointer"
          >
            {isAr ? 'بدء تحليل جديد' : 'Start New Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
};
