// components/Header.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href ? "text-cyan-400" : "text-slate-300 hover:text-cyan-300";

  const role = (user as { role?: string } | null | undefined)?.role;
  const isAdmin = role === "admin";
  const isEditor = role === "translator"; // editor role чинь "translator" гэж type-д байсан

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2 sm:px-6 sm:py-3 lg:px-16">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 sm:px-2 sm:py-1 sm:text-xs">
              BETA
            </span>
            <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-base font-bold text-transparent sm:text-lg">
              Manhua.mn
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-3 text-[11px] sm:text-sm">
          <Link href="/" className={isActive("/")}>
            Нүүр
          </Link>

          <Link href="/manhuas" className={isActive("/manhuas")}>
            Жагсаалт
          </Link>

          <Link
            href="/profile"
            className="hidden xs:inline-block sm:inline-block"
          >
            <span className={isActive("/profile")}>Профайл</span>
          </Link>

          {/* ✨ Role-based shortcut-ууд */}
          {user && (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="hidden rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-sm shadow-amber-500/50 hover:brightness-110 sm:inline"
                >
                  Admin
                </Link>
              )}

              {isEditor && (
                <Link
                  href="/editor/manhuas"
                  className="hidden rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-sm shadow-emerald-500/50 hover:brightness-110 sm:inline"
                >
                  Editor
                </Link>
              )}
            </>
          )}

          {user ? (
            <>
              <span className="hidden text-xs text-slate-400 md:inline">
                {user.username}
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
              >
                Гарах
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
              >
                Нэвтрэх
              </Link>
              <Link
                href="/register"
                className="hidden rounded-full bg-cyan-500 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-sm shadow-cyan-500/40 hover:bg-cyan-400 sm:inline"
              >
                Бүртгүүлэх
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
