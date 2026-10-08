import React, { useState } from 'react';
import { formatMetricNumber } from '../../utils/analyticsEngine';
import { PieChart as PieIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface DonutChartProps {
  data: { label: string; value: number; percentage?: number }[];
  title: string;
  onSliceClick?: (label: string) => void;
  activeFilter?: string | null;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  onSliceClick,
  activeFilter,
}) => {
  const { theme } = useTheme();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="p-8 text-center text-base font-semibold"
        style={{ color: `${theme.colors.primary}B0` }}
      >
        لا توجد بيانات كافية لعرض التوزيع
      </div>
    );
  }

  const total = data.reduce((acc, curr) => acc + curr.value, 0) || 1;
  const PALETTE = theme.colors.chartPalette;

  // Calculate SVG stroke segments
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const slices = data.map((item, idx) => {
    const ratio = item.value / total;
    const strokeDasharray = `${ratio * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += ratio * circumference;
    const color = PALETTE[idx % PALETTE.length];
    const isSelected = activeFilter === item.label;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      color,
      isSelected,
      percent: Math.round(ratio * 100),
    };
  });

  const activeItem = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
        {/* SVG Donut */}
        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            {slices.map((slice, idx) => (
              <circle
                key={idx}
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={hoveredIdx === idx ? 25 : slice.isSelected ? 24 : 19}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSliceClick?.(slice.label)}
              />
            ))}
          </svg>

          {/* Donut Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-3">
            {activeItem ? (
              <>
                <span className="text-sm truncate max-w-[110px] font-bold" style={{ color: theme.colors.textPrimary }}>
                  {activeItem.label}
                </span>
                <span
                  className="text-2xl font-black font-mono mt-0.5"
                  style={{ color: theme.colors.primary }}
                >
                  {activeItem.percent}%
                </span>
              </>
            ) : (
              <>
                <span className="text-xs sm:text-sm uppercase tracking-wider font-bold" style={{ color: `${theme.colors.textPrimary}B0` }}>
                  الإجمالي
                </span>
                <span
                  className="text-base sm:text-lg font-black font-mono mt-0.5"
                  style={{ color: theme.colors.primary }}
                >
                  {formatMetricNumber(total, true)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2.5 sm:space-y-3 w-full">
          {slices.slice(0, 5).map((slice, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={idx}
                className={`flex items-center justify-between text-sm sm:text-base p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all ${
                  isHovered
                    ? 'bg-white shadow-xs translate-x-1'
                    : 'hover:bg-white/70'
                }`}
                style={{
                  backgroundColor: slice.isSelected ? `${theme.colors.primary}12` : undefined,
                  boxShadow: slice.isSelected ? `0 0 0 2px ${theme.colors.primary}` : undefined,
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSliceClick?.(slice.label)}
              >
                <div className="flex items-center gap-2 sm:gap-3 truncate">
                  <span
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate max-w-[100px] min-[380px]:max-w-[130px] sm:max-w-[160px] font-bold text-sm sm:text-base" style={{ color: theme.colors.textPrimary }}>
                    {slice.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2.5 font-mono text-sm sm:text-base shrink-0">
                  <span
                    className="font-black"
                    style={{ color: theme.colors.primary }}
                  >
                    {formatMetricNumber(slice.value, true)}
                  </span>
                  <span
                    className="text-xs sm:text-sm px-1.5 sm:px-2.5 py-0.5 rounded-md border font-bold"
                    style={{
                      backgroundColor: theme.colors.bg,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    {slice.percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="mt-5 pt-3.5 text-sm sm:text-base flex items-center justify-between border-t font-semibold"
        style={{ borderColor: theme.colors.border, color: `${theme.colors.textPrimary}B8` }}
      >
        <span className="flex items-center gap-2">
          <PieIcon className="w-4.5 h-4.5" style={{ color: theme.colors.secondary }} />
          <span>توزيع الحصص والنسب المئوية</span>
        </span>
        <span
          className="font-mono font-bold"
          style={{ color: theme.colors.primary }}
        >
          {slices.length} فئات
        </span>
      </div>
    </div>
  );
};

