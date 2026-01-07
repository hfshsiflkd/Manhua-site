"use client";

import Link from "next/link";

export default function FeedbackFooterForm() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-950/60 p-4 shadow-lg shadow-black/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Санал хүсэлт</div>
          <div className="mt-1 text-xs text-gray-400">
            Санал, хүсэлт, гомдол, алдааны мэдээлэл, зураг хавсаргах боломжтой.
          </div>
        </div>
        <div className="mt-0.5 shrink-0 rounded-full border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] text-gray-300">
          24/7
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Link
          href="/feedback"
          className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2.5 text-center text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110"
        >
          Санал хүсэлт илгээх
        </Link>
        <div className="text-[11px] text-gray-500">
          Нэр, тайлбар, төрөл (санал/гомдол), мөн зураг (optional) оруулна.
        </div>
      </div>
    </div>
  );
}

