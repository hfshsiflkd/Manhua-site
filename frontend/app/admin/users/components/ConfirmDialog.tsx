"use client";

export default function ConfirmDialog({ open, title, description, onCancel, onConfirm }: {
  open: boolean;
  title: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-sm rounded-[16px] p-5 shadow-2xl" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <h3 className="text-[15px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>{title}</h3>
        {description && <p className="mt-2 text-[13px]" style={{ color: "var(--arc-muted)" }}>{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-[9px] px-3 py-2 text-[12px] font-medium transition-colors"
            style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-all hover:brightness-110"
            style={{ background: "var(--arc-rose)", color: "#07070e", border: "none", cursor: "pointer" }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
