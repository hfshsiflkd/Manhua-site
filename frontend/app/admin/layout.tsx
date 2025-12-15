// src/app/admin/layout.tsx
"use client";
import "../globals.css";
import Header from "../components/Header";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);

  const isAdmin =
    (user as { role?: string } | null | undefined)?.role === "admin";

  useEffect(() => {
    // Small delay to allow initial auth fetch; then gate by role.
    const timer = setTimeout(() => {
      if (!user) {
        router.replace("/login");
      } else if (!isAdmin) {
        router.replace("/");
      }
      setChecking(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [user, isAdmin, router]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="flex-none border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <Header />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="w-full ">{checking ? null : children}</div>
      </main>
    </div>
  );
}
