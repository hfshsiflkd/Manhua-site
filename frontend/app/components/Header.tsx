// components/Header.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

function ArcMark() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M8 28 C14 14 34 14 40 28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M16 34 C20 30 28 30 32 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="12" r="3" fill="var(--arc-rose)" />
    </svg>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const roleRaw = (user as { role?: string } | null | undefined)?.role;
  const roleNorm = (roleRaw || "").toLowerCase().trim();
  const isAdmin = roleNorm === "admin";
  const isEditor = roleNorm === "editor" || roleNorm === "translator";

  const isActive = (href: string) => pathname === href;

  const navLinkClass = (href: string) =>
    `px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-150 ${
      isActive(href)
        ? "text-[var(--arc-cyan)] bg-[var(--arc-cyan-dim)]"
        : "text-[var(--arc-dim)] hover:text-[var(--arc-text)] hover:bg-white/5"
    }`;

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    router.push("/");
  };

  const isReading =
    pathname?.includes("/manhua/") && pathname?.includes("/chapter/");

  if (isReading) return null;

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        borderColor: "var(--arc-border)",
        background: "rgba(7,7,14,0.88)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      {/* TOP BAR */}
      <div
        className="mx-auto flex items-center justify-between gap-2 px-6"
        style={{ maxWidth: "var(--arc-max-w)", height: "56px" }}
      >
        {/* LOGO */}
        <Link href="/" prefetch={false} className="flex items-center gap-2.5 shrink-0 no-underline">
          <div
            className="flex items-center justify-center rounded-[9px] relative"
            style={{
              width: 34,
              height: 34,
              background: "var(--arc-elevated)",
              border: "1px solid var(--arc-border)",
            }}
          >
            <div
              className="absolute inset-[-1px] rounded-[10px] -z-10"
              style={{ background: "var(--arc-rose-glow)", filter: "blur(6px)" }}
            />
            <ArcMark />
          </div>
          <span
            className="text-[17px] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-head, 'Space Grotesk', sans-serif)", color: "var(--arc-text)" }}
          >
            ARC<span style={{ color: "var(--arc-rose)" }}>•</span>READ
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-0.5">
          <Link href="/" prefetch={false} className={navLinkClass("/")}>Нүүр</Link>
          <Link href="/manhuas" prefetch={false} className={navLinkClass("/manhuas")}>Жагсаалт</Link>
          <Link href="/leaderboard" prefetch={false} className={navLinkClass("/leaderboard")}>Leaderboard</Link>
          <Link href="/requests" prefetch={false} className={navLinkClass("/requests")}>Хүсэлт</Link>
          <Link href="/profile" prefetch={false} className={navLinkClass("/profile")}>Профайл</Link>

          {user && isAdmin && (
            <Link href="/admin" prefetch={false}
              className="ml-1 rounded-full px-3 py-1.5 text-[12px] font-semibold"
              style={{ background: "linear-gradient(135deg,oklch(0.82 0.16 85),oklch(0.7 0.18 60))", color: "#07070e" }}>
              Admin
            </Link>
          )}
          {user && isEditor && (
            <Link href="/editor/manhuas" prefetch={false}
              className="ml-1 rounded-full px-3 py-1.5 text-[12px] font-semibold"
              style={{ background: "linear-gradient(135deg,oklch(0.72 0.85 160),oklch(0.72 0.17 195))", color: "#07070e" }}>
              Editor
            </Link>
          )}
        </nav>

        {/* DESKTOP RIGHT */}
        <div className="hidden md:flex items-center gap-2">
          {/* Search */}
          <button
            className="flex items-center justify-center rounded-[9px] transition-colors"
            style={{
              width: 34, height: 34,
              background: "transparent",
              border: "1px solid var(--arc-border)",
              color: "var(--arc-dim)",
            }}
            onClick={() => router.push("/manhuas")}
            title="Search"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>

          {user ? (
            <>
              <span className="max-w-[120px] truncate text-xs" style={{ color: "var(--arc-dim)" }}>
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
                style={{
                  border: "1px solid var(--arc-border)",
                  background: "transparent",
                  color: "var(--arc-text)",
                }}
              >
                Гарах
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                prefetch={false}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
                style={{
                  border: "1px solid var(--arc-border)",
                  background: "transparent",
                  color: "var(--arc-text)",
                }}
              >
                Нэвтрэх
              </Link>
              <Link
                href="/register"
                prefetch={false}
                className="rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all"
                style={{
                  background: "var(--arc-cyan)",
                  color: "#07070e",
                  boxShadow: "0 0 18px var(--arc-cyan-glow)",
                  border: "none",
                }}
              >
                Бүртгүүлэх
              </Link>
            </>
          )}
        </div>

        {/* MOBILE RIGHT */}
        <div className="flex md:hidden items-center gap-2">
          {user ? (
            <span className="max-w-[80px] truncate text-[11px]" style={{ color: "var(--arc-dim)" }}>
              {user.username}
            </span>
          ) : (
            <Link href="/login" prefetch={false}
              className="rounded-full px-3 py-1 text-[11px] font-medium"
              style={{ border: "1px solid var(--arc-border)", color: "var(--arc-text)" }}>
              Нэвтрэх
            </Link>
          )}
          <button
            onClick={() => setIsOpen((p) => !p)}
            className="flex items-center justify-center rounded-[9px]"
            style={{ width: 34, height: 34, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}
            aria-label="Toggle navigation"
          >
            <div className="flex flex-col gap-[3px]">
              <span className="h-[2px] w-4 rounded-full bg-current" />
              <span className="h-[2px] w-4 rounded-full bg-current" />
              <span className="h-[2px] w-4 rounded-full bg-current" />
            </div>
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {isOpen && (
        <div className="md:hidden" style={{ borderTop: "1px solid var(--arc-border)", background: "rgba(7,7,14,0.96)" }}>
          <nav className="mx-auto flex flex-col gap-1 px-4 py-3" style={{ maxWidth: "var(--arc-max-w)" }}>
            {[
              { href: "/", label: "Нүүр" },
              { href: "/manhuas", label: "Жагсаалт" },
              { href: "/leaderboard", label: "Leaderboard" },
              { href: "/requests", label: "Хүсэлт" },
              { href: "/profile", label: "Профайл" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} prefetch={false}
                className={`w-full rounded-full px-3 py-2 text-[13px] font-medium transition-colors ${isActive(href) ? "text-[var(--arc-cyan)] bg-[var(--arc-cyan-dim)]" : "text-[var(--arc-dim)] hover:text-[var(--arc-text)]"}`}
                onClick={() => setIsOpen(false)}>
                {label}
              </Link>
            ))}

            {user && isAdmin && (
              <Link href="/admin" prefetch={false}
                className="mt-1 rounded-full px-3 py-2 text-[12px] font-semibold text-center"
                style={{ background: "linear-gradient(135deg,oklch(0.82 0.16 85),oklch(0.7 0.18 60))", color: "#07070e" }}
                onClick={() => setIsOpen(false)}>
                Admin
              </Link>
            )}
            {user && isEditor && (
              <Link href="/editor/manhuas" prefetch={false}
                className="mt-1 rounded-full px-3 py-2 text-[12px] font-semibold text-center"
                style={{ background: "linear-gradient(135deg,oklch(0.72 0.85 160),oklch(0.72 0.17 195))", color: "#07070e" }}
                onClick={() => setIsOpen(false)}>
                Editor
              </Link>
            )}

            <div className="mt-2">
              {user ? (
                <button onClick={handleLogout}
                  className="w-full rounded-full px-3 py-2 text-[12px] font-medium"
                  style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-text)" }}>
                  Гарах
                </button>
              ) : (
                <Link href="/register" prefetch={false}
                  className="block w-full rounded-full px-3 py-2 text-[12px] font-semibold text-center"
                  style={{ background: "var(--arc-cyan)", color: "#07070e" }}
                  onClick={() => setIsOpen(false)}>
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
