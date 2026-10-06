import React from 'react';
import { PlusCircle } from 'lucide-react';

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
      <div className="bg-white rounded-2xl border border-[#B9A3D4]/40 shadow-xl max-w-md w-full p-6 sm:p-7 space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FFF9F2] text-[#4B315F] border border-[#B9A3D4]/35 flex items-center justify-center mx-auto shadow-2xs">
          <PlusCircle className="w-7 h-7 text-[#F4A261]" />
        </div>

        <div className="space-y-2.5">
          <h3 className="text-xl sm:text-2xl font-black text-[#29232D] tracking-tight">
            {isAr
              ? 'هل تريد بدء تحليل جديد؟ سيتم الاحتفاظ بالتحليل الحالي.'
              : 'Start a new analysis? Your current analysis will be preserved.'}
          </h3>
          <p className="text-base text-[#29232D]/80 leading-relaxed font-medium">
            {isAr
              ? 'يمكنك الرجوع إلى لوحة بياناتك الحالية في أي وقت من خلال القائمة العلوية.'
              : 'You can return to your current dashboard anytime from the top navigation.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 text-base font-bold rounded-xl bg-white border border-[#B9A3D4]/50 text-[#29232D] hover:bg-[#FFF9F2] transition-colors cursor-pointer"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 px-4 text-base font-bold rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all shadow-xs cursor-pointer"
          >
            {isAr ? 'بدء تحليل جديد' : 'Start New Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
};
