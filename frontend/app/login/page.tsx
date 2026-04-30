/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getOrCreateDeviceId } from "@/lib/deviceId";

type LockInfo = {
  lockUntil: string; // ISO
  reason?: string;
  code?: string;
  remainingSeconds?: number;
  devicePolicy?: {
    status: "locked" | "warning";
    count?: number;
    minutesLocked?: number;
    remainingBeforeLock?: number;
    windowHours?: number;
  };
};

function parseLock(err: any): LockInfo | null {
  const status = err?.response?.status;
  const data = err?.response?.data;
  // Handle 423 Locked (device switch lock or any lock)
  if (status === 423 && data?.lockUntil) {
    return {
      lockUntil: String(data.lockUntil),
      reason: data?.reason || "Түр түгжигдсэн",
      code: data?.code || "LOCKED",
      remainingSeconds: data?.remainingSeconds,
      devicePolicy: data?.devicePolicy,
    };
  }
  // Handle legacy 403 lock (for backward compatibility)
  if (status === 403 && data?.lockUntil) {
    return {
      lockUntil: String(data.lockUntil),
      reason: data?.reason,
    };
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
  // Check for network errors
  if (!err.response) {
    if (err.code === "ECONNREFUSED" || err.message?.includes("Network Error")) {
      return "Сервертэй холбогдох боломжгүй байна. Интернэт холболтоо шалгана уу.";
    }
    return "Сүлжээний алдаа гарлаа. Дахин оролдоно уу.";
  }

  // Check for specific status codes
  const status = err.response?.status;
  const message = err.response?.data?.message;

  if (status === 400 && message) {
    return message;
  }
  if (status === 401) {
    return "Нэвтрэх эрх хүчингүй байна.";
  }
  if (status === 403) {
    return message || "Энэ үйлдлийг хийх эрхгүй байна.";
  }
  if (status === 500) {
    return "Серверийн алдаа гарлаа. Дахин оролдоно уу.";
  }

  return message || "Нэвтрэхэд алдаа гарлаа. Имэйл/нэр, нууц үгээ шалгана уу.";
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [deviceWarning, setDeviceWarning] = useState<{
    count: number;
    remainingBeforeLock: number;
  } | null>(null);

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
      // Ensure deviceId is available (interceptor adds it to header, but send in body too as backup)
      const deviceId = getOrCreateDeviceId();

      const res = await api.post("/auth/login", {
        emailOrUsername: identifier.trim(),
        password,
        deviceId, // Send in body as backup (backend checks both header and body)
      });

      const token = res.data.token;
      if (!token) {
        setErrorMsg("Token олдсонгүй, backend login response-ээ шалгаарай.");
        setLoading(false);
        return;
      }

      // Check for devicePolicy warning in response
      if (res.data.devicePolicy && res.data.devicePolicy.status === "warning") {
        setDeviceWarning({
          count: res.data.devicePolicy.count || 0,
          remainingBeforeLock: res.data.devicePolicy.remainingBeforeLock || 0,
        });
        // Auto-dismiss after 8 seconds
        setTimeout(() => setDeviceWarning(null), 8000);
      }

      await login(token);
      router.push("/");
    } catch (err: any) {
      console.error("Login error:", err);

      // ✅ lock case
      const l = parseLock(err);
      if (l) {
        setLock(l);
        setErrorMsg(null);
        setLoading(false);
        return;
      }

      // Extract error message from response
      const errorMessage = niceDefaultError(err);
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "var(--arc-elevated)",
    border: "1px solid var(--arc-border)",
    borderRadius: "var(--arc-radius)",
    color: "var(--arc-text)",
    fontSize: 13,
    outline: "none",
  };

  return (
    <div
      className="flex min-h-[70vh] items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 60% 50% at 20% 30%,oklch(0.72 0.17 195/.06),transparent), radial-gradient(ellipse 50% 40% at 80% 70%,oklch(0.65 0.22 15/.06),transparent)",
      }}
    >
      <div
        className="w-full max-w-sm p-8 text-sm shadow-2xl"
        style={{
          borderRadius: 20,
          border: "1px solid var(--arc-border)",
          background: "var(--arc-card)",
          color: "var(--arc-text)",
        }}
      >
        {/* LOGO */}
        <div className="flex items-center justify-center gap-2 mb-7">
          <div
            className="flex items-center justify-center rounded-[10px]"
            style={{ width: 38, height: 38, background: "var(--arc-elevated)", border: "1px solid var(--arc-border)" }}
          >
            <svg viewBox="0 0 48 48" width="22" height="22" fill="none">
              <path d="M8 28 C14 14 34 14 40 28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M16 34 C20 30 28 30 32 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <circle cx="24" cy="12" r="3" fill="var(--arc-rose)" />
            </svg>
          </div>
          <span
            className="text-[19px] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}
          >
            ARC<span style={{ color: "var(--arc-rose)" }}>•</span>READ
          </span>
        </div>

        <h1
          className="text-[20px] font-bold text-white text-center mb-1"
          style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}
        >
          Нэвтрэх
        </h1>
        <p className="text-[12px] text-center mb-6" style={{ color: "var(--arc-muted)" }}>
          Имэйл эсвэл хэрэглэгчийн нэр, нууц үгээ ашиглан нэвтэрнэ үү.
        </p>

        {/* ✅ Lock card */}
        {lockUntilDate && (
          <div
            className="mb-4 rounded-[10px] px-3 py-3 text-[12px]"
            style={{ background: "oklch(0.82 0.16 85/.08)", border: "1px solid oklch(0.82 0.16 85/.25)", color: "oklch(0.9 0.1 85)" }}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5">⛔</div>
              <div className="flex-1">
                <p className="font-semibold">
                  Түр түгжигдсэн байна{" "}
                  {lock?.reason ? (
                    <span className="font-normal opacity-80">({lock.reason})</span>
                  ) : null}
                </p>
                <p className="mt-1">Тайлагдах хугацаа: <span className="font-medium">{lockUntilDate.toLocaleString()}</span></p>
                <p className="mt-1">Үлдсэн хугацаа: <span className="font-semibold">{lockParts ? formatLeft(lockParts) : "-"}</span></p>
                <p className="mt-2 text-[11px] opacity-80">Хэрвээ та зөрчилгүй гэж үзвэл админд хандан шалгуулна уу.</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setNowTick(Date.now()); }}
                    className="inline-flex items-center justify-center rounded-full px-3 py-2 text-[12px] font-semibold"
                    style={{ background: "var(--arc-amber)", color: "#07070e" }}
                  >
                    Дахин шалгах
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Device switch warning */}
        {deviceWarning && (
          <div
            className="mb-3 rounded-[10px] px-3 py-2.5 text-[12px]"
            style={{ background: "oklch(0.82 0.16 85/.08)", border: "1px solid oklch(0.82 0.16 85/.25)", color: "oklch(0.9 0.1 85)" }}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="font-semibold">Та өөр төхөөрөмжөөс нэвтэрлээ</p>
                <p className="mt-1">Хэрвээ үргэлжилбэл түр түгжигдэж магадгүй.{" "}
                  <span className="font-medium">{deviceWarning.remainingBeforeLock} удаа үлдлээ</span>
                </p>
              </div>
              <button type="button" onClick={() => setDeviceWarning(null)} className="opacity-70 hover:opacity-100">✕</button>
            </div>
          </div>
        )}

        {/* ✅ Normal error */}
        {errorMsg && (
          <div
            className="mb-3 rounded-[10px] px-3 py-2.5 text-[12px] flex items-start gap-2"
            style={{ background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "oklch(0.85 0.12 15)" }}
          >
            <span className="mt-0.5">⚠</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium" style={{ color: "var(--arc-dim)" }}>
              Имэйл эсвэл хэрэглэгчийн нэр
            </label>
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

          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium" style={{ color: "var(--arc-dim)" }}>Нууц үг</label>
            <input
              type="password"
              style={fieldStyle}
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
            className="mt-1 w-full rounded-[10px] py-3 text-[14px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
              background: loading || isLocked ? "var(--arc-elevated)" : "var(--arc-cyan)",
              color: loading || isLocked ? "var(--arc-muted)" : "#07070e",
              boxShadow: loading || isLocked ? "none" : "0 0 22px var(--arc-cyan-glow)",
              border: "none",
            }}
          >
            {loading ? "Нэвтрэж байна..." : isLocked ? "Түр түгжигдсэн" : "Нэвтрэх"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-[12px]" style={{ color: "var(--arc-muted)" }}>
          <p>
            Шинэ хэрэглэгч үү?{" "}
            <a href="/register" style={{ color: "var(--arc-cyan)", textDecoration: "none" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = "underline")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = "none")}>
              Бүртгүүлэх
            </a>
          </p>
          <a href="/login/forgot-password" style={{ color: "var(--arc-dim)", textDecoration: "none" }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--arc-text)")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--arc-dim)")}>
            Нууц үг мартсан
          </a>
        </div>
      </div>
    </div>
  );
}
