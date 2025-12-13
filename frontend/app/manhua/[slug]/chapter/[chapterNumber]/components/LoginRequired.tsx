"use client";

export default function LoginRequired({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-slate-200">
      <p className="mb-3 text-sm">
        Энэ манхуа уншихын тулд эхлээд нэвтэрнэ үү 🔒
      </p>
      <button
        onClick={onLogin}
        className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
      >
        Нэвтрэх
      </button>
    </div>
  );
}
