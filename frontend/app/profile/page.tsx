/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface MeResponse {
  _id: string;
  username: string;
  email: string;
  isVIP: boolean;
  vipExpiresAt?: string | null; // 🔹 VIP дуусах огноо
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await api.get<MeResponse>("/auth/me");
        setMe(res.data);
      } catch (err: any) {
        const status = err?.response?.status;
        setErrorStatus(status || 500);
        setMe(null);
      } finally {
        setLoading(false);
      }
    }

    loadMe();
  }, []);

  const formatVipDate = (d?: string | null) => {
    if (!d) return null;
    try {
      const date = new Date(d);
      return date.toLocaleDateString("mn-MN");
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
        Профайл ачаалж байна...
      </div>
    );
  }

  // Нэвтрээгүй (token байхгүй эсвэл 401)
  if (!me && (errorStatus === 401 || errorStatus === 403)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-100">
        <p className="text-sm">Профайл харахын өмнө нэвтэрнэ үү 🔒</p>
        <button
          onClick={() => router.push("/login")}
          className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Нэвтрэх
        </button>
      </div>
    );
  }

  // Өөр алдаа (500 гэх мэт)
  if (!me && errorStatus && errorStatus !== 401 && errorStatus !== 403) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-sm text-red-400">
        <p>Профайл ачаалах үед алдаа гарлаа (status {errorStatus}).</p>
        <button
          onClick={() => router.refresh()}
          className="text-[12px] text-slate-300 underline-offset-2 hover:underline"
        >
          Дахин ачааллах
        </button>
      </div>
    );
  }

  // Нэвтэрсэн хэрэглэгч
  if (!me) return null;

  const vipExpireText = formatVipDate(me.vipExpiresAt);

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-lg font-semibold text-slate-50">Миний профайл</h1>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm shadow-lg shadow-slate-900/60">
        <div className="space-y-1">
          <p className="text-[12px] text-slate-400">Хэрэглэгчийн нэр</p>
          <p className="text-base font-medium text-slate-100">{me.username}</p>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-[12px] text-slate-400">Имэйл</p>
          <p className="text-sm text-slate-100">{me.email}</p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-[12px] text-slate-400">VIP статус</p>
              {me.isVIP ? (
                <span className="inline-flex items-center rounded-full bg-yellow-300/90 px-3 py-1 text-[11px] font-semibold text-slate-900">
                  VIP ✨
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-200">
                  Энгийн хэрэглэгч
                </span>
              )}
            </div>

            {/* 🔹 VIP дуусах огноо */}
            {me.isVIP && vipExpireText && (
              <p className="text-[11px] text-slate-300">
                Дуусах огноо:{" "}
                <span className="font-medium text-yellow-200">
                  {vipExpireText}
                </span>
              </p>
            )}
          </div>

          {!me.isVIP && (
            <button
              onClick={() => router.push("/vip")}
              className="rounded-full bg-yellow-300 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-yellow-200"
            >
              VIP эрх авах
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
