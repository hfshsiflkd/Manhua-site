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

      // REGISTER амжилттай → LOGIN state update
      await login(res.data.token);

      router.push("/"); // шууд home руу
    } catch (e: any) {
      alert(e.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-white">Бүртгүүлэх</h1>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <input
          className="w-full rounded bg-slate-800 p-2 text-white"
          placeholder="Username"
          onChange={(e) =>
            setForm({ ...form, username: e.target.value })
          }
        />
        <input
          className="w-full rounded bg-slate-800 p-2 text-white"
          placeholder="Email"
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />
        <input
          type="password"
          className="w-full rounded bg-slate-800 p-2 text-white"
          placeholder="Password"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-cyan-500 py-2 font-semibold text-black"
        >
          {loading ? "Түр хүлээнэ үү..." : "Бүртгүүлэх"}
        </button>
      </form>
    </div>
  );
}
