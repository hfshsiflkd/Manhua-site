"use client";

import { useState } from "react";

interface VipBankTransferPaymentProps {
  planMonths: number;
  planPrice: number;
  username: string;
  onClose: () => void;
}

export function VipBankTransferPayment({ planMonths, planPrice, username, onClose }: VipBankTransferPaymentProps) {
  const [copied, setCopied] = useState(false);
  const transactionDescription = `VIP – ${username}`;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(transactionDescription); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
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

        <div className="mb-5 p-3 rounded-[10px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
          <p className="text-[12px] mb-1" style={{ color: "var(--arc-dim)" }}>
            Сонгосон төлөвлөгөө: <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{planMonths} сар</span>
          </p>
          <p className="text-[22px] font-bold mt-1" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-cyan)" }}>
            {planPrice.toLocaleString()}₮
          </p>
        </div>

        <div className="mb-5 space-y-3">
          {[
            { label: "Банкны нэр", value: "ХААН Банк" },
            { label: "Дансны дугаар", value: "5000 1234 5678 9012", mono: true },
            { label: "Хүлээн авагчийн нэр", value: "МАНХУА ПЛАТФОРМ" },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <p className="text-[11px] mb-1" style={{ color: "var(--arc-muted)" }}>{label}</p>
              <p className="text-[13px] font-medium" style={{ color: "var(--arc-text)", fontFamily: mono ? "monospace" : undefined }}>{value}</p>
            </div>
          ))}
          <div>
            <p className="text-[11px] mb-1" style={{ color: "var(--arc-muted)" }}>Гүйлгээний утга</p>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium flex-1 font-mono" style={{ color: "var(--arc-cyan)" }}>{transactionDescription}</p>
              <button
                onClick={handleCopy}
                className="rounded-[7px] px-3 py-1.5 text-[11px] font-medium transition-colors"
                style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
              >
                {copied ? "✓ Хуулагдсан" : "Хуулах"}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-5 p-3 rounded-[10px]" style={{ background: "oklch(0.72 0.17 195/.08)", border: "1px solid oklch(0.72 0.17 195/.25)" }}>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--arc-cyan)" }}>
            Дээрх дансанд шилжүүлсний дараа админ баталгаажуулна.
          </p>
        </div>

        <p className="text-[11px] mb-5" style={{ color: "var(--arc-muted)" }}>
          Хэрвээ VIP идэвхтэй бол хугацаа автоматаар сунгагдана.
        </p>

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
