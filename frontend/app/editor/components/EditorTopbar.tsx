"use client";

interface EditorTopbarProps {
  onMenuClick: () => void;
  user: { username: string; role?: string } | null;
}

export default function EditorTopbar({ onMenuClick, user }: EditorTopbarProps) {
  const roleNorm = (user?.role || "").toLowerCase().trim();
  const isEditor = roleNorm === "editor" || roleNorm === "translator";

  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden"
      style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-bg)" }}
    >
      <button
        onClick={onMenuClick}
        className="flex items-center justify-center rounded-[9px] p-2 transition-opacity hover:opacity-80"
        style={{ color: "var(--arc-dim)", border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium truncate max-w-[120px]" style={{ color: "var(--arc-dim)" }}>
          {user?.username}
        </span>
        {isEditor && (
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-bold"
            style={{ background: "var(--arc-cyan)", color: "#07070e" }}
          >
            EDITOR
          </span>
        )}
      </div>
    </div>
  );
}
