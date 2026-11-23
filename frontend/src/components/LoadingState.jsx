import React from 'react';
import { Loader2, Terminal } from 'lucide-react';

export const LoadingState = ({ message = "Executing analytical model in R...", subMessage = "Rscript subprocess running statistical algorithms" }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-full border-2 border-slate-800 flex items-center justify-center bg-slate-900/60">
          <Terminal className="w-6 h-6 text-sky-400" />
        </div>
        <Loader2 className="w-16 h-16 text-blue-500 animate-spin absolute -top-1 -left-1" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{message}</h3>
      <p className="text-xs text-slate-400 max-w-sm">{subMessage}</p>
    </div>
  );
};

export const EmptyState = ({ title = "No Data Found", description = "Select an active dataset or run analysis to view results.", icon: Icon, actionButton }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-[#0F172A]/50 border border-slate-800/80 rounded-xl">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-300 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-4">{description}</p>
      {actionButton}
    </div>
  );
};
