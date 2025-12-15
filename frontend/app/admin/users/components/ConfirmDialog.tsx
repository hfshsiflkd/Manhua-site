"use client";

export default function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl shadow-black/60">
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        {description && <p className="mt-2 text-sm text-slate-400">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2 text-xs font-semibold text-slate-50 shadow shadow-rose-500/40"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

