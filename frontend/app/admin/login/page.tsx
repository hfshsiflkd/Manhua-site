/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { getOrCreateDeviceId } from "@/lib/deviceId";

const fieldStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "9px 14px", fontSize: 13,
  color: "var(--arc-text)", outline: "none",
};

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await api.post("/auth/login", {
        emailOrUsername: identifier.trim(),
        password,
        deviceId,
      });

      if (res.data.role !== "admin") {
        setErrorMsg("Admin эрхтэй хэрэглэгч л нэвтэрнэ!");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", res.data.token);
      router.push("/admin");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message ||
        (error?.response?.status === 400
          ? "Имэйл/нэр эсвэл нууц үг буруу байна."
          : error?.code === "ECONNREFUSED" || error?.message?.includes("Network Error")
          ? "Сервертэй холбогдох боломжгүй байна."
          : "Нэвтрэхэд алдаа гарлаа");
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[16px] p-6 shadow-2xl" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <h2 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
          Admin Login
        </h2>
        <p className="mt-1 text-[12px]" style={{ color: "var(--arc-muted)" }}>
          Admin имэйл эсвэл username, нууц үгээ ашиглан нэвтэрнэ үү.
        </p>

        {errorMsg && (
          <div className="mt-3 rounded-[9px] px-3 py-2 text-[12px]" style={{ background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "oklch(0.85 0.12 15)" }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Имэйл эсвэл username</label>
            <input
              placeholder="admin@example.com эсвэл admin"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={fieldStyle}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Нууц үг</label>
            <input
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={fieldStyle}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[9px] py-2.5 text-[13px] font-semibold transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
          >
            {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
          </button>
        </form>
      </div>
    </div>
  );
}
