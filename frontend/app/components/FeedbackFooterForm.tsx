"use client";

import Link from "next/link";

export default function FeedbackFooterForm() {
  return (
    <div className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--arc-text)" }}>Санал хүсэлт</div>
          <div className="mt-1 text-[12px]" style={{ color: "var(--arc-muted)" }}>
            Санал, хүсэлт, гомдол, алдааны мэдээлэл, зураг хавсаргах боломжтой.
          </div>
        </div>
        <div
          className="mt-0.5 shrink-0 text-[11px] px-2 py-1 rounded-full"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-muted)" }}
        >
          24/7
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Link
          href="/feedback"
          className="w-full rounded-[9px] px-4 py-2.5 text-center text-[12px] font-bold transition-all hover:brightness-110"
          style={{ background: "var(--arc-cyan)", color: "#07070e" }}
        >
          Санал хүсэлт илгээх
        </Link>
        <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>
          Нэр, тайлбар, төрөл (санал/гомдол), мөн зураг (optional) оруулна.
        </div>
      </div>
    </div>
  );
}
