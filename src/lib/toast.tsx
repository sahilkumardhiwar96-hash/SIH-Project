import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type Toast = {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type ToastContextType = {
  toast: (options: { message: string; title?: string; type?: ToastType; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ message, title, type = 'info', duration = 4000 }: { message: string; title?: string; type?: ToastType; duration?: number }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, title, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => toast({ message, title, type: 'success' }), [toast]);
  const error = useCallback((message: string, title?: string) => toast({ message, title, type: 'error' }), [toast]);
  const info = useCallback((message: string, title?: string) => toast({ message, title, type: 'info' }), [toast]);
  const warning = useCallback((message: string, title?: string) => toast({ message, title, type: 'warning' }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-success-600 shrink-0 mt-0.5" />,
            error: <AlertCircle className="w-5 h-5 text-error-600 shrink-0 mt-0.5" />,
            warning: <AlertCircle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />,
            info: <Info className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />,
          };

          const borders = {
            success: 'border-success-200 bg-white/95 text-ink-900 shadow-lg shadow-success-500/10',
            error: 'border-error-200 bg-white/95 text-ink-900 shadow-lg shadow-error-500/10',
            warning: 'border-warning-200 bg-white/95 text-ink-900 shadow-lg shadow-warning-500/10',
            info: 'border-primary-200 bg-white/95 text-ink-900 shadow-lg shadow-primary-500/10',
          };

          return (
            <div
              key={t.id}
              role="alert"
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md transition-all duration-300 animate-slide-up',
                borders[t.type]
              )}
            >
              {icons[t.type]}
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-sm font-bold text-ink-900">{t.title}</p>}
                <p className="text-sm text-ink-600 leading-snug">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-md text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
