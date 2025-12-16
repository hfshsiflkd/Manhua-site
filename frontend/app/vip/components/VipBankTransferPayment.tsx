"use client";

import { useState } from "react";

// Temporary payment component showing bank transfer instructions
// TODO: Replace with VipQPayPayment when QPay integration is ready

interface VipBankTransferPaymentProps {
  planMonths: number;
  planPrice: number;
  username: string;
  onClose: () => void;
}

export function VipBankTransferPayment({
  planMonths,
  planPrice,
  username,
  onClose,
}: VipBankTransferPaymentProps) {
  const [copied, setCopied] = useState(false);

  const transactionDescription = `VIP – ${username}`;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCopyDescription = async () => {
    try {
      await navigator.clipboard.writeText(transactionDescription);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6"
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

        {/* Plan Summary */}
        <div className="mb-6 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <p className="text-sm text-slate-300 mb-1">
            Сонгосон төлөвлөгөө: <span className="font-semibold">{planMonths} сар</span>
          </p>
          <p className="text-base font-bold text-slate-100">
            {planPrice.toLocaleString()}₮
          </p>
        </div>

        {/* Bank Account Info */}
        <div className="mb-6 space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">Банкны нэр</p>
            <p className="text-sm font-medium text-slate-200">ХААН Банк</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Дансны дугаар</p>
            <p className="text-sm font-medium text-slate-200 font-mono">
              5000 1234 5678 9012
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Хүлээн авагчийн нэр</p>
            <p className="text-sm font-medium text-slate-200">
              МАНХУА ПЛАТФОРМ
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Гүйлгээний утга</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-200 font-mono flex-1">
                {transactionDescription}
              </p>
              <button
                onClick={handleCopyDescription}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-colors"
              >
                {copied ? "✓ Хуулагдсан" : "Хуулах"}
              </button>
            </div>
          </div>
        </div>

        {/* Instruction */}
        <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-xs text-blue-300 leading-relaxed">
            Дээрх дансанд шилжүүлсний дараа админ баталгаажуулна.
          </p>
        </div>

        {/* Extension Info */}
        <div className="mb-6">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Хэрвээ VIP идэвхтэй бол хугацаа автоматаар сунгагдана.
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
        >
          Ойлголоо
        </button>
      </div>
    </div>
  );
}

