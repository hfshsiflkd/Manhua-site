/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type LockInfo = {
  lockUntil: string; // ISO
  reason?: string;
};

function parseLock(err: any): LockInfo | null {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (status === 403 && data?.lockUntil) {
    return { lockUntil: String(data.lockUntil), reason: data?.reason };
  }
  return null;
}

function toTimeParts(diffMs: number) {
  const totalSec = Math.max(0, Math.ceil(diffMs / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return { days, hours, mins, secs, totalSec };
}

function formatLeft(parts: ReturnType<typeof toTimeParts>) {
  const { days, hours, mins, secs } = parts;
  if (parts.totalSec <= 0) return "0 секунд";
  if (days > 0) return `${days} өдөр ${hours} цаг ${mins} мин`;
  if (hours > 0) return `${hours} цаг ${mins} мин ${secs} сек`;
  if (mins > 0) return `${mins} мин ${secs} сек`;
  return `${secs} сек`;
}

function niceDefaultError(err: any) {
  return (
    err?.response?.data?.message ||
    "Нэвтрэхэд алдаа гарлаа. Имэйл/нэр, нууц үгээ шалгана уу."
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // ✅ lock info + live countdown
  const [lock, setLock] = useState<LockInfo | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // ✅ normal error (non-lock)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lockUntilDate = useMemo(() => {
    if (!lock?.lockUntil) return null;
    const d = new Date(lock.lockUntil);
    if (isNaN(d.getTime())) return null;
    return d;
  }, [lock]);

  const lockParts = useMemo(() => {
    if (!lockUntilDate) return null;
    return toTimeParts(lockUntilDate.getTime() - nowTick);
  }, [lockUntilDate, nowTick]);

  const isLocked = !!lockUntilDate && !!lockParts && lockParts.totalSec > 0;

  // live tick while locked
  useEffect(() => {
    if (!isLocked) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isLocked]);

  // auto clear lock when expired
  useEffect(() => {
    if (!lockUntilDate || !lockParts) return;
    if (lockParts.totalSec <= 0) setLock(null);
  }, [lockUntilDate, lockParts]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // ✅ lock байхад submit хийхгүй
    if (isLocked) return;

    setLoading(true);
    setErrorMsg(null);
    setLock(null);

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

      // ✅ lock case
      const l = parseLock(err);
      if (l) {
        setLock(l);
        setErrorMsg(null);
        return;
      }

      setErrorMsg(niceDefaultError(err));
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

        {/* ✅ Lock card */}
        {lockUntilDate && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-[12px] text-amber-100">
            <div className="flex items-start gap-2">
              <div className="mt-0.5">⛔</div>
              <div className="flex-1">
                <p className="font-semibold text-amber-100">
                  Түр түгжигдсэн байна{" "}
                  {lock?.reason ? (
                    <span className="text-amber-200/80 font-normal">
                      ({lock.reason})
                    </span>
                  ) : null}
                </p>

                <p className="mt-1 text-amber-100/90">
                  Тайлагдах хугацаа:{" "}
                  <span className="font-medium">
                    {lockUntilDate.toLocaleString()}
                  </span>
                </p>

                <p className="mt-1 text-amber-100/90">
                  Үлдсэн хугацаа:{" "}
                  <span className="font-semibold">
                    {lockParts ? formatLeft(lockParts) : "-"}
                  </span>
                </p>

                <p className="mt-2 text-[11px] text-amber-100/80">
                  Хэрвээ та зөрчилгүй гэж үзвэл админд хандан шалгуулна уу.
                </p>

                <div className="mt-3 flex gap-2">
                  <a
                    href="/contact"
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-amber-400/50 bg-slate-900/40 px-3 py-2 text-[12px] font-medium text-amber-100 hover:bg-slate-900/70"
                  >
                    Админд хандах
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setNowTick(Date.now());
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-amber-400 px-3 py-2 text-[12px] font-semibold text-slate-950 hover:bg-amber-300"
                  >
                    Дахин шалгах
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Normal error */}
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

          <div className="space-y-1">
            <label className="text-[12px] text-slate-300">Нууц үг</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            className="mt-2 w-full rounded-full bg-cyan-500 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {loading
              ? "Нэвтрэж байна..."
              : isLocked
              ? "Түр түгжигдсэн"
              : "Нэвтрэх"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-[12px] text-slate-400">
          <p>
            Шинэ хэрэглэгч үү?{" "}
            <a
              href="/register"
              className="text-cyan-300 hover:text-cyan-200 underline-offset-2 hover:underline"
            >
              Бүртгүүлэх
            </a>
          </p>

          {/* ✅ forgot password link */}
          <a
            href="/login/forgot-password"
            className="text-slate-300 hover:text-slate-100 underline-offset-2 hover:underline"
          >
            Нууц үг мартсан
          </a>
        </div>
      </div>
    </div>
  );
}
