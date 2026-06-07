import React from 'react';
import { ChartDataPoint } from '../types';

interface BarChartProps {
  data: ChartDataPoint[];
  color?: string;
  height?: number;
  formatValue?: (val: number) => string;
}

export const SimpleBarChart: React.FC<BarChartProps> = ({
  data,
  color = 'bg-blue-500',
  height = 200,
  formatValue = (v) => v.toString()
}) => {
  if (data.length === 0)
    return (
      <div
        className="flex items-center justify-center text-slate-400 text-sm"
        style={{ height: `${height}px` }}
      >
        No data available
      </div>
    );

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const yAxisTicks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="w-full flex" style={{ height: `${height}px` }}>
      {/* Y-axis labels container */}
      <div className="relative text-[10px] text-slate-400 font-medium pr-3" style={{ minWidth: '60px', marginBottom: '28px' }}>
        {yAxisTicks.map((tick, i) => (
          <span 
            key={i} 
            className="absolute right-3 text-right" 
            style={{ bottom: `${tick * 100}%`, transform: 'translateY(50%)' }}
          >
            {formatValue(maxValue * tick)}
          </span>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        {/* Chart area */}
        <div className="relative flex items-end justify-between gap-1.5 w-full flex-1 border-b border-l border-slate-200">
          {/* Gridlines */}
          {[75, 50, 25].map((pct) => (
            <div
              key={pct}
              className="absolute left-0 right-0 border-t border-dashed border-slate-200"
              style={{ bottom: `${pct}%`, zIndex: 0 }}
            />
          ))}

          {/* Bars */}
          {data.map((point, i) => {
            const barPct = (point.value / maxValue) * 100;
            return (
              <div
                key={i}
                className="relative flex-1 flex flex-col items-center justify-end group h-full z-10"
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap pointer-events-none">
                  {point.label}: {formatValue(point.value)}
                </div>

                {/* Bar */}
                <div
                  className={`w-full max-w-[48px] rounded-t transition-all duration-700 ease-out ${color} opacity-85 hover:opacity-100`}
                  style={{ height: `${barPct}%`, minHeight: barPct > 0 ? '4px' : '0px' }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between gap-1.5 pt-2 h-[28px] pl-1">
          {data.map((point, i) => (
            <div key={i} className="flex-1 text-center">
              <span className="text-[10px] text-slate-500 font-medium truncate block">{point.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const KPICard: React.FC<{
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendColor?: string;
}> = ({ title, value, subtext, icon, trend, trendColor = 'text-green-600' }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start mb-2">
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      {icon && <div className="text-slate-400">{icon}</div>}
    </div>
    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    {(subtext || trend) && (
      <div className="flex items-center gap-2 mt-2 text-xs">
        {trend && <span className={`font-bold ${trendColor}`}>{trend}</span>}
        {subtext && <span className="text-slate-400">{subtext}</span>}
      </div>
    )}
  </div>
);
