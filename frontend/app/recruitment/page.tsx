"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listRecruitment, type PublicRecruitmentListing } from "@/lib/api";
import { SKILL_LABELS } from "@/lib/creatorLabels";

const COMP: Record<string, string> = {
  volunteer: "Сайн дурын",
  paid: "Төлбөртэй",
  negotiable: "Тохиролцоно",
};

const ROLES = Object.keys(SKILL_LABELS);

export default function RecruitmentBoardPage() {
  const [items, setItems] = useState<PublicRecruitmentListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [workRole, setWorkRole] = useState("");
  const [compensation, setCompensation] = useState("");
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 12;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listRecruitment({ page, limit, workRole: workRole || undefined, compensation: compensation || undefined, q: q || undefined })
      .then((data) => {
        if (!active) return;
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => {
        if (!active) return;
        setError("Заруудыг уншиж чадсангүй.");
        setItems([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, workRole, compensation, q]);

  const empty = useMemo(() => !loading && !error && items.length === 0, [loading, error, items.length]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="relative overflow-hidden" style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="relative mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
          <h1 className="text-[30px] font-extrabold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
            Багт нэгдэх
          </h1>
          <p className="mt-3 text-[13px]" style={{ color: "var(--arc-dim)", maxWidth: 560 }}>
            Орчуулга, зураг цэвэрлэх, текст өрөх, хянах ажил хайж буй багийн зарууд. Хүсэлт илгээхийн тулд нэвтэрнэ үү.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 pb-24 space-y-5">
        <form
          className="grid gap-3 sm:grid-cols-[1fr,160px,160px,auto]"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQ(qDraft.trim());
          }}
        >
          <input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Нэр, гарчиг, манхва"
            className="rounded-[9px] px-3 py-2.5 text-[13px] outline-none"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}
          />
          <select value={workRole} onChange={(e) => { setWorkRole(e.target.value); setPage(1); }} className="rounded-[9px] px-3 py-2.5 text-[13px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}>
            <option value="">Бүх үүрэг</option>
            {ROLES.map((id) => (
              <option key={id} value={id}>{SKILL_LABELS[id]}</option>
            ))}
          </select>
          <select value={compensation} onChange={(e) => { setCompensation(e.target.value); setPage(1); }} className="rounded-[9px] px-3 py-2.5 text-[13px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}>
            <option value="">Бүх нөхцөл</option>
            {Object.entries(COMP).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <button type="submit" className="rounded-[9px] px-4 py-2.5 text-[12px] font-semibold" style={{ background: "var(--arc-cyan)", color: "#07070e" }}>Хайх</button>
        </form>

        {loading && <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Ачааллаж байна...</p>}
        {error && <p className="text-[13px]" style={{ color: "oklch(0.75 0.18 15)" }}>{error}</p>}
        {empty && <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Одоогоор нээлттэй зар алга.</p>}

        <div className="grid gap-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-[14px] p-4 sm:p-5 flex gap-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              {item.manhua?.coverImage ? (
                <img src={item.manhua.coverImage} alt="" className="h-24 w-16 rounded-[8px] object-cover shrink-0" />
              ) : null}
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-bold" style={{ color: "var(--arc-text)" }}>{item.title}</h2>
                <p className="mt-1 text-[12px]" style={{ color: "var(--arc-muted)" }}>
                  {item.team.name}
                  {item.manhua ? ` · ${item.manhua.title}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full px-2 py-1" style={{ background: "var(--arc-elevated)", color: "var(--arc-cyan)" }}>{SKILL_LABELS[item.workRole] || item.workRole}</span>
                  <span className="rounded-full px-2 py-1" style={{ background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>{COMP[item.compensation]}</span>
                  <span className="rounded-full px-2 py-1" style={{ color: "var(--arc-muted)" }}>{new Date(item.createdAt).toLocaleDateString("mn-MN")}</span>
                </div>
                <Link href={`/recruitment/${item.id}`} className="inline-flex mt-3 rounded-[8px] px-3 py-1.5 text-[12px] font-semibold no-underline" style={{ border: "1px solid var(--arc-border)", color: "var(--arc-text)" }}>
                  Дэлгэрэнгүй
                </Link>
              </div>
            </article>
          ))}
        </div>

        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-3" aria-label="Хуудас">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-[8px] px-3 py-1.5 text-[12px]" style={{ border: "1px solid var(--arc-border)", color: "var(--arc-text)" }}>Өмнөх</button>
            <span className="text-[12px]" style={{ color: "var(--arc-muted)" }}>{page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-[8px] px-3 py-1.5 text-[12px]" style={{ border: "1px solid var(--arc-border)", color: "var(--arc-text)" }}>Дараах</button>
          </nav>
        )}
      </div>
    </div>
  );
}
