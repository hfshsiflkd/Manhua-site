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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0" style={{ background: "rgba(7,7,14,.88)", backdropFilter: "blur(8px)" }} />
      <div
        className="relative z-10 w-[92%] max-w-md rounded-[16px] p-6 text-center shadow-2xl"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] text-2xl"
          style={{ background: "oklch(0.82 0.16 85/.1)", border: "1px solid oklch(0.82 0.16 85/.3)" }}
        >
          🔒
        </div>
        <h3 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
          {title}
        </h3>
        <p className="mt-2 text-[13px]" style={{ color: "var(--arc-dim)" }}>{subtitle}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onGoVip}
            className="inline-flex items-center justify-center rounded-[10px] px-4 py-2.5 text-[13px] font-bold transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,var(--arc-amber),oklch(0.7 0.18 60))", color: "#07070e", border: "none", cursor: "pointer" }}
          >
            VIP авах
          </button>
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13px] font-medium transition-colors"
            style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}
          >
            Буцах
          </button>
        </div>
      </div>
    </div>
  );
}
