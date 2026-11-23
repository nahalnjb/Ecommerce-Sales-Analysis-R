import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map(toast => {
          let bg = 'bg-slate-900 border-slate-700 text-slate-100';
          let Icon = Info;
          let iconColor = 'text-blue-400';

          if (toast.type === 'success') {
            bg = 'bg-[#064E3B] border-emerald-600 text-emerald-100';
            Icon = CheckCircle;
            iconColor = 'text-emerald-400';
          } else if (toast.type === 'error') {
            bg = 'bg-[#4C0519] border-rose-600 text-rose-100';
            Icon = AlertCircle;
            iconColor = 'text-rose-400';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all ${bg}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
                <span className="text-sm font-medium">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
