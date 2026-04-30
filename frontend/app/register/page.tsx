/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import { useToast } from "@/app/components/ToastProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    // Validate inputs
    if (!form.username || !form.email || !form.password) {
      toast.error("Бүх талбарыг бөглөнө үү.");
      setLoading(false);
      return;
    }

    if (form.password.length < 8) {
      toast.error("Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.");
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Зөв имэйл хаяг оруулна уу.");
      setLoading(false);
      return;
    }

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await api.post("/auth/register", {
        ...form,
        deviceId, // Send deviceId in body as backup
      });

      // ✅ trial granted бол home дээр popup гаргах flag хадгална
      const granted = !!res.data?.trial?.granted;
      if (granted && typeof window !== "undefined") {
        localStorage.setItem(
          "trial_popup",
          JSON.stringify({
            at: Date.now(),
            days: res.data?.trial?.days ?? 3,
          })
        );
      }

      await login(res.data.token);
      toast.success("Бүртгэл амжилттай үүслээ");
      router.push("/");
    } catch (e: any) {
      const errorMsg =
        e?.response?.data?.message ||
        (e?.code === "ECONNREFUSED" || e?.message?.includes("Network Error")
          ? "Сервертэй холбогдох боломжгүй байна."
          : "Алдаа гарлаа. Дахин оролдоно уу.");
      toast.error(errorMsg);
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
      className="flex min-h-[70vh] items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(ellipse 60% 50% at 20% 30%,oklch(0.72 0.17 195/.06),transparent), radial-gradient(ellipse 50% 40% at 80% 70%,oklch(0.65 0.22 15/.06),transparent)",
      }}
    >
      <div
        className="w-full max-w-sm p-8 shadow-2xl"
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
          Бүртгэл үүсгэх
        </h1>
        <p className="text-[12px] text-center mb-6" style={{ color: "var(--arc-muted)" }}>
          Шинэ аккаунт үүсгээд манхуа унших эрхээ идэвхжүүлээрэй
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium" style={{ color: "var(--arc-dim)" }}>Username</label>
            <input
              style={fieldStyle}
              placeholder="Жишээ нь: manhua_lover"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium" style={{ color: "var(--arc-dim)" }}>Email</label>
            <input
              type="email"
              style={fieldStyle}
              placeholder="example@mail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium" style={{ color: "var(--arc-dim)" }}>Нууц үг</label>
            <input
              type="password"
              style={fieldStyle}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Хамгийн багадаа 8 тэмдэгт байх ёстой.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[10px] py-3 text-[14px] font-bold transition-all disabled:opacity-50"
            style={{
              fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
              background: loading ? "var(--arc-elevated)" : "var(--arc-cyan)",
              color: loading ? "var(--arc-muted)" : "#07070e",
              boxShadow: loading ? "none" : "0 0 22px var(--arc-cyan-glow)",
              border: "none",
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Түр хүлээнэ үү..." : "Бүртгүүлэх"}
          </button>
        </form>

        <div className="mt-5 text-center text-[12px]" style={{ color: "var(--arc-muted)" }}>
          Бүртгэлтэй юу?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="font-medium"
            style={{ color: "var(--arc-cyan)", background: "none", border: "none", cursor: "pointer" }}
          >
            Нэвтрэх
          </button>
        </div>
      </div>
    </div>
  );
}
