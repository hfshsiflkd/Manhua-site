/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

   try {
     const res = await api.post("/auth/register", form);

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
     router.push("/");
   } catch (e: any) {
     alert(e.response?.data?.message || "Алдаа гарлаа");
   } finally {
     setLoading(false);
   }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8">
      <div className="mx-auto flex h-full max-w-md items-center justify-center">
        <div className="w-full rounded-2xl bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10 ring-1 ring-slate-700/70">
          {/* Толгой хэсэг */}
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-semibold text-white">
              Бүртгэл үүсгэх
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Шинэ аккаунт үүсгээд манхуа унших эрхээ идэвхжүүлээрэй ✨
            </p>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            {/* Username */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">
                Username
              </label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                placeholder="Жишээ нь: manhua_lover"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                placeholder="example@mail.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                Хамгийн багадаа 6 тэмдэгт байх нь тохиромжтой.
              </p>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-cyan-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Түр хүлээнэ үү..." : "Бүртгүүлэх"}
            </button>
          </form>

          {/* Доод текст */}
          <div className="mt-4 text-center text-xs text-slate-400">
            <p>
              Бүртгэлтэй юу?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-medium text-cyan-400 hover:text-cyan-300"
              >
                Нэвтрэх
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
