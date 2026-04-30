/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "../../../components/AdminShell";
import { adminDeleteChapter, adminGetChapters } from "@/lib/api";
import { useConfirm } from "@/app/components/ConfirmProvider";
import { useToast } from "@/app/components/ToastProvider";
import type { Chapter } from "@/types/manhua";

const actBtn: React.CSSProperties = {
  padding: "3px 9px", borderRadius: 6,
  border: "1px solid var(--arc-border)", background: "transparent",
  color: "var(--arc-dim)", fontSize: 10, cursor: "pointer",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  transition: "color .12s, border-color .12s",
};

export default function AdminChaptersPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    if (!slug) return;
    async function load() {
      try {
        const data = await adminGetChapters(slug);
        setChapters(data || []);
      } catch (e: any) {
        const status = e.response?.status;
        if (status === 401 || status === 403) router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, router]);

  const handleDelete = async (chapter: Chapter) => {
    const ok = await confirm({
      title: "Chapter устгах уу?",
      description: `Ch. ${chapter.chapterNumber}${chapter.title ? ` – ${chapter.title}` : ""} устгах уу? Буцаах боломжгүй.`,
      confirmText: "Устгах",
      cancelText: "Болих",
    });
    if (!ok) return;
    try {
      setDeletingId(chapter._id);
      await adminDeleteChapter(chapter._id);
      setChapters((prev) => prev.filter((ch) => ch._id !== chapter._id));
      toast.success("Chapter устгагдлаа");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Chapter устгах үед алдаа гарлаа");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminShell
      title={`Chapters – ${slug}`}
      subtitle="Chapter-үүдийг үүсгэж, засаж, хуудаснуудыг удирдана."
    >
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/admin/manhuas/${slug}`}
            className="rounded-[9px] px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", textDecoration: "none" }}
          >
            ← Манхуа засах руу
          </Link>
          <Link
            href={`/admin/manhuas/${slug}/chapters/new`}
            className="rounded-[8px] px-3 py-1.5 text-[11px] font-semibold transition-all hover:brightness-110"
            style={{ background: "oklch(0.72 0.17 195)", color: "#07070e", textDecoration: "none" }}
          >
            + Шинэ chapter
          </Link>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-[10px]" style={{ background: "var(--arc-elevated)" }} />
            ))}
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)" }}>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "rgba(0,0,0,.2)", borderBottom: "1px solid var(--arc-border)" }}>
                  <tr>
                    {["Chapter", "Гарчиг", "Pages", "Status", "Views", ""].map((h, i) => (
                      <th key={i} style={{
                        padding: "9px 16px", textAlign: i === 5 ? "right" : "left",
                        fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
                        textTransform: "uppercase", color: "var(--arc-muted)",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chapters
                    .slice()
                    .sort((a, b) => a.chapterNumber - b.chapterNumber)
                    .map((ch) => (
                      <tr
                        key={ch._id}
                        style={{ borderTop: "1px solid var(--arc-border)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.02)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                      >
                        <td style={{ padding: "10px 16px" }}>
                          <span
                            className="font-semibold text-[12px]"
                            style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}
                          >
                            Ch. {ch.chapterNumber}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--arc-dim)" }}>
                          {ch.title || <span style={{ color: "var(--arc-muted)" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--arc-text)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", fontWeight: 600 }}>
                          {ch.pages?.length || 0}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                            ...(ch.status === "published"
                              ? { background: "oklch(0.72 0.17 155/.1)", border: "1px solid oklch(0.72 0.17 155/.3)", color: "oklch(0.8 0.14 155)" }
                              : { background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", color: "var(--arc-muted)" }),
                          }}>
                            {ch.status || "—"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--arc-dim)" }}>
                          {(ch as any).views || 0}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/admin/manhuas/${slug}/chapters/${ch._id}`}
                              style={{ ...actBtn, borderColor: "oklch(0.72 0.17 195/.3)", color: "var(--arc-cyan)", background: "oklch(0.72 0.17 195/.08)", textDecoration: "none" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.17 195/.15)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.17 195/.08)"; }}
                            >
                              Засах
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(ch)}
                              disabled={deletingId === ch._id}
                              style={{ ...actBtn, borderColor: "oklch(0.65 0.22 15/.3)", color: "var(--arc-rose)", background: "oklch(0.65 0.22 15/.08)" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.65 0.22 15/.15)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.65 0.22 15/.08)"; }}
                            >
                              {deletingId === ch._id ? "..." : "Устгах"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {chapters.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--arc-muted)" }}>
                        Одоогоор chapter алга.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
