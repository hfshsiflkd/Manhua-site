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

export function VipPaymentModal({
  packageName,
  price,
  days,
  planCode,
  username,
  payment,
  isOpen,
  onClose,
}: VipPaymentModalProps) {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);

  const transactionDescription = `ACCESS_${username}_${planCode}`;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(payment.accountNumber);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyDescription = async () => {
    try {
      await navigator.clipboard.writeText(transactionDescription);
      setCopiedDescription(true);
      setTimeout(() => setCopiedDescription(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/90 shadow-lg shadow-black/40 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
        >
          ✕
        </button>

        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Төлбөр хийх заавар
        </h3>

        {/* Package Summary */}
        <div className="mb-6 p-4 rounded-xl border border-slate-800 bg-slate-900/70">
          <p className="text-sm text-slate-300 mb-1">
            Сонгосон пакет: <span className="font-semibold text-slate-100">{packageName}</span>
          </p>
          <p className="text-sm text-slate-300 mb-1">
            Хугацаа: <span className="font-semibold text-slate-100">{days} хоног</span>
          </p>
          <p className="text-base font-bold text-slate-100 mt-2">
            {price.toLocaleString()}₮
          </p>
        </div>

        {/* Payment Instructions */}
        <div className="mb-6 space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Банкны нэр</p>
            <p className="text-sm font-medium text-slate-200">{payment.bankName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Дансны нэр</p>
            <p className="text-sm font-medium text-slate-200">{payment.accountName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Данс</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-200 font-mono flex-1">
                {payment.accountNumber}
              </p>
              <button
                onClick={handleCopyAccount}
                className="rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {copiedAccount ? "✓ Хуулагдсан" : "Хуулах"}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Гүйлгээний утга</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-200 font-mono flex-1 break-all">
                {transactionDescription}
              </p>
              <button
                onClick={handleCopyDescription}
                className="rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
              >
                {copiedDescription ? "✓ Хуулагдсан" : "Хуулах"}
              </button>
            </div>
          </div>
        </div>

        {/* Instruction */}
        {payment.note && (
          <div className="mb-6 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10">
            <p className="text-xs text-blue-300 leading-relaxed">
              {payment.note}
            </p>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full rounded-full border border-slate-700/80 bg-slate-950/80 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900 transition-colors"
        >
          Ойлголоо
        </button>
      </div>
    </div>
  );
}

