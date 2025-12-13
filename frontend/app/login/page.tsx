/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function formatTimeLeft(untilISO: string) {
  const until = new Date(untilISO);
  const now = new Date();

  const diffMs = until.getTime() - now.getTime();
  if (isNaN(until.getTime())) return null;

  if (diffMs <= 0) {
    return { untilText: until.toLocaleString(), leftText: "0 минут" };
  }

  const diffMin = Math.ceil(diffMs / (1000 * 60));
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;

  const leftText =
    hours > 0 ? `${hours} цаг ${mins} минут` : `${diffMin} минут`;

  return {
    untilText: until.toLocaleString(),
    leftText,
  };
}

function buildNiceError(err: any) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  // ✅ Lock case
  if (status === 403 && data?.lockUntil) {
    const t = formatTimeLeft(data.lockUntil);

    const reason = data?.reason ? `(${data.reason})` : "";

    if (t) {
      return `⛔ Түр түгжигдсэн байна ${reason}
Тайлагдах хугацаа: ${t.untilText} (үлдсэн: ${t.leftText})
Хэрвээ та зөрчилгүй гэж үзвэл админд хандан шалгуулна уу.`;
    }

    return `⛔ Түр түгжигдсэн байна ${reason}
Хэрвээ та зөрчилгүй гэж үзвэл админд хандан шалгуулна уу.`;
  }

  // Default
  return (
    data?.message || "Нэвтрэхэд алдаа гарлаа. Имэйл/нэр, нууц үгээ шалгана уу."
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post("/auth/login", {
        email: identifier,
        password,
      });

      const token = res.data.token;
      if (!token) {
        setErrorMsg("Token олдсонгүй, backend login response-ээ шалгаарай.");
        return;
      }

      await login(token);
      router.push("/");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(buildNiceError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-100 shadow-lg">
        <h1 className="text-lg font-semibold text-slate-50">Нэвтрэх</h1>
        <p className="mt-1 text-[12px] text-slate-400">
          Имэйл эсвэл хэрэглэгчийн нэр, нууц үгээ ашиглан нэвтэрнэ үү.
        </p>

        {errorMsg && (
          <div className="mt-3 rounded-md border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-[12px] text-rose-200 whitespace-pre-line">
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
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] text-slate-300">Нууц үг</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-cyan-500 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {loading ? "Нэвтрэж байна..." : "Нэвтрэх"}
          </button>
        </form>

        <p className="mt-4 text-center text-[12px] text-slate-400">
          Шинэ хэрэглэгч үү?{" "}
          <a
            href="/register"
            className="text-cyan-300 hover:text-cyan-200 underline-offset-2 hover:underline"
          >
            Бүртгүүлэх
          </a>
        </p>
      </div>
    </div>
  );
}
