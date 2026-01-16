'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertItem {
  id: string;
  type: AlertType;
  title?: string;
  message: string;
}

interface AlertContextValue {
  notify: (alert: Omit<AlertItem, 'id'>) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

const typeStyles: Record<AlertType, { border: string; title: string }> = {
  success: { border: 'border-green-500', title: 'Success' },
  error: { border: 'border-red-500', title: 'Error' },
  warning: { border: 'border-yellow-500', title: 'Warning' },
  info: { border: 'border-blue-500', title: 'Info' },
};

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const notify = useCallback((alert: Omit<AlertItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const item: AlertItem = { id, ...alert };
    setAlerts((prev) => [...prev, item]);
    window.setTimeout(() => {
      setAlerts((prev) => prev.filter((entry) => entry.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
        {alerts.map((alert) => {
          const style = typeStyles[alert.type];
          return (
            <div
              key={alert.id}
              className={`min-w-[260px] max-w-[360px] bg-vscode-editor border ${style.border} border-l-4 rounded shadow-lg px-3 py-2 text-vscode-text text-xs`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{alert.title || style.title}</div>
                  <div className="opacity-90 mt-1">{alert.message}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAlerts((prev) => prev.filter((entry) => entry.id !== alert.id))}
                  className="p-1 rounded hover:bg-vscode-hover"
                  title="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}
