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
    <header className="sticky top-0 z-40 bg-[#FFF9F2]/95 backdrop-blur-md border-b border-[#B9A3D4]/30 px-4 lg:px-8 py-3.5 transition-colors no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Simple Navigation */}
        <div className="flex items-center gap-6">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer group focus:outline-none"
            title={isAr ? 'العودة للرئيسية' : 'Go to Home'}
          >
            <div className="w-11 h-11 rounded-xl bg-[#4B315F] flex items-center justify-center text-[#FFF9F2] shadow-xs group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-2xl font-mono">D</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-[#4B315F] tracking-tight">
                DataMate
              </span>
            </div>
          </button>

          {/* Navigation Bar: الرئيسية | تحليل جديد | لوحة البيانات */}
          <nav className="flex items-center gap-1.5 bg-white/80 p-1.5 rounded-xl border border-[#B9A3D4]/35 shadow-2xs">
            {/* 1. الرئيسية */}
            <button
              onClick={onNavigateHome}
              className={`px-4 py-2 rounded-lg font-bold text-base transition-all cursor-pointer flex items-center gap-2 ${
                currentStep === 'home'
                  ? 'bg-[#4B315F] text-[#FFF9F2] shadow-xs'
                  : 'text-[#29232D]/85 hover:text-[#4B315F] hover:bg-white'
              }`}
            >
              <Home className="w-4.5 h-4.5" />
              <span>{isAr ? 'الرئيسية' : 'Home'}</span>
            </button>

            {/* 2. + تحليل جديد */}
            <button
              onClick={onRequestNewAnalysis}
              className="px-4 py-2 rounded-lg font-bold text-base text-[#4B315F] hover:bg-white transition-all cursor-pointer flex items-center gap-2"
              title={isAr ? 'بدء تحليل جديد من الصفر' : 'Start New Analysis'}
            >
              <PlusCircle className="w-4.5 h-4.5 text-[#F4A261]" />
              <span>{isAr ? '+ تحليل جديد' : '+ New Analysis'}</span>
            </button>

            {/* 3. لوحة البيانات (Dashboard) */}
            {hasActiveDataset && (
              <button
                onClick={onNavigateDashboard}
                className={`px-4 py-2 rounded-lg font-bold text-base transition-all cursor-pointer flex items-center gap-2 ${
                  currentStep === 'dashboard'
                    ? 'bg-[#4B315F] text-[#FFF9F2] shadow-xs'
                    : 'text-[#29232D]/85 hover:text-[#4B315F] hover:bg-white'
                }`}
              >
                <LayoutDashboard className="w-4.5 h-4.5" />
                <span>{isAr ? 'لوحة البيانات' : 'Dashboard'}</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Active Dataset tag */}
          {dataset && currentStep === 'dashboard' && (
            <div className="hidden lg:flex items-center gap-2 bg-white/90 border border-[#B9A3D4]/40 px-3.5 py-2 rounded-xl text-base font-bold text-[#29232D]">
              <FileSpreadsheet className="w-4.5 h-4.5 text-[#4B315F]" />
              <span className="truncate max-w-[190px]">{dataset.name}</span>
            </div>
          )}

          {/* Update With New Data button if in dashboard */}
          {dataset && currentStep === 'dashboard' && onOpenUpdateModal && (
            <button
              onClick={onOpenUpdateModal}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-base font-bold rounded-xl bg-[#4B315F] text-[#FFF9F2] hover:bg-[#4B315F]/90 transition-all cursor-pointer shadow-xs"
              title={isAr ? 'تحديث الداشبورد ببيانات جديدة' : 'Update With New Data'}
            >
              <RefreshCw className="w-4.5 h-4.5 text-[#F4A261]" />
              <span>{isAr ? 'تحديث البيانات' : 'Update Data'}</span>
            </button>
          )}

          {/* Language Switcher */}
          <button
            onClick={() => onLanguageChange(isAr ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-base font-bold rounded-xl text-[#4B315F] hover:bg-white/80 border border-transparent hover:border-[#B9A3D4]/30 transition-colors cursor-pointer"
            title="Switch Language"
          >
            <Globe className="w-4.5 h-4.5 text-[#F4A261]" />
            <span>{isAr ? 'En' : 'عربي'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
