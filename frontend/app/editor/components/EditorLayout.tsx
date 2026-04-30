"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import EditorSidebar from "./EditorSidebar";
import EditorTopbar from "./EditorTopbar";

interface EditorLayoutProps {
  children: React.ReactNode;
}

export default function EditorLayout({ children }: EditorLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  const roleRaw = user?.role;
  const roleNorm = (roleRaw || "").toLowerCase().trim();
  const isAdmin = roleNorm === "admin";
  const isEditor = roleNorm === "editor" || roleNorm === "translator";

  if (!user || (!isEditor && !isAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--arc-bg)" }}>
        <div className="text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: "var(--arc-text)" }}>
            Зөвшөөрөл шаардлагатай
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--arc-muted)" }}>
            Энэ хэсэгт нэвтрэхийн тулд editor эсвэл admin эрхтэй байх шаардлагатай.
          </p>
          <Link
            href="/"
            className="inline-block rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--arc-cyan)", color: "#07070e" }}
          >
            Нүүр хуудас руу буцах
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--arc-bg)" }}>
      <EditorSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pathname={pathname}
      />

      <div className="flex flex-1 flex-col lg:pl-64">
        <EditorTopbar
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
