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

  // Normalize role for safe comparison
  const roleRaw = user?.role;
  const roleNorm = (roleRaw || "").toLowerCase().trim();
  const isAdmin = roleNorm === "admin";
  const isEditor = roleNorm === "editor" || roleNorm === "translator";

  // Redirect if not editor/admin
  if (!user || (!isEditor && !isAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-100 mb-2">
            Зөвшөөрөл шаардлагатай
          </p>
          <p className="text-sm text-slate-400 mb-4">
            Энэ хэсэгт нэвтрэхийн тулд editor эсвэл admin эрхтэй байх шаардлагатай.
          </p>
          <Link
            href="/"
            className="inline-block rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
          >
            Нүүр хуудас руу буцах
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar - Desktop */}
      <EditorSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pathname={pathname}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Topbar - Mobile */}
        <EditorTopbar
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

