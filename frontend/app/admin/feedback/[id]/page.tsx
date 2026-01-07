"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import { adminGetFeedback, adminUpdateFeedbackStatus, type AdminFeedback } from "@/lib/feedback";

function labelType(t: AdminFeedback["type"]) {
  return t === "complaint" ? "Complaint / Report" : "Suggestion / Request";
}

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
    <AdminShell title="Feedback detail" subtitle="View one submission.">
      <div className="space-y-4">
        <button
          onClick={() => router.push("/admin/feedback")}
          className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          ← Back
        </button>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : !data ? null : (
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-700 bg-slate-950/50 px-2 py-1 text-[11px] text-slate-200">
                  {labelType(data.type)}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-950/50 px-2 py-1 text-[11px] text-slate-200">
                  status: <b>{data.status}</b>
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(data.createdAt).toLocaleString()}
                </span>
              </div>

              <div>
                <div className="text-xs text-slate-400">Name</div>
                <div className="text-lg font-semibold text-slate-100">{data.name}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Description</div>
                <div className="whitespace-pre-wrap text-sm text-slate-200">
                  {data.description}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {(["new", "reviewed", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    disabled={busy}
                    onClick={() => setStatus(s)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
                      data.status === s
                        ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200"
                        : "border-slate-700 bg-slate-950/40 text-slate-200 hover:bg-slate-950/70"
                    }`}
                  >
                    Mark {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs text-slate-400">Image</div>
              {data.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.imageUrl}
                  alt="Feedback attachment"
                  className="mt-2 w-full rounded-xl border border-slate-800 object-contain bg-slate-950/40"
                />
              ) : (
                <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-6 text-center text-sm text-slate-500">
                  No image uploaded.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

