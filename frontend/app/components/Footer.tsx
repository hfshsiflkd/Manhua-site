"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Footer = () => {
  const pathname = usePathname();
  if (/\/manhua\/.+\/chapter\//.test(pathname)) return null;

  return (
    <footer
      className="mt-12"
      style={{ borderTop: "1px solid var(--arc-border)" }}
    >
      <div
        className="mx-auto px-6 py-7 text-center"
        style={{ maxWidth: "var(--arc-max-w)" }}
      >
        <div
          className="mb-2 text-[15px] font-bold"
          style={{
            fontFamily: "var(--font-head, 'Space Grotesk', sans-serif)",
            color: "var(--arc-text)",
          }}
        >
          ARC<span style={{ color: "var(--arc-rose)" }}>•</span>READ
        </div>
        <div className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
          © {new Date().getFullYear()} ARC•READ —{" "}
          <Link
            href="/term"
            className="hover:underline transition-colors"
            style={{ color: "var(--arc-muted)" }}
          >
            Үйлчилгээний нөхцөл
          </Link>
          {" · "}
          <Link
            href="/feedback"
            className="hover:underline transition-colors"
            style={{ color: "var(--arc-muted)" }}
          >
            Санал хүсэлт
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
