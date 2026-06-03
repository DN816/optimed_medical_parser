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
  if (data.length === 0) return <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data available</div>;

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="w-full flex items-end justify-between gap-2 pt-6" style={{ height: `${height}px` }}>
      {data.map((point, i) => (
        <div key={i} className="flex-1 flex flex-col items-center group relative">
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
             {point.label}: {formatValue(point.value)}
          </div>
          
          {/* Bar */}
          <div 
            className={`w-full max-w-[40px] rounded-t-sm transition-all duration-500 ${color} hover:opacity-80`}
            style={{ height: `${(point.value / maxValue) * 100}%` }}
          ></div>
          
          {/* Label */}
          <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center">{point.label}</span>
        </div>
      ))}
    </div>
  );
};

export const KPICard: React.FC<{ title: string; value: string | number; subtext?: string; icon?: React.ReactNode; trend?: string; trendColor?: string }> = ({ 
    title, value, subtext, icon, trend, trendColor = 'text-green-600' 
}) => (
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
