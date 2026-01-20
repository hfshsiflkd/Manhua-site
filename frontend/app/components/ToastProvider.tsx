"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
};

type ToastOptions = {
  duration?: number;
};

type ToastContextValue = {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; accent: string; label: string }
> = {
  success: {
    container: "border-emerald-500/40 bg-emerald-500/10 text-emerald-50",
    accent: "bg-emerald-400",
    label: "Амжилттай",
  },
  error: {
    container: "border-rose-500/40 bg-rose-500/10 text-rose-50",
    accent: "bg-rose-400",
    label: "Алдаа",
  },
  info: {
    container: "border-cyan-500/40 bg-cyan-500/10 text-cyan-50",
    accent: "bg-cyan-400",
    label: "Мэдээлэл",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeoutId = timeouts.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeouts.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    (variant: ToastVariant, message: string, options?: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const duration =
        options?.duration ?? (variant === "error" ? 5000 : 3000);
      const item: ToastItem = { id, message, variant, duration };

      setToasts((prev) => [...prev, item]);
      const timeoutId = window.setTimeout(() => dismiss(id), duration);
      timeouts.current.set(id, timeoutId);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message, options) => pushToast("success", message, options),
      error: (message, options) => pushToast("error", message, options),
      info: (message, options) => pushToast("info", message, options),
      dismiss,
    }),
    [dismiss, pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[9999] flex w-[min(360px,90vw)] flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const styles = VARIANT_STYLES[toast.variant];
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 rounded-2xl border px-3 py-2 shadow-xl shadow-black/40 backdrop-blur ${styles.container}`}
            >
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${styles.accent}`}
              />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wide text-slate-300/80">
                  {styles.label}
                </p>
                <p className="text-[12px] leading-snug text-slate-100">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-full px-2 py-1 text-[12px] text-slate-300 hover:text-slate-100"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
