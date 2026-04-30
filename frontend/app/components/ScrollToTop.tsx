"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  const isReading = pathname?.includes("/manhua/") && pathname?.includes("/chapter/");

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="fixed bottom-5 right-5 z-[60] h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-95"
      style={{
        border: "1px solid var(--arc-border)",
        background: "var(--arc-card)",
        backdropFilter: "blur(12px)",
        color: "var(--arc-dim)",
        opacity: isReading ? 0.4 : 1,
        boxShadow: "0 4px 16px rgba(0,0,0,.4)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-cyan)";
        (e.currentTarget as HTMLElement).style.color = "var(--arc-cyan)";
        (e.currentTarget as HTMLElement).style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--arc-border)";
        (e.currentTarget as HTMLElement).style.color = "var(--arc-dim)";
        (e.currentTarget as HTMLElement).style.opacity = isReading ? "0.4" : "1";
      }}
    >
      <span className="text-lg leading-none">↑</span>
    </button>
  );
}
