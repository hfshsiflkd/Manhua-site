"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  decideRecruitmentApplication,
  getManagedRecruitment,
  listRecruitmentApplications,
  updateRecruitmentListing,
  type PublicRecruitmentListing,
  type RecruitmentApplication,
} from "@/lib/api";
import { useToast } from "@/app/components/ToastProvider";

export default function ManageRecruitmentApplicationsPage() {
  const params = useParams();
  const teamId = String(params?.teamId || "");
  const listingId = String(params?.listingId || "");
  const toast = useToast();
  const [listing, setListing] = useState<PublicRecruitmentListing | null>(null);
  const [items, setItems] = useState<RecruitmentApplication[]>([]);
  const [status, setStatus] = useState("pending");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const reload = () => {
    getManagedRecruitment(listingId).then(setListing).catch(() => setListing(null));
    listRecruitmentApplications(listingId, status).then((data) => setItems(data.items || [])).catch(() => setItems([]));
  };

  useEffect(() => {
    if (!listingId) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, status]);

  const decide = async (id: string, action: "accept" | "reject") => {
    try {
      setWorking(id);
      await decideRecruitmentApplication(id, { action, decisionNote: action === "reject" ? note : undefined });
      toast.success(action === "accept" ? "Зөвшөөрлөө" : "Татгалзлаа");
      reload();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      toast.error(ax?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-4">
      <Link href={`/editor/teams/${teamId}/recruitment`} className="text-[12px] no-underline" style={{ color: "var(--arc-muted)" }}>← Зарууд</Link>
      <h1 className="text-xl font-bold" style={{ color: "var(--arc-text)" }}>{listing?.title || "Хүсэлтүүд"}</h1>
      {listing && !listing.hidden && (
        <div className="flex gap-2">
          <button type="button" onClick={() => updateRecruitmentListing(listingId, { status: "closed" }).then(reload)} className="rounded-[8px] px-3 py-1.5 text-[12px]" style={{ border: "1px solid var(--arc-border)", color: "var(--arc-text)" }}>Хаах</button>
          <button type="button" onClick={() => updateRecruitmentListing(listingId, { status: "open" }).then(reload)} className="rounded-[8px] px-3 py-1.5 text-[12px]" style={{ border: "1px solid var(--arc-border)", color: "var(--arc-text)" }}>Дахин нээх</button>
        </div>
      )}
      {listing?.hidden && <p className="text-[12px]" style={{ color: "var(--arc-amber)" }}>Модерациар нуусан. Өөрөө сэргээх боломжгүй.</p>}
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-[9px] px-3 py-2 text-[13px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}>
        <option value="pending">pending</option>
        <option value="accepted">accepted</option>
        <option value="rejected">rejected</option>
        <option value="withdrawn">withdrawn</option>
      </select>
      {items.map((app) => (
        <article key={app.id} className="rounded-[12px] p-4 space-y-2" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <div className="flex justify-between gap-2">
            <div>
              <div className="font-semibold" style={{ color: "var(--arc-text)" }}>{app.applicant?.displayName || "Хэрэглэгч"}</div>
              {app.applicant?.publicPath ? <Link href={app.applicant.publicPath} className="text-[12px]" style={{ color: "var(--arc-cyan)" }}>Public профайл</Link> : null}
            </div>
            <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{app.status}</span>
          </div>
          <p className="text-[13px] whitespace-pre-wrap" style={{ color: "var(--arc-dim)" }}>{app.intro}</p>
          <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>{app.experience} · {app.weeklyHoursNote}</p>
          {app.status === "pending" && (
            <div className="flex flex-wrap gap-2 items-center">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Татгалзсан тайлбар" className="rounded-[8px] px-3 py-1.5 text-[12px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }} />
              <button type="button" disabled={working === app.id} onClick={() => decide(app.id, "accept")} className="rounded-[8px] px-3 py-1.5 text-[12px] font-semibold" style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>Зөвшөөрөх</button>
              <button type="button" disabled={working === app.id} onClick={() => decide(app.id, "reject")} className="rounded-[8px] px-3 py-1.5 text-[12px]" style={{ border: "1px solid var(--arc-border)", color: "var(--arc-text)" }}>Татгалзах</button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
