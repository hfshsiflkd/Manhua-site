/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const fieldStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "9px 14px", fontSize: 13,
  color: "var(--arc-text)", outline: "none",
};

export default function ResetPasswordClient({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (!token) { setErr("Token олдсонгүй. Email-ээр ирсэн линкийг дахин шалгана уу."); return; }
    if (!password || password.length < 8) { setErr("Нууц үг дор хаяж 8 тэмдэгт байх ёстой."); return; }
    if (password !== confirm) { setErr("Нууц үгүүд таарахгүй байна."); return; }
    try {
      setLoading(true);
      await api.post("/auth/reset-password", { email, token, newPassword: password });
      setMsg("✅ Нууц үг амжилттай шинэчлэгдлээ. Одоо нэвтэрч болно.");
      setPassword(""); setConfirm("");
      setTimeout(() => router.push("/login"), 800);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Алдаа гарлаа. Дахин оролдоно уу.");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-[16px] p-6 text-[13px] shadow-2xl"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <h1 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
          Нууц үг шинэчлэх
        </h1>
        <p className="mt-1 text-[12px]" style={{ color: "var(--arc-muted)" }}>
          Email-ээр ирсэн линк дээрх token ашиглан шинэ нууц үгээ тохируулна.
        </p>

        {!token && (
          <div className="mt-3 rounded-[9px] px-3 py-2 text-[12px]" style={{ background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "oklch(0.85 0.12 15)" }}>
            Token олдсонгүй. Email-ээр ирсэн линкийг дахин нээгээд үзээрэй.
          </div>
        )}
        {err && (
          <div className="mt-3 rounded-[9px] px-3 py-2 text-[12px]" style={{ background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "oklch(0.85 0.12 15)" }}>
            {err}
          </div>
        )}
        {msg && (
          <div className="mt-3 rounded-[9px] px-3 py-2 text-[12px]" style={{ background: "oklch(0.75 0.16 145/.08)", border: "1px solid oklch(0.75 0.16 145/.35)", color: "oklch(0.8 0.14 145)" }}>
            {msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Шинэ нууц үг</label>
            <input type="password" style={fieldStyle} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={!token || loading} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Дахин бичих</label>
            <input type="password" style={fieldStyle} placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={!token || loading} />
          </div>
          <button
            type="submit"
            disabled={!token || loading}
            className="w-full rounded-[9px] py-2.5 text-[13px] font-semibold transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
          >
            {loading ? "Шинэчилж байна..." : "Нууц үг шинэчлэх"}
          </button>
        </form>

        <button
          onClick={() => router.push("/login")}
          className="mt-3 w-full rounded-[9px] px-4 py-2 text-[13px] font-medium transition-colors"
          style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}
        >
          Нэвтрэх рүү буцах
        </button>
      </div>
    </div>
  );
}
