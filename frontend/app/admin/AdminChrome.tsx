"use client";

import "../globals.css";
import Header from "../components/Header";

export default function AdminChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--arc-bg)" }}>
      <div className="flex-none" style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-bg)" }}>
        <Header />
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
