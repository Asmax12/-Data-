import React, { useState } from 'react';
import { formatMetricNumber } from '../../utils/analyticsEngine';
import { PieChart as PieIcon } from 'lucide-react';

interface DonutChartProps {
  data: { label: string; value: number; percentage?: number }[];
  title: string;
  onSliceClick?: (label: string) => void;
  activeFilter?: string | null;
}

const PALETTE = ['#4B315F', '#F4A261', '#E76F7A', '#B9A3D4', '#29232D', '#D97706'];

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  onSliceClick,
  activeFilter,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-[#4B315F]/70 text-base font-semibold">
        لا توجد بيانات كافية لعرض التوزيع
      </div>
    );
  }

  const total = data.reduce((acc, curr) => acc + curr.value, 0) || 1;

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
                <span className="text-sm text-[#29232D] truncate max-w-[110px] font-bold">
                  {activeItem.label}
                </span>
                <span className="text-2xl font-black text-[#4B315F] font-mono mt-0.5">
                  {activeItem.percent}%
                </span>
              </>
            ) : (
              <>
                <span className="text-xs sm:text-sm text-[#29232D]/70 uppercase tracking-wider font-bold">
                  الإجمالي
                </span>
                <span className="text-base sm:text-lg font-black text-[#4B315F] font-mono mt-0.5">
                  {formatMetricNumber(total, true)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3 w-full">
          {slices.slice(0, 5).map((slice, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={idx}
                className={`flex items-center justify-between text-base p-3 rounded-xl cursor-pointer transition-all ${
                  slice.isSelected
                    ? 'bg-[#4B315F]/10 ring-2 ring-[#4B315F] shadow-xs'
                    : isHovered
                    ? 'bg-white shadow-xs translate-x-1'
                    : 'hover:bg-white/70'
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSliceClick?.(slice.label)}
              >
                <div className="flex items-center gap-3 truncate">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate max-w-[160px] font-bold text-base text-[#29232D]">
                    {slice.label}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 font-mono text-base">
                  <span className="font-black text-[#4B315F]">
                    {formatMetricNumber(slice.value, true)}
                  </span>
                  <span className="text-xs sm:text-sm text-[#29232D]/80 bg-[#FFF9F2] px-2.5 py-0.5 rounded-md border border-[#B9A3D4]/25 font-bold">
                    {slice.percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 pt-3.5 text-sm sm:text-base text-[#29232D]/75 flex items-center justify-between border-t border-[#B9A3D4]/20 font-semibold">
        <span className="flex items-center gap-2">
          <PieIcon className="w-4.5 h-4.5 text-[#F4A261]" />
          <span>توزيع الحصص والنسب المئوية</span>
        </span>
        <span className="font-mono font-bold text-[#4B315F]">{slices.length} فئات</span>
      </div>
    </div>
  );
};
