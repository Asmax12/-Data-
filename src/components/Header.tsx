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
import { useTheme } from '../context/ThemeContext';
import { ThemeSelector } from './ThemeSelector';

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
  const { theme } = useTheme();
  const isAr = language === 'ar';

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md border-b px-2.5 sm:px-4 lg:px-8 py-2 sm:py-3.5 transition-colors no-print"
      style={{
        backgroundColor: `${theme.colors.bg}F0`,
        borderColor: theme.colors.border,
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Brand & Simple Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-4 lg:gap-6 min-w-0">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer group focus:outline-none shrink-0"
            title={isAr ? 'العودة للرئيسية' : 'Go to Home'}
          >
            <div
              className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <span className="font-extrabold text-lg sm:text-2xl font-mono">D</span>
            </div>
            <div>
              <span
                className="hidden min-[360px]:inline text-lg sm:text-2xl lg:text-3xl font-black tracking-tight"
                style={{ color: theme.colors.primary }}
              >
                DataMate
              </span>
            </div>
          </button>

          {/* Navigation Bar: الرئيسية | تحليل جديد | لوحة البيانات */}
          <nav
            className="flex items-center gap-0.5 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl border shadow-2xs overflow-x-auto no-scrollbar shrink min-w-0"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            {/* 1. الرئيسية */}
            <button
              onClick={onNavigateHome}
              className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-base transition-all cursor-pointer flex items-center gap-1 sm:gap-2 shrink-0"
              style={{
                backgroundColor: currentStep === 'home' ? theme.colors.primary : 'transparent',
                color: currentStep === 'home' ? '#FFF9F2' : theme.colors.textPrimary,
              }}
            >
              <Home className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
              <span>{isAr ? 'الرئيسية' : 'Home'}</span>
            </button>

            {/* 2. + تحليل جديد */}
            <button
              onClick={onRequestNewAnalysis}
              className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-base hover:bg-black/5 transition-all cursor-pointer flex items-center gap-1 sm:gap-2 shrink-0"
              style={{ color: theme.colors.primary }}
              title={isAr ? 'بدء تحليل جديد من الصفر' : 'Start New Analysis'}
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" style={{ color: theme.colors.secondary }} />
              <span className="whitespace-nowrap">{isAr ? '+ جديد' : '+ New'}</span>
            </button>

            {/* 3. لوحة البيانات (Dashboard) */}
            {hasActiveDataset && (
              <button
                onClick={onNavigateDashboard}
                className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-base transition-all cursor-pointer flex items-center gap-1 sm:gap-2 shrink-0"
                style={{
                  backgroundColor: currentStep === 'dashboard' ? theme.colors.primary : 'transparent',
                  color: currentStep === 'dashboard' ? '#FFF9F2' : theme.colors.textPrimary,
                }}
              >
                <LayoutDashboard className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                <span>{isAr ? 'اللوحة' : 'Dashboard'}</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 lg:gap-3 shrink-0">
          {/* Active Dataset tag */}
          {dataset && currentStep === 'dashboard' && (
            <div
              className="hidden lg:flex items-center gap-2 border px-3.5 py-2 rounded-xl text-base font-bold"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              }}
            >
              <FileSpreadsheet className="w-4.5 h-4.5" style={{ color: theme.colors.primary }} />
              <span className="truncate max-w-[190px]">{dataset.name}</span>
            </div>
          )}

          {/* Update With New Data button if in dashboard */}
          {dataset && currentStep === 'dashboard' && onOpenUpdateModal && (
            <button
              onClick={onOpenUpdateModal}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-base font-bold rounded-xl text-white transition-all cursor-pointer shadow-xs hover:opacity-95"
              style={{ backgroundColor: theme.colors.primary }}
              title={isAr ? 'تحديث الداشبورد ببيانات جديدة' : 'Update With New Data'}
            >
              <RefreshCw className="w-4.5 h-4.5" style={{ color: theme.colors.secondary }} />
              <span>{isAr ? 'تحديث البيانات' : 'Update Data'}</span>
            </button>
          )}

          {/* Theme Selector (5 themes) */}
          <ThemeSelector language={language} />

          {/* Language Switcher */}
          <button
            onClick={() => onLanguageChange(isAr ? 'en' : 'ar')}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-base font-bold rounded-xl hover:bg-white/80 border border-transparent hover:border-black/10 transition-colors cursor-pointer"
            style={{ color: theme.colors.primary }}
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" style={{ color: theme.colors.secondary }} />
            <span>{isAr ? 'En' : 'عربي'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

