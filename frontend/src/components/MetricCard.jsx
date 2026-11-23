import React from 'react';

export const MetricCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }) => {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const badgeClass = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${badgeClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white tracking-tight mb-1">
        {value !== undefined && value !== null ? value : '—'}
      </div>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
