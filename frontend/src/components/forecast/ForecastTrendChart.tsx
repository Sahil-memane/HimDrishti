import React from 'react';

interface TrendPoint {
  day: number;
  value: number | null;
}

interface ForecastTrendChartProps {
  title: string;
  unit: string;
  color: string;
  points: TrendPoint[];
}

/**
 * Minimal inline SVG line chart for a real day-1..7 backend series. No
 * charting library, no synthetic points — days with a null value (not
 * returned by the backend) are simply skipped, leaving a visible gap
 * rather than interpolating a value that was never computed.
 */
export const ForecastTrendChart: React.FC<ForecastTrendChartProps> = ({ title, unit, color, points }) => {
  const valid = points.filter((p) => p.value != null) as Array<{ day: number; value: number }>;

  if (valid.length === 0) {
    return (
      <div className="text-[10px] font-mono text-[#6b7f8c] italic py-2">
        {title}: no data available for this voyage
      </div>
    );
  }

  const width = 260;
  const height = 64;
  const padX = 6;
  const padY = 8;
  const minDay = 1;
  const maxDay = 7;
  const values = valid.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valSpan = maxVal - minVal || 1;

  const xFor = (day: number) => padX + ((day - minDay) / (maxDay - minDay)) * (width - padX * 2);
  const yFor = (v: number) => height - padY - ((v - minVal) / valSpan) * (height - padY * 2);

  const pathD = valid.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.day).toFixed(1)} ${yFor(p.value).toFixed(1)}`).join(' ');

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] font-bold text-[#bbc9cf] uppercase tracking-wider">{title}</span>
        <span className="text-[9px] font-mono text-[#6b7f8c]">
          {minVal.toFixed(1)}–{maxVal.toFixed(1)} {unit}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {valid.map((p) => (
          <circle key={p.day} cx={xFor(p.day)} cy={yFor(p.value)} r="2.5" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between mt-0.5">
        {Array.from({ length: 7 }, (_, i) => i + 1).map((d) => (
          <span key={d} className="text-[8px] font-mono text-[#6b7f8c]">
            D{d}
          </span>
        ))}
      </div>
    </div>
  );
};
