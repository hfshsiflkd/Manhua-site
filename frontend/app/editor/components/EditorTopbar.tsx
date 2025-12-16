"use client";

import { useAuth } from "@/context/AuthContext";

interface EditorTopbarProps {
  onMenuClick: () => void;
  user: { username: string; role?: string } | null;
}

export default function EditorTopbar({ onMenuClick, user }: EditorTopbarProps) {
  const roleRaw = user?.role;
  const roleNorm = (roleRaw || "").toLowerCase().trim();
  const isEditor = roleNorm === "editor" || roleNorm === "translator";

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm px-4 py-3 lg:hidden">
      <button
        onClick={onMenuClick}
        className="flex items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-slate-900 hover:text-slate-100"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">
          {user?.username}
        </span>
        {isEditor && (
          <span className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-2 py-0.5 text-[9px] font-bold text-slate-950">
            EDITOR
          </span>
        )}
      </div>
    </div>
  );
}

