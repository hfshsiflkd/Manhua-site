"use client";

export default function ChapterNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
      <p className="text-[13px]" style={{ color: "oklch(0.75 0.18 15)" }}>
        Chapter олдсонгүй эсвэл устгагдсан байна.
      </p>
      <button
        onClick={onBack}
        className="rounded-full px-3 py-1 text-[12px] transition-colors"
        style={{ border: "1px solid var(--arc-border)", color: "var(--arc-dim)", background: "transparent", cursor: "pointer" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-cyan)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-cyan)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)"; (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)"; }}
      >
        Буцах
      </button>
    </div>
  );
}
