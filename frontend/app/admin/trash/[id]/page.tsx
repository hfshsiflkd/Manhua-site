/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "../../components/AdminShell";
import {
  adminGetTrashManhua,
  adminRestoreManhua,
  adminRestoreChapter,
  adminPermanentDeleteManhua,
  adminPermanentDeleteChapter,
  TrashManhuaDetail,
} from "@/lib/api";

const btn: React.CSSProperties = {
  padding: "5px 11px",
  borderRadius: 6,
  border: "1px solid var(--arc-border)",
  background: "transparent",
  color: "var(--arc-dim)",
  fontSize: 10,
  cursor: "pointer",
  fontFamily: "var(--font-body,'DM Sans',sans-serif)",
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

export default function TrashManhuaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<TrashManhuaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetTrashManhua(id);
      setData(res);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Ачаалж чадсангүй");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRestore() {
    if (!confirm("Манхуаг сэргээх үү? Эзэмшигч таны нэр дээр шилжинэ.")) return;
    setBusy(true);
    try {
      await adminRestoreManhua(id);
      router.push("/admin/trash");
    } catch (e: any) {
      alert(e?.response?.data?.message || "Алдаа гарлаа");
      setBusy(false);
    }
  }

  async function handlePermanentDelete() {
    if (
      !confirm(
        "Манхуа болон бүх chapter-ыг БҮРМӨСӨН устгах уу? Энэ үйлдлийг буцаах боломжгүй."
      )
    )
      return;
    setBusy(true);
    try {
      await adminPermanentDeleteManhua(id);
      router.push("/admin/trash");
    } catch (e: any) {
      alert(e?.response?.data?.message || "Алдаа гарлаа");
      setBusy(false);
    }
  }

  async function handleRestoreChapter(chapterId: string) {
    setBusy(true);
    try {
      await adminRestoreChapter(chapterId);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }

  async function handlePermDeleteChapter(chapterId: string) {
    if (!confirm("Chapter БҮРМӨСӨН устгах уу?")) return;
    setBusy(true);
    try {
      await adminPermanentDeleteChapter(chapterId);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Сагс — дэлгэрэнгүй">
        <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
          Уншиж байна…
        </p>
      </AdminShell>
    );
  }
  if (error || !data) {
    return (
      <AdminShell title="Сагс — дэлгэрэнгүй">
        <p
          className="text-[12px]"
          style={{ color: "oklch(0.78 0.18 25)" }}
        >
          {error || "Олдсонгүй"}
        </p>
        <Link href="/admin/trash" style={{ ...btn, textDecoration: "none", marginTop: 12, display: "inline-block" }}>
          ← Буцах
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={data.title}
      subtitle={`Сагсанд ${fmtDate(data.deletedAt)}-нд орсон`}
    >
      <div className="space-y-5">
        <Link
          href="/admin/trash"
          className="text-[11px]"
          style={{ color: "var(--arc-muted)", textDecoration: "none" }}
        >
          ← Сагс руу буцах
        </Link>

        {/* Manhua header */}
        <div
          className="rounded-[10px] p-4 flex gap-4"
          style={{
            background: "var(--arc-card)",
            border: "1px solid var(--arc-border)",
          }}
        >
          <img
            src={data.coverImage || data.coverImageUrl || "/placeholder.png"}
            alt={data.title}
            width={84}
            height={112}
            style={{
              borderRadius: 8,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
          <div className="flex-1 min-w-0">
            <h2
              className="font-semibold text-[16px]"
              style={{ color: "var(--arc-text)" }}
            >
              {data.title}
            </h2>
            {data.titleEn && (
              <p className="text-[11px] mt-1" style={{ color: "var(--arc-muted)" }}>
                {data.titleEn}
              </p>
            )}
            <div
              className="text-[11px] mt-2 space-y-1"
              style={{ color: "var(--arc-muted)" }}
            >
              <div>Slug: {data.slug}</div>
              <div>
                Үүсгэсэн:{" "}
                {(data.createdBy as any)?.username || "—"}
              </div>
              <div>Устгасан: {fmtDate(data.deletedAt)}</div>
              <div>Хэн: {(data.deletedBy as any)?.username || "—"}</div>
              <div>Нийт chapter: {data.chapters?.length || 0}</div>
            </div>

            <div className="mt-4 flex gap-2">
              <button style={btnRestore} disabled={busy} onClick={handleRestore}>
                Манхуа сэргээх
              </button>
              <button
                style={btnDanger}
                disabled={busy}
                onClick={handlePermanentDelete}
              >
                Бүрмөсөн устгах
              </button>
            </div>
          </div>
        </div>

        {/* Chapters list */}
        <div>
          <h3
            className="font-semibold text-[13px] mb-2"
            style={{ color: "var(--arc-text)" }}
          >
            Chapter-ууд
          </h3>
          {!data.chapters || data.chapters.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
              Chapter байхгүй.
            </p>
          ) : (
            <div className="space-y-1.5">
              {data.chapters.map((c) => {
                const isDeleted = !!c.deletedAt;
                return (
                  <div
                    key={c._id}
                    className="rounded-[8px] px-3 py-2 flex items-center gap-3"
                    style={{
                      background: "var(--arc-card)",
                      border: "1px solid var(--arc-border)",
                      opacity: isDeleted ? 1 : 0.55,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[12px] font-medium"
                        style={{ color: "var(--arc-text)" }}
                      >
                        Ch. {c.chapterNumber}
                        {c.title ? ` — ${c.title}` : ""}{" "}
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--arc-muted)" }}
                        >
                          ({c.status})
                        </span>
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--arc-muted)" }}
                      >
                        {isDeleted
                          ? `Сагсанд: ${fmtDate(c.deletedAt)}`
                          : "Идэвхтэй"}
                      </div>
                    </div>
                    {isDeleted && (
                      <div className="flex gap-2">
                        <button
                          style={btnRestore}
                          disabled={busy}
                          onClick={() => handleRestoreChapter(c._id)}
                        >
                          Сэргээх
                        </button>
                        <button
                          style={btnDanger}
                          disabled={busy}
                          onClick={() => handlePermDeleteChapter(c._id)}
                        >
                          Устгах
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
