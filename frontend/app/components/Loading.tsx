export default function Loading() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "60vh" }}
    >
      <div style={{ position: "relative", width: 44, height: 44 }}>
        <svg
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
          style={{ animation: "spin 0.9s linear infinite" }}
        >
          <circle
            cx="22"
            cy="22"
            r="18"
            stroke="var(--arc-border)"
            strokeWidth="3"
          />
          <circle
            cx="22"
            cy="22"
            r="18"
            stroke="var(--arc-cyan)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="28 84"
            strokeDashoffset="0"
          />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
