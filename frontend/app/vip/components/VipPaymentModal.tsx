"use client";

import { useState } from "react";
import type { VipPaymentSetting } from "@/lib/api";

interface VipPaymentModalProps {
  packageName: string;
  price: number;
  days: number;
  planCode: string;
  username: string;
  payment: VipPaymentSetting;
  isOpen: boolean;
  onClose: () => void;
}

export function VipPaymentModal({ packageName, price, days, planCode, username, payment, isOpen, onClose }: VipPaymentModalProps) {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);

  const transactionDescription = `ACCESS_${username}_${planCode}`;

  const handleCopyAccount = async () => {
    try { await navigator.clipboard.writeText(payment.accountNumber); setCopiedAccount(true); setTimeout(() => setCopiedAccount(false), 2000); } catch {}
  };
  const handleCopyDescription = async () => {
    try { await navigator.clipboard.writeText(transactionDescription); setCopiedDescription(true); setTimeout(() => setCopiedDescription(false), 2000); } catch {}
  };

  if (!isOpen) return null;

  const copyBtnStyle: React.CSSProperties = {
    borderRadius: 7, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)",
    padding: "5px 12px", fontSize: 11, color: "var(--arc-dim)", cursor: "pointer",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-[16px] p-6 shadow-2xl"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[16px] leading-none transition-opacity opacity-50 hover:opacity-100"
          style={{ color: "var(--arc-dim)", background: "none", border: "none", cursor: "pointer" }}
        >
          ✕
        </button>

        <h3 className="text-[17px] font-bold mb-4" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
          Төлбөр хийх заавар
        </h3>

        {/* Package summary */}
        <div className="mb-5 p-4 rounded-[10px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
          <p className="text-[12px] mb-1" style={{ color: "var(--arc-dim)" }}>
            Сонгосон пакет: <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{packageName}</span>
          </p>
          <p className="text-[12px] mb-1" style={{ color: "var(--arc-dim)" }}>
            Хугацаа: <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{days} хоног</span>
          </p>
          <p className="text-[22px] font-bold mt-2" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-cyan)" }}>
            {price.toLocaleString()}₮
          </p>
        </div>

        {/* Payment details */}
        <div className="mb-5 space-y-3">
          {[
            { label: "Банкны нэр", value: payment.bankName, mono: false },
            { label: "Дансны нэр", value: payment.accountName, mono: false },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <p className="text-[11px] mb-1" style={{ color: "var(--arc-muted)" }}>{label}</p>
              <p className="text-[13px] font-medium" style={{ color: "var(--arc-text)", fontFamily: mono ? "monospace" : undefined }}>{value}</p>
            </div>
          ))}

          <div>
            <p className="text-[11px] mb-1" style={{ color: "var(--arc-muted)" }}>Данс</p>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium flex-1 font-mono" style={{ color: "var(--arc-text)" }}>{payment.accountNumber}</p>
              <button onClick={handleCopyAccount} style={copyBtnStyle}>
                {copiedAccount ? "✓ Хуулагдсан" : "Хуулах"}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[11px] mb-1" style={{ color: "var(--arc-muted)" }}>Гүйлгээний утга</p>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium flex-1 font-mono break-all" style={{ color: "var(--arc-cyan)" }}>{transactionDescription}</p>
              <button onClick={handleCopyDescription} style={{ ...copyBtnStyle, flexShrink: 0 }}>
                {copiedDescription ? "✓ Хуулагдсан" : "Хуулах"}
              </button>
            </div>
          </div>
        </div>

        {payment.note && (
          <div className="mb-5 p-3 rounded-[10px]" style={{ background: "oklch(0.72 0.17 195/.08)", border: "1px solid oklch(0.72 0.17 195/.25)" }}>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--arc-cyan)" }}>{payment.note}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full rounded-[9px] px-4 py-2.5 text-[13px] font-medium transition-colors"
          style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}
        >
          Ойлголоо
        </button>
      </div>
    </div>
  );
}
