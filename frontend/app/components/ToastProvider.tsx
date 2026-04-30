"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastVariant = "success" | "error" | "info";
type ToastItem = { id: string; message: string; variant: ToastVariant; duration: number };
type ToastOptions = { duration?: number };
type ToastContextValue = {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; dot: string; label: string }> = {
  success: {
    bg: "oklch(0.75 0.16 145/.08)",
    border: "oklch(0.75 0.16 145/.35)",
    dot: "oklch(0.75 0.16 145)",
    label: "Амжилттай",
  },
  error: {
    bg: "oklch(0.65 0.22 15/.08)",
    border: "oklch(0.65 0.22 15/.35)",
    dot: "oklch(0.65 0.22 15)",
    label: "Алдаа",
  },
  info: {
    bg: "oklch(0.72 0.17 195/.08)",
    border: "oklch(0.72 0.17 195/.35)",
    dot: "oklch(0.72 0.17 195)",
    label: "Мэдээлэл",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tid = timeouts.current.get(id);
    if (tid) { window.clearTimeout(tid); timeouts.current.delete(id); }
  }, []);

  const pushToast = useCallback((variant: ToastVariant, message: string, options?: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const duration = options?.duration ?? (variant === "error" ? 5000 : 3000);
    setToasts((prev) => [...prev, { id, message, variant, duration }]);
    const tid = window.setTimeout(() => dismiss(id), duration);
    timeouts.current.set(id, tid);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({
    success: (m, o) => pushToast("success", m, o),
    error: (m, o) => pushToast("error", m, o),
    info: (m, o) => pushToast("info", m, o),
    dismiss,
  }), [dismiss, pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[9999] flex w-[min(360px,90vw)] flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const s = VARIANT_STYLES[toast.variant];
          return (
            <div
              key={toast.id}
              className="flex items-start gap-3 rounded-[12px] px-3 py-2.5 shadow-xl"
              style={{ background: s.bg, border: `1px solid ${s.border}`, backdropFilter: "blur(12px)" }}
            >
              <span className="mt-[3px] h-2 w-2 rounded-full shrink-0" style={{ background: s.dot }} />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: s.dot, opacity: 0.8 }}>{s.label}</p>
                <p className="text-[12px] leading-snug" style={{ color: "var(--arc-text)" }}>{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-full px-1 text-[14px] leading-none transition-opacity opacity-50 hover:opacity-100"
                style={{ color: "var(--arc-dim)" }}
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
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
