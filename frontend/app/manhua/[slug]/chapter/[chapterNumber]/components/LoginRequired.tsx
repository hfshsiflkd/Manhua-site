"use client";

export default function LoginRequired({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
      <p className="text-[13px]" style={{ color: "var(--arc-dim)" }}>
        Энэ манхуа уншихын тулд эхлээд нэвтэрнэ үү 🔒
      </p>
      <button
        onClick={onLogin}
        className="rounded-[9px] px-4 py-2 text-[13px] font-semibold transition-all hover:brightness-110"
        style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
      >
        Нэвтрэх
      </button>
    </div>
  );
}
