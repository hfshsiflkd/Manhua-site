"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ConfirmOptions = { title: string; description?: string; confirmText?: string; cancelText?: string };
type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: "" });

  const confirm = useCallback((nextOptions: ConfirmOptions) => {
    setOptions(nextOptions);
    setOpen(true);
    return new Promise<boolean>((resolve) => { resolverRef.current = resolve; });
  }, []);

  const handleClose = useCallback((value: boolean) => {
    setOpen(false);
    if (resolverRef.current) { resolverRef.current(value); resolverRef.current = null; }
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full max-w-sm rounded-[16px] p-5 shadow-2xl"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
          >
            <h3 className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
              {options.title}
            </h3>
            {options.description && (
              <p className="mt-2 text-[13px]" style={{ color: "var(--arc-dim)" }}>{options.description}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="rounded-[9px] px-3 py-2 text-[12px] font-medium transition-colors"
                style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}
              >
                {options.cancelText ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className="rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-all hover:brightness-110"
                style={{ background: "var(--arc-rose)", color: "#fff", border: "none", cursor: "pointer" }}
              >
                {options.confirmText ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
