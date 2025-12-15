/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState(""); // email эсвэл username
  const [loading, setLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.post("/auth/forgot-password", {
        email: identifier.trim(), // Backend accepts 'email' or 'identifier'
        identifier: identifier.trim(),
      });

      setSuccessMsg(
        res?.data?.message ||
          "Хэрвээ энэ бүртгэл системд байвал сэргээх холбоосыг имэйл рүү илгээлээ."
      );
    } catch (err: any) {
      console.error(err);
      const errorData = err?.response?.data;
      setErrorMsg(
        errorData?.message ||
          (err?.code === "ECONNREFUSED" || err?.message?.includes("Network Error")
            ? "Сервертэй холбогдох боломжгүй байна."
            : "Алдаа гарлаа. Дахин оролдоно уу.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-100 shadow-lg">
        <h1 className="text-lg font-semibold text-slate-50">Нууц үг сэргээх</h1>
        <p className="mt-1 text-[12px] text-slate-400">
          Имэйл эсвэл хэрэглэгчийн нэрээ оруул. Сэргээх холбоосыг имэйлээр
          илгээнэ.
        </p>

        {successMsg && (
          <div className="mt-3 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-100">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 rounded-md border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-[12px] text-rose-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-[12px] text-slate-300">
              Имэйл эсвэл хэрэглэгчийн нэр
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
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
            className="mt-2 w-full rounded-full bg-cyan-500 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {loading ? "Илгээж байна..." : "Сэргээх холбоос илгээх"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-[12px] text-slate-400">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-slate-300 hover:text-slate-100 underline-offset-2 hover:underline"
          >
            ← Нэвтрэх рүү буцах
          </button>

          <button
            type="button"
            onClick={() => router.push("/register")}
            className="text-cyan-300 hover:text-cyan-200 underline-offset-2 hover:underline"
          >
            Бүртгүүлэх
          </button>
        </div>
      </div>
    </div>
  );
}
