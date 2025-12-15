/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { getOrCreateDeviceId } from "@/lib/deviceId";

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
        deviceId, // Send in body as backup (backend checks both header and body)
      });

      // Response: { _id, username, email, role, isVIP, token }
      if (res.data.role !== "admin") {
        setErrorMsg("Admin эрхтэй хэрэглэгч л нэвтэрнэ!");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", res.data.token);
      router.push("/admin");
    } catch (error: any) {
      console.error("Admin login error:", error);
      
      // Extract error message from response
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
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-100 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-50">Admin Login</h2>
        <p className="mt-1 text-[12px] text-slate-400">
          Admin имэйл эсвэл username, нууц үгээ ашиглан нэвтэрнэ үү.
        </p>

        {errorMsg && (
          <div className="mt-3 rounded-md border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-[12px] text-rose-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-[12px] text-slate-300">
              Имэйл эсвэл username
            </label>
            <input
              placeholder="admin@example.com эсвэл admin"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] text-slate-300">Нууц үг</label>
            <input
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-cyan-500 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
          </button>
        </form>
      </div>
    </div>
  );
}
