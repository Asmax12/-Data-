import React, { useState } from 'react';
import { formatMetricNumber } from '../../utils/analyticsEngine';
import { Check } from 'lucide-react';

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-[#4B315F]/60 text-xs">
        لا توجد بيانات كافية لعرض هذا المخطط
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-2.5 pt-1">
        {data.map((item, idx) => {
          const ratio = Math.max((item.value / maxValue) * 100, 4);
          const isHovered = hoveredIndex === idx;
          const isSelected = activeFilter === item.label;

          // Palette gradient accents
          const barGradient = isSelected
            ? 'bg-gradient-to-r from-[#4B315F] to-[#29232D]'
            : idx === 0
            ? 'bg-gradient-to-r from-[#F4A261] to-[#E76F7A]'
            : idx % 2 === 0
            ? 'bg-gradient-to-r from-[#F4A261] to-[#4B315F]'
            : 'bg-gradient-to-r from-[#4B315F] to-[#B9A3D4]';

          return (
            <div
              key={idx}
              className={`group cursor-pointer rounded-xl p-2.5 transition-all duration-200 ${
                isSelected
                  ? 'bg-[#4B315F]/10 ring-1 ring-[#4B315F] shadow-2xs'
                  : isHovered
                  ? 'bg-white/95 shadow-sm translate-x-0.5'
                  : 'hover:bg-white/70'
              }`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onBarClick?.(item.label)}
              title={`اضغط للتصفية حسب ${item.label}`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-[#29232D]">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                      isSelected
                        ? 'bg-[#4B315F] text-[#FFF9F2]'
                        : idx === 0
                        ? 'bg-[#F4A261]/25 text-[#4B315F]'
                        : 'bg-[#B9A3D4]/20 text-[#29232D]/70'
                    }`}
                  >
                    {isSelected ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                  </span>
                  <span className="truncate max-w-[190px] font-semibold text-[#29232D]">
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-[#4B315F] text-xs">
                    {formatMetricNumber(item.value, true)}
                  </span>
                  {item.percentage !== undefined && (
                    <span className="text-[10px] text-[#29232D]/50 bg-[#FFF9F2] px-1.5 py-0.5 rounded font-medium border border-[#B9A3D4]/20">
                      {item.percentage}%
                    </span>
                  )}
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full bg-[#B9A3D4]/15 rounded-full h-2.5 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${barGradient} ${
                    isHovered ? 'opacity-95 shadow-xs' : 'opacity-90'
                  }`}
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 text-[11px] text-[#29232D]/60 flex items-center justify-between border-t border-[#B9A3D4]/20 font-medium">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F4A261]" />
          <span>اضغط على أي فئة للتركيز عليها وتصفية اللوحة</span>
        </span>
        <span className="font-mono text-[#4B315F]">{data.length} عناصر</span>
      </div>
    </div>
  );
};
