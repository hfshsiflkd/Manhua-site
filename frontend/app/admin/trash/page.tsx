/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminShell from "../components/AdminShell";
import {
  adminListTrashManhuas,
  adminListTrashChapters,
  adminRestoreManhua,
  adminRestoreChapter,
  adminPermanentDeleteManhua,
  adminPermanentDeleteChapter,
  TrashManhua,
  TrashChapter,
} from "@/lib/api";

type Tab = "manhuas" | "chapters";

const btn: React.CSSProperties = {
  padding: "5px 11px",
  borderRadius: 6,
  border: "1px solid var(--arc-border)",
  background: "transparent",
  color: "var(--arc-dim)",
  fontSize: 10,
  cursor: "pointer",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  transition: "color .12s, border-color .12s, background .12s",
};
const btnRestore: React.CSSProperties = {
  ...btn,
  borderColor: "oklch(0.72 0.17 155 / .4)",
  color: "oklch(0.8 0.14 155)",
};
const btnDanger: React.CSSProperties = {
  ...btn,
  borderColor: "oklch(0.65 0.22 25 / .4)",
  color: "oklch(0.78 0.18 25)",
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function AdminTrashPage() {
  const [tab, setTab] = useState<Tab>("manhuas");
  const [manhuas, setManhuas] = useState<TrashManhua[]>([]);
  const [chapters, setChapters] = useState<TrashChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, c] = await Promise.all([
        adminListTrashManhuas(),
        adminListTrashChapters(),
      ]);
      setManhuas(Array.isArray(m) ? m : []);
      setChapters(Array.isArray(c) ? c : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Ачаалж чадсангүй");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleRestoreManhua(id: string) {
    if (!confirm("Манхуаг сэргээх үү? Эзэмшигч таны нэр дээр шилжинэ.")) return;
    setBusyId(id);
    try {
      await adminRestoreManhua(id);
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setBusyId(null);
    }
  }
  async function handlePermDeleteManhua(id: string) {
    if (
      !confirm(
        "БҮРМӨСӨН устгах уу? Манхуа болон бүх chapter-ууд дахин сэргэхгүйгээр устана."
      )
    )
      return;
    setBusyId(id);
    try {
      await adminPermanentDeleteManhua(id);
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setBusyId(null);
    }
  }
  async function handleRestoreChapter(id: string) {
    setBusyId(id);
    try {
      await adminRestoreChapter(id);
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setBusyId(null);
    }
  }
  async function handlePermDeleteChapter(id: string) {
    if (!confirm("Chapter БҮРМӨСӨН устгах уу?")) return;
    setBusyId(id);
    try {
      await adminPermanentDeleteChapter(id);
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      title="Сагс"
      subtitle="Устгасан манхуа болон chapter-ууд. Сэргээх эсвэл бүрмөсөн устгах боломжтой."
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b" style={{ borderColor: "var(--arc-border)" }}>
          <button
            onClick={() => setTab("manhuas")}
            className="px-3 py-2 text-[12px] font-semibold transition-colors"
            style={{
              color: tab === "manhuas" ? "var(--arc-text)" : "var(--arc-muted)",
              borderBottom:
                tab === "manhuas"
                  ? "2px solid var(--arc-cyan)"
                  : "2px solid transparent",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Манхуа ({manhuas.length})
          </button>
          <button
            onClick={() => setTab("chapters")}
            className="px-3 py-2 text-[12px] font-semibold transition-colors"
            style={{
              color: tab === "chapters" ? "var(--arc-text)" : "var(--arc-muted)",
              borderBottom:
                tab === "chapters"
                  ? "2px solid var(--arc-cyan)"
                  : "2px solid transparent",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Chapter ({chapters.length})
          </button>
        </div>

        {error && (
          <div
            className="rounded-md p-3 text-[12px]"
            style={{
              background: "oklch(0.65 0.22 25 / .1)",
              border: "1px solid oklch(0.65 0.22 25 / .3)",
              color: "oklch(0.78 0.18 25)",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
            Уншиж байна…
          </p>
        ) : tab === "manhuas" ? (
          manhuas.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
              Сагс хоосон.
            </p>
          ) : (
            <div className="space-y-2">
              {manhuas.map((m) => (
                <div
                  key={m._id}
                  className="rounded-[10px] p-3 flex items-center gap-3"
                  style={{
                    background: "var(--arc-card)",
                    border: "1px solid var(--arc-border)",
                  }}
                >
                  <img
                    src={m.coverImage || m.coverImageUrl || "/placeholder.png"}
                    alt={m.title}
                    width={42}
                    height={56}
                    style={{
                      borderRadius: 6,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/trash/${m._id}`}
                      className="font-semibold text-[13px] truncate"
                      style={{ color: "var(--arc-text)", textDecoration: "none" }}
                    >
                      {m.title}
                    </Link>
                    <div
                      className="text-[10px] mt-0.5 flex flex-wrap gap-x-3"
                      style={{ color: "var(--arc-muted)" }}
                    >
                      <span>Slug: {m.slug}</span>
                      <span>Chapters: {m.chapterStats?.totalChapters ?? 0}</span>
                      <span>Устгасан: {fmtDate(m.deletedAt)}</span>
                      {m.deletedBy?.username && (
                        <span>Хэн: {m.deletedBy.username}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/trash/${m._id}`}
                      style={{ ...btn, textDecoration: "none" }}
                    >
                      Дэлгэрэнгүй
                    </Link>
                    <button
                      style={btnRestore}
                      disabled={busyId === m._id}
                      onClick={() => handleRestoreManhua(m._id)}
                    >
                      Сэргээх
                    </button>
                    <button
                      style={btnDanger}
                      disabled={busyId === m._id}
                      onClick={() => handlePermDeleteManhua(m._id)}
                    >
                      Бүрмөсөн устгах
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : chapters.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
            Сагс хоосон.
          </p>
        ) : (
          <div className="space-y-2">
            {chapters.map((c) => {
              const manhuaDeleted = !!c.manhua?.deletedAt;
              return (
                <div
                  key={c._id}
                  className="rounded-[10px] p-3 flex items-center gap-3"
                  style={{
                    background: "var(--arc-card)",
                    border: "1px solid var(--arc-border)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-semibold text-[13px] truncate"
                      style={{ color: "var(--arc-text)" }}
                    >
                      {c.manhua?.title || "—"} — Ch. {c.chapterNumber}
                      {c.title ? `: ${c.title}` : ""}
                    </div>
                    <div
                      className="text-[10px] mt-0.5 flex flex-wrap gap-x-3"
                      style={{ color: "var(--arc-muted)" }}
                    >
                      <span>Устгасан: {fmtDate(c.deletedAt)}</span>
                      {c.deletedBy?.username && (
                        <span>Хэн: {c.deletedBy.username}</span>
                      )}
                      {manhuaDeleted && (
                        <span style={{ color: "oklch(0.78 0.18 25)" }}>
                          ⚠ Манхуа нь бас устсан
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      style={btnRestore}
                      disabled={busyId === c._id || manhuaDeleted}
                      title={
                        manhuaDeleted
                          ? "Эхлээд манхуагаа сэргээ"
                          : "Сэргээх"
                      }
                      onClick={() => handleRestoreChapter(c._id)}
                    >
                      Сэргээх
                    </button>
                    <button
                      style={btnDanger}
                      disabled={busyId === c._id}
                      onClick={() => handlePermDeleteChapter(c._id)}
                    >
                      Бүрмөсөн устгах
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
