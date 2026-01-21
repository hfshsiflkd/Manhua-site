// components/Header.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

function ArcReadMark({ className = "" }: { className?: string }) {
  // Minimal “arc + page” mark (SVG) — dark UI дээр clean харагдана
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* Arc */}
      <path
        d="M10 34c8-16 36-16 44 0"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.95"
      />
      {/* Page */}
      <path
        d="M22 40c6-4 14-4 20 0"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.95"
      />
      {/* Small sparkle/dot */}
      <circle cx="32" cy="18" r="3.5" className="fill-rose-500" />
    </svg>
  );
}

function ArcReadLogo() {
  return (
    <div className="flex items-center gap-2">
      {/* Icon */}
      <div className="relative">
        <div className="absolute -inset-1 rounded-xl bg-rose-500/10 blur-md" />
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60">
          <ArcReadMark className="h-6 w-6 text-slate-200" />
        </div>
      </div>

      {/* Text */}
      <div className="leading-none">
        <div
          className="
            text-[18px] font-extrabold tracking-tight
            text-slate-100
            drop-shadow-[0_0_12px_rgba(244,63,94,0.22)]
            sm:text-lg
          "
        >
          ARC<span className="text-rose-500">•</span>READ
        </div>
        {/* <div className="mt-0.5 hidden text-[10px] font-medium tracking-wide text-slate-400 sm:block">
          manhwa • manhua
        </div> */}
      </div>
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Normalize role for safe comparison
  const roleRaw = (user as { role?: string } | null | undefined)?.role;
  const roleNorm = (roleRaw || "").toLowerCase().trim();
  const isAdmin = roleNorm === "admin";
  const isEditor = roleNorm === "editor" || roleNorm === "translator";

  // Debug log (dev only)
  if (process.env.NODE_ENV === "development" && user) {
    console.log("[Header role]", { roleRaw, roleNorm, isAdmin, isEditor });
  }

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

  const isReading =
    pathname?.includes("/manhua/") && pathname?.includes("/chapter/");

  return (
    <header
      className={[
        "z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md",
        isReading ? "relative" : "sticky top-0",
      ].join(" ")}
    >
      {/* TOP BAR */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-3 lg:px-16">
        {/* LOGO */}
        <div className="flex items-center gap-2">
          <Link href="/" prefetch={false} className="flex items-center gap-2">
            {/* Optional: жижиг badge (хүсэхгүй бол устга) */}
            

            <ArcReadLogo />
          </Link>
        </div>

        {/* DESKTOP NAV (md дээш) */}
        <nav className="hidden items-center justify-end gap-2 text-[13px] md:flex">
          <Link href="/" prefetch={false} className={isActive("/")}>
            Нүүр
          </Link>

          <Link href="/manhuas" prefetch={false} className={isActive("/manhuas")}>
            Жагсаалт
          </Link>

          <Link href="/leaderboard" prefetch={false} className={isActive("/leaderboard")}>
            Leaderboard
          </Link>

          <Link href="/requests" prefetch={false} className={isActive("/requests")}>
            Хүсэлт
          </Link>

          <Link href="/profile" prefetch={false} className={isActive("/profile")}>
            Профайл
          </Link>

          {user && (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  prefetch={false}
                  className="rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-3 py-1 text-[12px] font-semibold text-slate-950 shadow-sm shadow-amber-500/50 hover:brightness-110"
                >
                  Admin
                </Link>
              )}

              {isEditor && (
                <Link
                  href="/editor/manhuas"
                  prefetch={false}
                  className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-3 py-1 text-[12px] font-semibold text-slate-950 shadow-sm shadow-emerald-500/50 hover:brightness-110"
                >
                  Editor
                </Link>
              )}
            </>
          )}

          {user ? (
            <>
              <div className="flex items-center gap-2">
                <span className="max-w-[140px] truncate text-xs text-slate-400">
                  {user.username}
                </span>
                {/* Role badge */}
                {isAdmin && (
                  <span className="rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 shadow-sm shadow-amber-500/50">
                    ADMIN
                  </span>
                )}
                {isEditor && !isAdmin && (
                  <span className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 shadow-sm shadow-emerald-500/50">
                    EDITOR
                  </span>
                )}
              </div>
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
                prefetch={false}
                className="rounded-full border border-slate-700 px-3 py-1 text-[12px] font-medium text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
              >
                Нэвтрэх
              </Link>
              <Link
                href="/register"
                prefetch={false}
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
            <div className="flex items-center gap-1.5">
              <span className="max-w-[90px] truncate text-[11px] text-slate-400">
                {user.username}
              </span>
              {/* Role badge (mobile) */}
              {isAdmin && (
                <span className="rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-1.5 py-0.5 text-[9px] font-bold text-slate-950 shadow-sm shadow-amber-500/50">
                  ADMIN
                </span>
              )}
              {isEditor && !isAdmin && (
                <span className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-1.5 py-0.5 text-[9px] font-bold text-slate-950 shadow-sm shadow-emerald-500/50">
                  EDITOR
                </span>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              prefetch={false}
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
              prefetch={false}
              className={`${isActive("/")} w-full text-left`}
              onClick={() => setIsOpen(false)}
            >
              Нүүр
            </Link>

            <Link
              href="/manhuas"
              prefetch={false}
              className={`${isActive("/manhuas")} w-full text-left`}
              onClick={() => setIsOpen(false)}
            >
              Жагсаалт
            </Link>

            <Link
              href="/profile"
              prefetch={false}
              className={`${isActive("/profile")} w-full text-left`}
              onClick={() => setIsOpen(false)}
            >
              Профайл
            </Link>

            <Link
              href="/leaderboard"
              prefetch={false}
              className={`${isActive("/leaderboard")} w-full text-left`}
              onClick={() => setIsOpen(false)}
            >
              Leaderboard
            </Link>

            <Link
              href="/requests"
              prefetch={false}
              className={`${isActive("/requests")} w-full text-left`}
              onClick={() => setIsOpen(false)}
            >
              Хүсэлт
            </Link>

            {user && (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    prefetch={false}
                    className="mt-1 w-full rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-3 py-1 text-[12px] font-semibold text-slate-950 shadow-sm shadow-amber-500/50 hover:brightness-110"
                    onClick={() => setIsOpen(false)}
                  >
                    Admin
                  </Link>
                )}

                {isEditor && (
                  <Link
                    href="/editor/manhuas"
                    prefetch={false}
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
                <Link
                  href="/register"
                  prefetch={false}
                  className="w-full rounded-full bg-cyan-500 px-3 py-1.5 text-[12px] font-semibold text-slate-950 shadow-sm shadow-cyan-500/40 hover:bg-cyan-400"
                  onClick={() => setIsOpen(false)}
                >
                  Бүртгүүлэх
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
