/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

const fieldStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "9px 14px", fontSize: 13,
  color: "var(--arc-text)", outline: "none",
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setSuccessMsg(null); setErrorMsg(null);
    try {
      const res = await api.post("/auth/forgot-password", {
        email: identifier.trim(),
        identifier: identifier.trim(),
      });
      setSuccessMsg(res?.data?.message || "Хэрвээ энэ бүртгэл системд байвал сэргээх холбоосыг имэйл рүү илгээлээ.");
    } catch (err: any) {
      const errorData = err?.response?.data;
      setErrorMsg(errorData?.message || (
        err?.code === "ECONNREFUSED" || err?.message?.includes("Network Error")
          ? "Сервертэй холбогдох боломжгүй байна."
          : "Алдаа гарлаа. Дахин оролдоно уу."
      ));
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4" style={{ background: "var(--arc-bg)" }}>
      <div
        className="w-full max-w-sm rounded-[16px] p-6 text-[13px] shadow-2xl"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <h1 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
          Нууц үг сэргээх
        </h1>
        <p className="mt-1 text-[12px]" style={{ color: "var(--arc-muted)" }}>
          Имэйл эсвэл хэрэглэгчийн нэрээ оруул. Сэргээх холбоосыг имэйлээр илгээнэ.
        </p>

        {successMsg && (
          <div className="mt-3 rounded-[9px] px-3 py-2 text-[12px]" style={{ background: "oklch(0.75 0.16 145/.08)", border: "1px solid oklch(0.75 0.16 145/.35)", color: "oklch(0.8 0.14 145)" }}>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 rounded-[9px] px-3 py-2 text-[12px]" style={{ background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "oklch(0.85 0.12 15)" }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Имэйл эсвэл хэрэглэгчийн нэр</label>
            <input
              type="text"
              style={fieldStyle}
              placeholder="you@example.com эсвэл username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[9px] py-2.5 text-[13px] font-semibold transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: loading ? "var(--arc-elevated)" : "var(--arc-cyan)", color: loading ? "var(--arc-muted)" : "#07070e", border: "none", cursor: "pointer" }}
          >
            {loading ? "Илгээж байна..." : "Сэргээх холбоос илгээх"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-[12px]">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="transition-colors"
            style={{ color: "var(--arc-dim)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--arc-text)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--arc-dim)")}
          >
            ← Нэвтрэх рүү буцах
          </button>
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="transition-colors"
            style={{ color: "var(--arc-cyan)", background: "none", border: "none", cursor: "pointer" }}
          >
            Бүртгүүлэх
          </button>
        </div>
      </div>
    </div>
  );
}
