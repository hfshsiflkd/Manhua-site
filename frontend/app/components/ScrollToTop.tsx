"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  const isReading =
    pathname?.includes("/manhua/") && pathname?.includes("/chapter/");

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (!show) return null;

  return (
    <button
      onClick={goTop}
      aria-label="Scroll to top"
      className={[
        "fixed bottom-5 right-5 z-[60] h-11 w-11 rounded-full",
        "border border-slate-700/70 bg-slate-950/85 backdrop-blur text-slate-100",
        "shadow-lg shadow-black/40 transition active:scale-95",
        "hover:border-cyan-400 hover:text-cyan-200 hover:bg-slate-900",
        isReading ? "opacity-40 hover:opacity-80" : "opacity-100",
      ].join(" ")}
    >
      <span className="text-lg leading-none">↑</span>
    </button>
  );
}
