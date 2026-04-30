"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import { adminGetFeedback, adminUpdateFeedbackStatus, type AdminFeedback } from "@/lib/feedback";

function labelType(t: AdminFeedback["type"]) {
  return t === "complaint" ? "Complaint / Report" : "Suggestion / Request";
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  new:      { border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" },
  reviewed: { border: "1px solid oklch(0.82 0.16 85/.4)",  background: "oklch(0.82 0.16 85/.08)",  color: "var(--arc-amber)" },
  resolved: { border: "1px solid oklch(0.72 0.17 155/.4)", background: "oklch(0.72 0.17 155/.08)", color: "oklch(0.8 0.14 155)" },
};

export default function AdminFeedbackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<AdminFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminGetFeedback(id);
      setData(res);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Not found");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setStatus = async (status: AdminFeedback["status"]) => {
    if (!data) return;
    setBusy(true);
    try {
      const updated = await adminUpdateFeedbackStatus(data._id, status);
      setData(updated);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell title="Feedback дэлгэрэнгүй" subtitle="Нэг санал, хүсэлт харах.">
      <div className="space-y-4">
        <button
          onClick={() => router.push("/admin/feedback")}
          className="rounded-[9px] px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
        >
          ← Буцах
        </button>

        {error && (
          <div className="rounded-[10px] px-3 py-2 text-[12px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-[10px]" style={{ background: "var(--arc-elevated)" }} />
            ))}
          </div>
        ) : !data ? null : (
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Main info */}
            <div
              className="lg:col-span-3 rounded-[14px] p-5 space-y-4"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-[6px] px-2.5 py-1 text-[10px] font-semibold"
                  style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}
                >
                  {labelType(data.type)}
                </span>
                <span
                  className="rounded-[6px] px-2.5 py-1 text-[10px] font-semibold"
                  style={STATUS_STYLE[data.status] || STATUS_STYLE.new}
                >
                  {data.status}
                </span>
                <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>
                  {new Date(data.createdAt).toLocaleString()}
                </span>
              </div>

              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--arc-muted)" }}>Нэр</div>
                <div className="text-[16px] font-semibold" style={{ color: "var(--arc-text)" }}>{data.name}</div>
              </div>

              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--arc-muted)" }}>Тайлбар</div>
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: "var(--arc-dim)" }}>
                  {data.description}
                </div>
              </div>

              <div
                className="flex flex-wrap gap-2 pt-3"
                style={{ borderTop: "1px solid var(--arc-border)" }}
              >
                {(["new", "reviewed", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    disabled={busy}
                    onClick={() => setStatus(s)}
                    className="rounded-[8px] px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60 transition-opacity hover:opacity-80"
                    style={data.status === s ? STATUS_STYLE[s] : { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Image */}
            <div
              className="lg:col-span-2 rounded-[14px] p-5"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
            >
              <div className="mb-2 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--arc-muted)" }}>Зураг</div>
              {data.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.imageUrl}
                  alt="Feedback attachment"
                  className="w-full rounded-[10px] object-contain"
                  style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
                />
              ) : (
                <div
                  className="rounded-[10px] px-3 py-8 text-center text-[12px]"
                  style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-muted)" }}
                >
                  Зураг байхгүй
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
