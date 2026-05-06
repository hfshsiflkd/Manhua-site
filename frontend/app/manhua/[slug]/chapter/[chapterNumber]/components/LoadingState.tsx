"use client";

export default function LoadingState() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--arc-bg, #07070e)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      {/* Spinner */}
      <div style={{ position: "relative", width: 48, height: 48 }}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          style={{ animation: "chapter-spin 0.9s linear infinite" }}
        >
          <circle
            cx="24" cy="24" r="20"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="3"
          />
          <path
            d="M24 4 A20 20 0 0 1 44 24"
            stroke="oklch(0.72 0.17 195)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <p style={{ fontSize: 12, color: "var(--arc-muted, #6b6b80)", letterSpacing: "0.06em" }}>
        Ачааллаж байна…
      </p>

      <style>{`
        @keyframes chapter-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
