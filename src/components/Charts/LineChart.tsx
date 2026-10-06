import React, { useState } from 'react';
import { formatMetricNumber } from '../../utils/analyticsEngine';
import { TrendingUp } from 'lucide-react';

interface LineChartProps {
  data: { label: string; value: number }[];
  title: string;
}

export const LineChart: React.FC<LineChartProps> = ({ data, title }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length < 2) {
    return (
      <div className="p-8 text-center text-[#4B315F]/70 text-base font-semibold">
        لا توجد نقاط زمنية كافية لرسم منحنى التطور
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const width = 520;
  const height = 210;
  const paddingX = 44;
  const paddingY = 28;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((d.value - minVal) / range) * (height - paddingY * 2);
    return { x, y, label: d.label, value: d.value };
  });

  // Calculate smooth SVG cubic Bézier path
  const getCurvedPath = (pts: typeof points) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const pathD = getCurvedPath(points);
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  // Calculate overall trend
  const firstVal = points[0]?.value || 0;
  const lastVal = points[points.length - 1]?.value || 0;
  const growth = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 100) : 0;

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="relative w-full overflow-hidden pt-2 pb-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="premiumLineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F4A261" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#4B315F" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#FFF9F2" stopOpacity="0.0" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4B315F" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#B9A3D4"
            strokeOpacity="0.25"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="#B9A3D4"
            strokeOpacity="0.15"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#B9A3D4"
            strokeOpacity="0.4"
          />

          {/* Area fill */}
          <path d={areaD} fill="url(#premiumLineGrad)" />

          {/* Smooth curved stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#4B315F"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#shadow)"
          />

          {/* Vertical guideline on hover */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <line
              x1={points[hoveredIndex].x}
              y1={paddingY}
              x2={points[hoveredIndex].x}
              y2={height - paddingY}
              stroke="#F4A261"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Points */}
          {points.map((p, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 7 : 4.5}
                  fill="#FFF9F2"
                  stroke={isHovered ? '#F4A261' : '#4B315F'}
                  strokeWidth={isHovered ? 4 : 2.5}
                  className="transition-all duration-200"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating tooltip */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute bg-[#29232D] text-[#FFF9F2] text-sm px-4 py-2.5 rounded-xl shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full border border-white/10 z-20"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100}%`,
            }}
          >
            <div className="text-sm text-[#FFF9F2]/90 font-semibold">
              {points[hoveredIndex].label}
            </div>
            <div className="text-[#F4A261] font-mono font-black text-base mt-0.5">
              {formatMetricNumber(points[hoveredIndex].value, true)}
            </div>
          </div>
        )}
      </div>

      {/* Axis dates (large, clear, legible) */}
      <div className="flex justify-between items-center text-sm sm:text-base text-[#29232D]/85 px-4 pt-2.5 font-mono font-bold">
        <span>{data[0]?.label}</span>
        {data.length > 2 && <span className="opacity-75">{data[Math.floor(data.length / 2)]?.label}</span>}
        <span>{data[data.length - 1]?.label}</span>
      </div>

      <div className="mt-5 pt-3.5 text-sm sm:text-base text-[#29232D]/75 flex items-center justify-between border-t border-[#B9A3D4]/20 font-semibold">
        <span className="flex items-center gap-2 text-[#4B315F] font-bold">
          <TrendingUp className="w-4.5 h-4.5 text-[#F4A261]" />
          <span>
            {growth >= 0 ? `نمو بمعدل تقريبي +${growth}%` : `تغير بمعدل ${growth}%`}
          </span>
        </span>
        <span className="font-mono font-bold text-[#4B315F]">{data.length} فترات زمنية</span>
      </div>
    </div>
  );
};
