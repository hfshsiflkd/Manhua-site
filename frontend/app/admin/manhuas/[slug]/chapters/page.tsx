// src/app/admin/manhuas/[slug]/chapters/page.tsx
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
        const data = await adminGetChapters(slug); // ✅ ADMIN endpoint
        setChapters(data || []);
      } catch (e: any) {
        console.error(e);
        const status = e.response?.status;
        if (status === 401 || status === 403) {
          router.push("/admin/login");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, router]);

  const handleDelete = async (chapter: Chapter) => {
    const ok = await confirm({
      title: "Chapter устгах уу?",
      description: `Ch. ${chapter.chapterNumber} ${chapter.title ? `– ${chapter.title}` : ""} устгах уу? Энэ үйлдлийг буцаах боломжгүй.`,
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
      console.error(e);
      toast.error(
        e?.response?.data?.message || "Chapter устгах үед алдаа гарлаа"
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <AdminShell
        title={`Chapters – ${slug}`}
        subtitle="Тухайн манхуа дээрх бүх chapter-ууд (admin view)."
      >
        <div className="text-sm text-slate-400">Уншиж байна...</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={`Chapters – ${slug}`}
      subtitle="Эндээс chapter-үүдийг үүсгэж, засаж, хуудаснуудыг удирдана."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/admin/manhuas/${slug}`}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-800"
          >
            ← Manhua manage руу буцах
          </Link>
          <Link
            href={`/admin/manhuas/${slug}/chapters/new`}
            className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            + Шинэ chapter
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">Chapter</th>
                <th className="px-3 py-2 text-left">Гарчиг</th>
                <th className="px-3 py-2 text-left">Pages</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Views</th>
                <th className="px-3 py-2 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {chapters
                .slice()
                .sort((a, b) => a.chapterNumber - b.chapterNumber)
                .map((ch) => (
                  <tr
                    key={ch._id}
                    className="border-t border-slate-800 hover:bg-slate-800/60"
                  >
                    <td className="px-3 py-2">Ch. {ch.chapterNumber}</td>
                    <td className="px-3 py-2">{ch.title}</td>
                    <td className="px-3 py-2">{ch.pages?.length || 0}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-300">
                      {ch.status || "—"}
                    </td>
                    <td className="px-3 py-2">{ch.views || 0}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/manhuas/${slug}/chapters/${ch._id}`}
                          className="text-[11px] text-cyan-300 hover:text-cyan-200"
                        >
                          Edit pages
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(ch)}
                          disabled={deletingId === ch._id}
                          className="text-[11px] text-rose-300 hover:text-rose-200 disabled:opacity-60"
                        >
                          {deletingId === ch._id ? "Устгаж байна..." : "Устгах"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {chapters.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-slate-400"
                  >
                    Одоогоор chapter алга.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
