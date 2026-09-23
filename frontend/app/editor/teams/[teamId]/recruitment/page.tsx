"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { listTeamRecruitment, type PublicRecruitmentListing } from "@/lib/api";
import { SKILL_LABELS } from "@/lib/creatorLabels";

export default function TeamRecruitmentListPage() {
  const params = useParams();
  const teamId = String(params?.teamId || "");
  const [items, setItems] = useState<PublicRecruitmentListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    listTeamRecruitment(teamId)
      .then((data) => setItems(data.items || []))
      .catch((e) => setError(e?.response?.data?.message || "Заруудыг уншиж чадсангүй"))
      .finally(() => setLoading(false));
  }, [teamId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold" style={{ color: "var(--arc-text)" }}>Хүн хайх зарууд</h1>
        <Link href={`/editor/teams/${teamId}/recruitment/new`} className="rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline" style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
          Зар үүсгэх
        </Link>
      </div>
      {loading && <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Ачааллаж байна...</p>}
      {error && <p className="text-[13px]" style={{ color: "oklch(0.75 0.18 15)" }}>{error}</p>}
      {!loading && items.length === 0 && <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Зар алга.</p>}
      {items.map((item) => (
        <Link key={item.id} href={`/editor/teams/${teamId}/recruitment/${item.id}`} className="block rounded-[12px] p-4 no-underline" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-text)" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{item.title}</div>
              <div className="text-[12px]" style={{ color: "var(--arc-muted)" }}>{SKILL_LABELS[item.workRole] || item.workRole} · pending {item.pendingCount || 0}</div>
            </div>
            <span className="text-[11px]" style={{ color: "var(--arc-dim)" }}>{item.hidden ? "Нуусан" : item.closed ? "Хаалттай" : "Нээлттэй"}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
