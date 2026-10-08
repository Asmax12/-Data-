import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ThemeId } from '../types/theme';

interface ThemeSelectorProps {
  language: 'ar' | 'en';
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ language }) => {
  const { theme, themeId, setThemeId, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAr = language === 'ar';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: ThemeId) => {
    setThemeId(id);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-right no-print" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-base font-bold rounded-xl transition-all cursor-pointer border shadow-2xs hover:shadow-xs"
        style={{
          backgroundColor: 'white',
          borderColor: theme.colors.border,
          color: theme.colors.primary,
        }}
        title={isAr ? 'تغيير مظهر لوحة البيانات' : 'Change Theme'}
        aria-label="Theme selector"
        aria-expanded={isOpen}
      >
        <Palette className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" style={{ color: theme.colors.secondary }} />
        <span className="hidden xs:inline sm:inline">{isAr ? 'المظهر' : 'Theme'}</span>
        {/* Color preview dots of current theme */}
        <div className="flex items-center -space-x-1 rtl:space-x-reverse ml-0.5">
          {theme.previewColors.slice(0, 3).map((c, i) => (
            <span
              key={i}
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ring-1 ring-white"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            isAr ? 'left-0 sm:left-auto sm:right-0' : 'right-0'
          } mt-2 w-[calc(100vw-24px)] max-w-xs sm:max-w-none sm:w-80 rounded-2xl shadow-xl border p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150`}
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          <div className="px-3 py-2 border-b mb-1.5 flex items-center justify-between" style={{ borderColor: theme.colors.border }}>
            <span className="text-sm font-bold" style={{ color: theme.colors.textPrimary }}>
              {isAr ? 'اختر مظهر لوحة البيانات' : 'Choose Dashboard Theme'}
            </span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.primary,
              }}
            >
              5 {isAr ? 'خيارات' : 'themes'}
            </span>
          </div>

          <div className="space-y-1">
            {themes.map((t) => {
              const isSelected = t.id === themeId;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-right cursor-pointer group ${
                    isSelected ? 'shadow-2xs' : 'hover:bg-black/5'
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${t.colors.bg}` : undefined,
                    border: isSelected ? `1.5px solid ${t.colors.primary}` : '1.5px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Color Swatches */}
                    <div className="flex items-center gap-1 p-1 bg-white rounded-lg shadow-2xs border border-black/5">
                      {t.previewColors.map((color, idx) => (
                        <span
                          key={idx}
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-base font-bold transition-colors"
                          style={{ color: isSelected ? t.colors.primary : theme.colors.textPrimary }}
                        >
                          {isAr ? t.nameAr : t.nameEn}
                        </span>
                        {t.id === 'warm-plum' && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                            style={{
                              backgroundColor: `${t.colors.primary}18`,
                              color: t.colors.primary,
                            }}
                          >
                            {isAr ? 'افتراضي' : 'Default'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs block leading-tight mt-0.5" style={{ color: `${theme.colors.textPrimary}99` }}>
                        {isAr ? t.descriptionAr : t.nameEn}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: t.colors.primary }}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
