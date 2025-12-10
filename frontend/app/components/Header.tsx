// components/Header.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const role = (user as { role?: string } | null | undefined)?.role;
  const isAdmin = role === "admin";
  const isEditor = role === "translator";

  const baseNavItem =
    "rounded-full px-3 py-1 text-[13px] font-medium transition-colors duration-150";

  const isActive = (href: string) =>
    pathname === href
      ? `${baseNavItem} bg-cyan-500/15 text-cyan-300`
      : `${baseNavItem} text-slate-200 hover:text-cyan-200 hover:bg-slate-800/70`;

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      {/* TOP BAR */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-3 lg:px-16">
        {/* LOGO */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 sm:px-2 sm:py-1 sm:text-xs">
              BETA
            </span>
            <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-[18px] font-extrabold tracking-tight text-transparent sm:text-lg">
              Manhua.mn
            </span>
          </Link>
        </div>

        {/* DESKTOP NAV (md дээш) */}
        <nav className="hidden items-center justify-end gap-2 text-[13px] md:flex">
          <Link href="/" className={isActive("/")}>
            Нүүр
          </Link>

          <Link href="/manhuas" className={isActive("/manhuas")}>
            Жагсаалт
          </Link>

          <Link href="/profile" className={isActive("/profile")}>
            Профайл
          </Link>

          {user && (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-3 py-1 text-[12px] font-semibold text-slate-950 shadow-sm shadow-amber-500/50 hover:brightness-110"
                >
                  Admin
                </Link>
              )}

              {isEditor && (
                <Link
                  href="/editor/manhuas"
                  className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-3 py-1 text-[12px] font-semibold text-slate-950 shadow-sm shadow-emerald-500/50 hover:brightness-110"
                >
                  Editor
                </Link>
              )}
            </>
          )}

          {user ? (
            <>
              <span className="max-w-[140px] truncate text-xs text-slate-400">
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full bg-slate-800 px-3 py-1 text-[12px] font-medium text-slate-100 hover:bg-slate-700"
              >
                Гарах
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-slate-700 px-3 py-1 text-[12px] font-medium text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
              >
                Нэвтрэх
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-cyan-500 px-3 py-1 text-[12px] font-semibold text-slate-950 shadow-sm shadow-cyan-500/40 hover:bg-cyan-400"
              >
                Бүртгүүлэх
              </Link>
            </>
          )}
        </nav>

        {/* MOBILE RIGHT SIDE (md-с доош) */}
        <div className="flex items-center gap-2 md:hidden">
          {user ? (
            <span className="max-w-[90px] truncate text-[11px] text-slate-400">
              {user.username}
            </span>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-medium text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
            >
              Нэвтрэх
            </Link>
          )}

          {/* HAMBURGER BUTTON */}
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
            aria-label="Toggle navigation"
          >
            <span className="sr-only">Toggle navigation</span>
            {/* simple icon */}
            <div className="flex flex-col gap-[3px]">
              <span className="h-[2px] w-4 rounded-full bg-current" />
              <span className="h-[2px] w-4 rounded-full bg-current" />
              <span className="h-[2px] w-4 rounded-full bg-current" />
            </div>
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN MENU */}
      {isOpen && (
        <div className="border-t border-slate-800 bg-slate-950/95 md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-[13px]">
            <Link
              href="/"
              className={`${isActive("/")} w-full text-left`}
              onClick={() => setIsOpen(false)}
            >
              Нүүр
            </Link>

            <Link
              href="/manhuas"
              className={`${isActive("/manhuas")} w-full text-left`}
              onClick={() => setIsOpen(false)}
            >
              Жагсаалт
            </Link>

            <Link
              href="/profile"
              className={`${isActive("/profile")} w-full text-left`}
              onClick={() => setIsOpen(false)}
            >
              Профайл
            </Link>

            {user && (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="mt-1 w-full rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-3 py-1 text-[12px] font-semibold text-slate-950 shadow-sm shadow-amber-500/50 hover:brightness-110"
                    onClick={() => setIsOpen(false)}
                  >
                    Admin
                  </Link>
                )}

                {isEditor && (
                  <Link
                    href="/editor/manhuas"
                    className="mt-1 w-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-3 py-1 text-[12px] font-semibold text-slate-950 shadow-sm shadow-emerald-500/50 hover:brightness-110"
                    onClick={() => setIsOpen(false)}
                  >
                    Editor
                  </Link>
                )}
              </>
            )}

            <div className="mt-2 flex flex-col gap-2">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full rounded-full bg-slate-800 px-3 py-1.5 text-[12px] font-medium text-slate-100 hover:bg-slate-700"
                >
                  Гарах
                </button>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="w-full rounded-full bg-cyan-500 px-3 py-1.5 text-[12px] font-semibold text-slate-950 shadow-sm shadow-cyan-500/40 hover:bg-cyan-400"
                    onClick={() => setIsOpen(false)}
                  >
                    Бүртгүүлэх
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
