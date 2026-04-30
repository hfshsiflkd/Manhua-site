"use client";

import React from "react";

const baseStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "8px 12px",
  color: "var(--arc-text)", outline: "none",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
};

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block mb-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>
      {children}
    </label>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { small?: boolean }
) {
  const { small, style, onFocus, onBlur, ...rest } = props;
  return (
    <input
      {...rest}
      style={{ ...baseStyle, fontSize: small ? 11 : 12, ...style }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "oklch(0.72 0.17 195/.5)"; onFocus?.(e); }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--arc-border)"; onBlur?.(e); }}
    />
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  const { style, onFocus, onBlur, ...rest } = props;
  return (
    <textarea
      {...rest}
      style={{ ...baseStyle, fontSize: 12, resize: "vertical", ...style }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "oklch(0.72 0.17 195/.5)"; onFocus?.(e); }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--arc-border)"; onBlur?.(e); }}
    />
  );
}
