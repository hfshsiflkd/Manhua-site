"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listMyRecruitmentApplications, withdrawRecruitmentApplication, type RecruitmentApplication } from "@/lib/api";
import { useToast } from "@/app/components/ToastProvider";

const STATUS: Record<string, string> = {
  pending: "Хүлээгдэж буй",
  accepted: "Зөвшөөрсөн",
  rejected: "Татгалзсан",
  withdrawn: "Цуцалсан",
};

export function MyRecruitmentApplications() {
  const toast = useToast();
  const [items, setItems] = useState<RecruitmentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const reload = () => {
    listMyRecruitmentApplications()
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  if (loading && items.length === 0) return null;
  if (!items.length) return null;

  return (
    <section className="rounded-[14px] p-4 sm:p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <h2 className="text-[13px] font-bold mb-3" style={{ color: "var(--arc-text)" }}>Миний хүсэлтүүд</h2>
      <div className="space-y-2">
        {items.map((app) => (
          <div key={app.id} className="rounded-[9px] px-3 py-2" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold" style={{ color: "var(--arc-text)" }}>{app.listingTitle}</div>
                <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{app.teamName} · {new Date(app.createdAt).toLocaleDateString("mn-MN")} · {STATUS[app.status]}</div>
                {app.status === "rejected" && app.decisionNote ? <div className="text-[11px]" style={{ color: "var(--arc-amber)" }}>{app.decisionNote}</div> : null}
                {app.status === "rejected" || app.status === "withdrawn" ? (
                  <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Энэ хувилбарт автоматаар дахин илгээхгүй.</div>
                ) : null}
              </div>
              {app.status === "accepted" ? (
                <Link href={`/editor/teams/${app.teamId}`} className="text-[12px] no-underline" style={{ color: "var(--arc-cyan)" }}>Баг руу орох</Link>
              ) : null}
              {app.status === "pending" ? (
                <button
                  type="button"
                  disabled={working === app.id}
                  onClick={async () => {
                    try {
                      setWorking(app.id);
                      await withdrawRecruitmentApplication(app.id);
                      toast.success("Цуцаллаа");
                      reload();
                    } catch (e: unknown) {
                      const ax = e as { response?: { data?: { message?: string } } };
                      toast.error(ax?.response?.data?.message || "Алдаа");
                    } finally {
                      setWorking(null);
                    }
                  }}
                  className="text-[12px]"
                  style={{ color: "var(--arc-text)", background: "none", border: "none" }}
                >
                  Цуцлах
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
