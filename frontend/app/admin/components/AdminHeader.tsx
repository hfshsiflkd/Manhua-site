"use client";

interface Props {
  statsLoaded: boolean;
}

export default function AdminHeader({ statsLoaded }: Props) {
  return (
    <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-[22px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
          Overview
        </h2>
        <p className="mt-1 text-[12px]" style={{ color: "var(--arc-muted)" }}>
          Системийн үндсэн үзүүлэлтүүд, хэрэглэгчид ба контентын статистик.
        </p>
      </div>
      <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--arc-dim)" }}>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium"
          style={{
            border: statsLoaded ? "1px solid oklch(0.75 0.17 145/.4)" : "1px solid var(--arc-border)",
            background: statsLoaded ? "oklch(0.75 0.17 145/.08)" : "var(--arc-elevated)",
            color: statsLoaded ? "oklch(0.8 0.14 145)" : "var(--arc-dim)",
          }}
        >
          ● {statsLoaded ? "Online" : "Loading"}
        </span>
        <span className="hidden md:inline" style={{ color: "var(--arc-muted)" }}>/api/admin/stats</span>
      </div>
    </header>
  );
}
