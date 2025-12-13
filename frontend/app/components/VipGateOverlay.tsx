"use client";

type Props = {
  title?: string;
  subtitle?: string;
  onGoVip?: () => void;
  onBack?: () => void;
};

export default function VipGateOverlay({
  title = "VIP эрх шаардлагатай",
  subtitle = "Таны trial дууссан байна. VIP эрх авснаар бүх chapter-уудыг бүрэн уншина.",
  onGoVip,
  onBack,
}: Props) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      <div className="relative z-10 w-[92%] max-w-md rounded-2xl border border-slate-700 bg-slate-900/90 p-6 text-center shadow-2xl shadow-black/60">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
          🔒
        </div>

        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onGoVip}
            className="inline-flex items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
          >
            VIP авах
          </button>

          <button
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Буцах
          </button>
        </div>
      </div>
    </div>
  );
}
