"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getEditorOnboarding } from "@/lib/api";

export function BecomeEditorCard() {
  const { user } = useAuth();
  const [signupEnabled, setSignupEnabled] = useState(true);

  useEffect(() => {
    if (!user || String(user.role || "user").toLowerCase() !== "user") return;
    getEditorOnboarding()
      .then((meta) => {
        if (meta && typeof meta.signupEnabled === "boolean") {
          setSignupEnabled(meta.signupEnabled);
        }
      })
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const role = String(user.role || "user").toLowerCase();

  if (role === "admin") {
    return (
      <section className="rounded-[14px] p-4 sm:p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-amber)" }} />
          <h2 className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
            Удирдлага
          </h2>
        </div>
        <p className="text-[13px] mb-3" style={{ color: "var(--arc-dim)" }}>
          Та admin эрхтэй. Энэ бүртгэлийг энгийн editor болгон бууруулахгүй.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline"
            style={{ background: "linear-gradient(135deg,oklch(0.82 0.16 85),oklch(0.7 0.18 60))", color: "#07070e" }}
          >
            Admin удирдлага
          </Link>
          <Link
            href="/editor/manhuas"
            className="rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline"
            style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}
          >
            Editor удирдлага
          </Link>
        </div>
      </section>
    );
  }

  if (role === "translator") {
    return (
      <section className="rounded-[14px] p-4 sm:p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-cyan)" }} />
          <h2 className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
            Орчуулагчийн удирдлага
          </h2>
        </div>
        <p className="text-[13px] mb-3" style={{ color: "var(--arc-dim)" }}>
          Таны одоогийн эрх хэвээр байна.
        </p>
        <Link
          href="/editor/manhuas"
          className="inline-flex rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline"
          style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}
        >
          Editor удирдлага
        </Link>
      </section>
    );
  }

  if (role === "editor") {
    return (
      <section className="rounded-[14px] p-4 sm:p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "oklch(0.75 0.17 145)" }} />
          <h2 className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
            Editor
          </h2>
        </div>
        <p className="text-[13px] mb-3" style={{ color: "var(--arc-dim)" }}>
          Өөрийн манхва, бүлгээ нэмж нийтлээрэй.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/editor/manhuas"
            className="rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline"
            style={{ background: "var(--arc-cyan)", color: "#07070e" }}
          >
            Editor удирдлага
          </Link>
          <Link
            href="/editor/manhuas/new"
            className="rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline"
            style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}
          >
            Манхва нэмэх
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[14px] p-4 sm:p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-cyan)" }} />
        <h2 className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
          Editor болох
        </h2>
      </div>
      <p className="text-[13px] mb-3" style={{ color: "var(--arc-dim)" }}>
        {signupEnabled
          ? "Өөрийн орчуулсан манхвагаа нийтэлж, уншигчдад хүргээрэй."
          : "Одоогоор шинээр editor болох боломжгүй."}
      </p>
      {signupEnabled ? (
        <Link
          href="/profile/become-editor"
          className="inline-flex rounded-[9px] px-4 py-2.5 text-[13px] font-semibold no-underline"
          style={{ background: "var(--arc-cyan)", color: "#07070e" }}
        >
          Editor болох
        </Link>
      ) : null}
    </section>
  );
}
