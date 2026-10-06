import React, { useState } from 'react';
import { formatMetricNumber } from '../../utils/analyticsEngine';
import { Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface BarChartProps {
  data: { label: string; value: number; percentage?: number }[];
  title: string;
  metricLabel?: string;
  onBarClick?: (label: string) => void;
  activeFilter?: string | null;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  metricLabel = 'القيمة',
  onBarClick,
  activeFilter,
}) => {
  const { theme } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="p-8 text-center text-base font-semibold"
        style={{ color: `${theme.colors.primary}B0` }}
      >
        لا توجد بيانات كافية لعرض هذا المخطط
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const palette = theme.colors.chartPalette;

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-3.5 pt-2">
        {data.map((item, idx) => {
          const ratio = Math.max((item.value / maxValue) * 100, 4);
          const isHovered = hoveredIndex === idx;
          const isSelected = activeFilter === item.label;

          const barColor = palette[idx % palette.length];
          const barNextColor = palette[(idx + 1) % palette.length] || theme.colors.primary;

          return (
            <div
              key={idx}
              className={`group cursor-pointer rounded-xl p-3.5 transition-all duration-200 ${
                isHovered
                  ? 'bg-white shadow-sm translate-x-1'
                  : 'hover:bg-white/80'
              }`}
              style={{
                backgroundColor: isSelected ? `${theme.colors.primary}12` : undefined,
                boxShadow: isSelected ? `0 0 0 2px ${theme.colors.primary}` : undefined,
              }}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onBarClick?.(item.label)}
              title={`اضغط للتصفية حسب ${item.label}`}
            >
              <div className="flex items-center justify-between text-base mb-2.5 font-medium" style={{ color: theme.colors.textPrimary }}>
                <div className="flex items-center gap-3 truncate">
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-xs sm:text-sm font-mono font-bold shrink-0 transition-colors"
                    style={{
                      backgroundColor: isSelected ? theme.colors.primary : `${barColor}25`,
                      color: isSelected ? '#FFF9F2' : theme.colors.primary,
                    }}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </span>
                  <span className="truncate max-w-[230px] font-bold text-base" style={{ color: theme.colors.textPrimary }}>
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 font-mono">
                  <span
                    className="font-black text-base sm:text-lg"
                    style={{ color: theme.colors.primary }}
                  >
                    {formatMetricNumber(item.value, true)}
                  </span>
                  {item.percentage !== undefined && (
                    <span
                      className="text-xs sm:text-sm px-2.5 py-0.5 rounded-md font-bold border"
                      style={{
                        backgroundColor: theme.colors.bg,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      }}
                    >
                      {item.percentage}%
                    </span>
                  )}
                </div>
              </div>

              {/* Progress track */}
              <div
                className="w-full rounded-full h-3.5 overflow-hidden p-0.5"
                style={{ backgroundColor: `${theme.colors.border}` }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${ratio}%`,
                    background: `linear-gradient(to right, ${barColor}, ${barNextColor})`,
                    opacity: isHovered ? 1 : 0.9,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-5 pt-3.5 text-sm sm:text-base flex items-center justify-between border-t font-semibold"
        style={{ borderColor: theme.colors.border, color: `${theme.colors.textPrimary}B8` }}
      >
        <span className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: theme.colors.secondary }}
          />
          <span>اضغط على أي فئة لتصفية الداشبورد</span>
        </span>
        <span
          className="font-mono font-bold"
          style={{ color: theme.colors.primary }}
        >
          {data.length} عناصر
        </span>
      </div>
    </div>
  );
};

