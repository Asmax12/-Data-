import React from 'react';
import {
  Home,
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { CleanedDataset } from '../types';

interface HeaderProps {
  currentStep: 'home' | 'understanding' | 'dashboard';
  hasActiveDataset: boolean;
  dataset: CleanedDataset | null;
  language: 'ar' | 'en';
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onRequestNewAnalysis: () => void;
  onLanguageChange: (lang: 'ar' | 'en') => void;
  onOpenUpdateModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  hasActiveDataset,
  dataset,
  language,
  onNavigateHome,
  onNavigateDashboard,
  onRequestNewAnalysis,
  onLanguageChange,
  onOpenUpdateModal,
}) => {
  const isAr = language === 'ar';

  return (
    <header className="sticky top-0 z-40 bg-[#FFF9F2]/95 backdrop-blur-md border-b border-[#B9A3D4]/30 px-4 lg:px-8 py-2.5 transition-colors no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer group focus:outline-none"
            title={isAr ? 'العودة للرئيسية' : 'Go to Home'}
          >
            <div className="w-9 h-9 rounded-xl bg-[#4B315F] flex items-center justify-center text-[#FFF9F2] shadow-2xs group-hover:scale-105 transition-transform">
              <span className="font-bold text-lg font-mono">D</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-[#4B315F] tracking-tight">
                  DataMate
                </span>
              </div>
            </div>
          </button>

          {/* Simple Navigation: الرئيسية | تحليل جديد | لوحة البيانات */}
          <nav className="flex items-center gap-1 bg-white/60 p-1 rounded-xl border border-[#B9A3D4]/30 text-xs">
            {/* 1. الرئيسية */}
            <button
              onClick={onNavigateHome}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentStep === 'home'
                  ? 'bg-[#4B315F] text-[#FFF9F2] shadow-2xs'
                  : 'text-[#29232D]/80 hover:text-[#4B315F] hover:bg-white/80'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{isAr ? 'الرئيسية' : 'Home'}</span>
            </button>

            {/* 2. + تحليل جديد */}
            <button
              onClick={onRequestNewAnalysis}
              className="px-3 py-1.5 rounded-lg font-semibold text-[#4B315F] hover:bg-white/80 transition-all cursor-pointer flex items-center gap-1"
              title={isAr ? 'بدء تحليل جديد من الصفر' : 'Start New Analysis'}
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#F4A261]" />
              <span>{isAr ? '+ تحليل جديد' : '+ New Analysis'}</span>
            </button>

            {/* 3. لوحة البيانات (Dashboard) - Only enabled if dataset exists */}
            {hasActiveDataset && (
              <button
                onClick={onNavigateDashboard}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentStep === 'dashboard'
                    ? 'bg-[#4B315F] text-[#FFF9F2] shadow-2xs'
                    : 'text-[#29232D]/80 hover:text-[#4B315F] hover:bg-white/80'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{isAr ? 'لوحة البيانات' : 'Dashboard'}</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2.5">
          {/* Active Dataset tag */}
          {dataset && currentStep === 'dashboard' && (
            <div className="hidden lg:flex items-center gap-2 bg-white/70 border border-[#B9A3D4]/30 px-2.5 py-1 rounded-lg text-xs font-medium text-[#29232D]">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#4B315F]" />
              <span className="truncate max-w-[140px]">{dataset.name}</span>
            </div>
          )}

          {/* Update With New Data button if in dashboard */}
          {dataset && currentStep === 'dashboard' && onOpenUpdateModal && (
            <button
              onClick={onOpenUpdateModal}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all cursor-pointer shadow-2xs"
              title={isAr ? 'تحديث الداشبورد ببيانات جديدة' : 'Update With New Data'}
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#F4A261]" />
              <span>{isAr ? 'تحديث البيانات' : 'Update Data'}</span>
            </button>
          )}

          {/* Language Switcher */}
          <button
            onClick={() => onLanguageChange(isAr ? 'en' : 'ar')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg text-[#4B315F] hover:bg-white/80 border border-transparent hover:border-[#B9A3D4]/30 transition-colors cursor-pointer"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-[#F4A261]" />
            <span>{isAr ? 'En' : 'عربي'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
