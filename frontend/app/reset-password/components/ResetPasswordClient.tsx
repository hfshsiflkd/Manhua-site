/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function ResetPasswordClient({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!token) {
      setErr("Token олдсонгүй. Email-ээр ирсэн линкийг дахин шалгана уу.");
      return;
    }
    if (!password || password.length < 8) {
      setErr("Нууц үг дор хаяж 8 тэмдэгт байх ёстой.");
      return;
    }
    if (password !== confirm) {
      setErr("Нууц үгүүд таарахгүй байна.");
      return;
    }

    try {
      setLoading(true);
      console.log("RESET props:", { token, email });

      await api.post("/auth/reset-password", {
        email,
        token,
        newPassword: password,
      });

      setMsg("✅ Нууц үг амжилттай шинэчлэгдлээ. Одоо нэвтэрч болно.");
      setPassword("");
      setConfirm("");
      setTimeout(() => router.push("/login"), 800);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-100 shadow-lg">
        <h1 className="text-lg font-semibold text-slate-50">
          Нууц үг шинэчлэх
        </h1>
        <p className="mt-1 text-[12px] text-slate-400">
          Email-ээр ирсэн линк дээрх token ашиглан шинэ нууц үгээ тохируулна.
        </p>

        {!token && (
          <div className="mt-3 rounded-md border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-[12px] text-rose-200">
            Token олдсонгүй. Email-ээр ирсэн линкийг дахин нээгээд үзээрэй.
          </div>
        )}

        {err && (
          <div className="mt-3 rounded-md border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-[12px] text-rose-200">
            {err}
          </div>
        )}

        {msg && (
          <div className="mt-3 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">
            {msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-[12px] text-slate-300">Шинэ нууц үг</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={!token || loading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] text-slate-300">Дахин бичих</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={!token || loading}
            />
          </div>

          <button
            type="submit"
            disabled={!token || loading}
            className="mt-2 w-full rounded-full bg-cyan-500 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {loading ? "Шинэчилж байна..." : "Нууц үг шинэчлэх"}
          </button>
        </form>

        <button
          onClick={() => router.push("/login")}
          className="mt-4 w-full rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          Нэвтрэх рүү буцах
        </button>
      </div>
    </div>
  );
}
