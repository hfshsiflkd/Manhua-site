/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { editorDeleteChapter, editorGetChapters } from "@/lib/api";
import type { Chapter } from "@/types/manhua";
import EmptyState from "../../../components/EmptyState";
import { TableSkeleton } from "../../../components/LoadingSkeleton";
import { useConfirm } from "@/app/components/ConfirmProvider";
import { useToast } from "@/app/components/ToastProvider";

const statusBadge = (status?: string): React.CSSProperties =>
  status === "published"
    ? { border: "1px solid oklch(0.75 0.17 145/.4)", background: "oklch(0.75 0.17 145/.08)", color: "oklch(0.8 0.14 145)" }
    : { border: "1px solid oklch(0.82 0.18 75/.4)", background: "oklch(0.82 0.18 75/.08)", color: "var(--arc-amber)" };

export default function EditorChaptersPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    if (!slug) return;
    async function load() {
      try {
        setLoading(true);
        const data = await editorGetChapters(slug);
        setChapters(Array.isArray(data) ? data : []);
        setError(null);
      } catch (e: any) {
        if (e?.response?.status === 401) { router.push("/login"); return; }
        setError(e?.response?.status === 403 ? "Энэ манхуа дээр ажиллах зөвшөөрөлгүй байна." : "Chapter-ууд ачаалж чадсангүй.");
      } finally { setLoading(false); }
    }
    load();
  }, [slug, router]);

  const handleDelete = async (chapter: Chapter) => {
    const ok = await confirm({ title: "Chapter устгах уу?", description: `Ch. ${chapter.chapterNumber}${chapter.title ? ` – ${chapter.title}` : ""} устгах уу? Буцаах боломжгүй.`, confirmText: "Устгах", cancelText: "Болих" });
    if (!ok) return;
    try {
      setDeletingId(chapter._id);
      await editorDeleteChapter(chapter._id);
      setChapters((prev) => prev.filter((ch) => ch._id !== chapter._id));
      toast.success("Chapter устгагдлаа");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Chapter устгах үед алдаа гарлаа"); }
    finally { setDeletingId(null); }
  };

  const btnBase: React.CSSProperties = { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button type="button" onClick={() => router.push("/editor/manhuas")}
              className="rounded-[9px] px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80" style={btnBase}>
              ← My Manhuas
            </button>
            <span className="text-sm" style={{ color: "var(--arc-muted)" }}>/</span>
            <span className="text-sm font-mono" style={{ color: "var(--arc-dim)" }}>{slug}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--arc-text)" }}>Chapters</h1>
          <p className="text-xs sm:text-sm" style={{ color: "var(--arc-muted)" }}>Манхуа-ны chapter-уудыг эндээс удирдана.</p>
        </div>
        <button type="button" onClick={() => router.push(`/editor/manhuas/${slug}/chapters/new`)}
          className="inline-flex items-center justify-center rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold transition-opacity hover:opacity-80 whitespace-nowrap w-full sm:w-auto"
          style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
          + Add Chapter
        </button>
      </div>

      {error && (
        <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>{error}</div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : chapters.length === 0 ? (
        <EmptyState title="Одоогоор chapter алга" description="Эхний chapter-аа үүсгэж эхлээрэй."
          action={{ label: "+ Эхний Chapter үүсгэх", href: `/editor/manhuas/${slug}/chapters/new` }} icon="📖" />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)" }}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[12px]">
                <thead style={{ background: "var(--arc-elevated)", borderBottom: "1px solid var(--arc-border)" }}>
                  <tr>
                    {["Chapter", "Title", "Status", "Pages", "Created", "Actions"].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide${i === 5 ? " text-right" : " text-left"}`} style={{ color: "var(--arc-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chapters.map((ch) => (
                    <tr key={ch._id} style={{ borderTop: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold" style={{ border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" }}>
                          Ch. {ch.chapterNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-medium" style={{ color: "var(--arc-text)" }}>{ch.title || `Chapter ${ch.chapterNumber}`}</td>
                      <td className="px-4 py-3"><span className="inline-flex rounded-full px-2 py-0.5 text-[10px]" style={statusBadge(ch.status)}>{ch.status === "published" ? "Published" : "Draft"}</span></td>
                      <td className="px-4 py-3 text-[11px]" style={{ color: "var(--arc-muted)" }}>{ch.pages?.length || 0} pages</td>
                      <td className="px-4 py-3 text-[11px]" style={{ color: "var(--arc-muted)" }}>{ch.createdAt ? new Date(ch.createdAt).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/editor/manhuas/${slug}/chapters/${ch._id}`} className="rounded-full px-2.5 py-1 text-[10px] transition-opacity hover:opacity-80"
                            style={{ border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" }}>Edit</Link>
                          <button type="button" onClick={() => handleDelete(ch)} disabled={deletingId === ch._id}
                            className="rounded-full px-2.5 py-1 text-[10px] transition-opacity hover:opacity-80 disabled:opacity-60"
                            style={{ border: "1px solid oklch(0.65 0.22 15/.4)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
                            {deletingId === ch._id ? "..." : "Устгах"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {chapters.map((ch) => (
              <div key={ch._id} className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold" style={{ border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" }}>Ch. {ch.chapterNumber}</span>
                  <span className="inline-flex rounded-full px-2 py-0.5 text-[10px]" style={statusBadge(ch.status)}>{ch.status === "published" ? "Published" : "Draft"}</span>
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--arc-text)" }}>{ch.title || `Chapter ${ch.chapterNumber}`}</p>
                <div className="flex items-center gap-3 text-[11px] mb-3" style={{ color: "var(--arc-muted)" }}>
                  <span>{ch.pages?.length || 0} pages</span>
                  <span>•</span>
                  <span>{ch.createdAt ? new Date(ch.createdAt).toLocaleDateString() : "-"}</span>
                </div>
                <div className="grid gap-2">
                  <Link href={`/editor/manhuas/${slug}/chapters/${ch._id}`} className="block w-full rounded-[9px] px-4 py-2 text-xs font-medium transition-opacity hover:opacity-80 text-center"
                    style={{ border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" }}>Edit</Link>
                  <button type="button" onClick={() => handleDelete(ch)} disabled={deletingId === ch._id}
                    className="w-full rounded-[9px] px-4 py-2 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-60 text-center"
                    style={{ border: "1px solid oklch(0.65 0.22 15/.4)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
                    {deletingId === ch._id ? "Устгаж байна..." : "Устгах"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && chapters.length > 0 && (
        <div className="rounded-[9px] px-4 py-3 text-[11px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-muted)" }}>
          Нийт <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{chapters.length}</span> chapter
          {chapters.filter((ch) => ch.status === "published").length > 0 && (
            <> (<span className="font-semibold" style={{ color: "var(--arc-text)" }}>{chapters.filter((ch) => ch.status === "published").length}</span> published)</>
          )}
        </div>
      )}
    </div>
  );
}
