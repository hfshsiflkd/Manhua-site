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
  const { user, ready } = useAuth();
  const [checking, setChecking] = useState(true);

  const isAdmin =
    (user as { role?: string } | null | undefined)?.role === "admin";

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
    } else if (!isAdmin) {
      router.replace("/");
    }
    setChecking(false);
  }, [ready, user, isAdmin, router]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--arc-bg)" }}>
      <div className="flex-none" style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-bg)" }}>
        <Header />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="w-full">{checking ? null : children}</div>
      </main>
    </div>
  );
}
