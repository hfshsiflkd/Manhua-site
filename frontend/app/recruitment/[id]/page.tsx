"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { applyToRecruitment, getRecruitmentListing, type PublicRecruitmentListing } from "@/lib/api";
import { SKILL_LABELS, LANGUAGE_LABELS } from "@/lib/creatorLabels";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/app/components/ToastProvider";

const COMP: Record<string, string> = {
  volunteer: "Сайн дурын",
  paid: "Төлбөртэй",
  negotiable: "Тохиролцоно",
};

export default function RecruitmentDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const { user } = useAuth();
  const toast = useToast();
  const [listing, setListing] = useState<PublicRecruitmentListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intro, setIntro] = useState("");
  const [experience, setExperience] = useState<"beginner" | "experienced" | "">("");
  const [weeklyHoursNote, setWeeklyHoursNote] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [acceptJoin, setAcceptJoin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getRecruitmentListing(id)
      .then(setListing)
      .catch((e) => setError(e?.response?.data?.message || "Зар олдсонгүй"));
  }, [id]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Хүсэлт илгээхийн тулд нэвтэрнэ үү.");
      return;
    }
    try {
      setSubmitting(true);
      await applyToRecruitment(id, {
        intro,
        experience: experience || "beginner",
        weeklyHoursNote,
        portfolioUrl: portfolioUrl || undefined,
        acceptJoin,
      });
      toast.success("Хүсэлт илгээлээ");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      toast.error(ax?.response?.data?.message || "Илгээж чадсангүй");
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return <div className="mx-auto max-w-xl px-4 py-16 text-center text-[14px]" style={{ color: "var(--arc-muted)" }}>{error}</div>;
  }
  if (!listing) {
    return <div className="mx-auto max-w-xl px-4 py-16 text-center text-[13px]" style={{ color: "var(--arc-muted)" }}>Ачааллаж байна...</div>;
  }

  const closed = listing.closed || !listing.accepting;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 space-y-6">
      <Link href="/recruitment" className="text-[12px] no-underline" style={{ color: "var(--arc-muted)" }}>← Багт нэгдэх</Link>
      <section className="rounded-[14px] p-5 space-y-3" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <h1 className="text-[24px] font-bold" style={{ color: "var(--arc-text)" }}>{listing.title}</h1>
        <p className="text-[13px]" style={{ color: "var(--arc-dim)" }}>{listing.team.name}{listing.manhua ? ` · ${listing.manhua.title}` : ""}</p>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full px-2 py-1" style={{ background: "var(--arc-elevated)" }}>{SKILL_LABELS[listing.workRole] || listing.workRole}</span>
          <span className="rounded-full px-2 py-1" style={{ background: "var(--arc-elevated)" }}>{COMP[listing.compensation]}</span>
        </div>
        {closed && (
          <p className="rounded-[9px] px-3 py-2 text-[13px]" style={{ background: "oklch(0.82 0.16 85/.1)", color: "var(--arc-amber)" }}>
            Хүсэлт авах хугацаа дууссан
          </p>
        )}
        <p className="text-[13px] whitespace-pre-wrap" style={{ color: "var(--arc-text)" }}>{listing.description}</p>
        {listing.weeklyHoursNote ? <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Цаг: {listing.weeklyHoursNote}</p> : null}
        {listing.languages?.length ? (
          <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Хэл: {listing.languages.map((c) => LANGUAGE_LABELS[c] || c).join(", ")}</p>
        ) : null}
        {listing.compensationNote ? <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Нөхцөл: {listing.compensationNote}</p> : null}
        <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{listing.compensationDisclaimer}</p>
      </section>

      {!closed && (
        <section className="rounded-[14px] p-5 space-y-3" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--arc-text)" }}>Хүсэлт илгээх</h2>
          {!user && (
            <p className="text-[12px]" style={{ color: "var(--arc-cyan)" }}>
              Хүсэлт илгээхийн тулд <Link href="/login">нэвтэрнэ үү</Link>.
            </p>
          )}
          <form onSubmit={onSubmit} className="space-y-3">
            <textarea required minLength={20} maxLength={1000} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Яагаад нэгдэх хүсэлтэй вэ (20–1000)" className="w-full rounded-[9px] px-3 py-2 text-[13px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }} />
            <select required value={experience} onChange={(e) => setExperience(e.target.value as typeof experience)} className="w-full rounded-[9px] px-3 py-2 text-[13px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}>
              <option value="">Туршлага</option>
              <option value="beginner">Анхлан</option>
              <option value="experienced">Туршлагатай</option>
            </select>
            <input required maxLength={80} value={weeklyHoursNote} onChange={(e) => setWeeklyHoursNote(e.target.value)} placeholder="Долоо хоногт боломжтой цаг" className="w-full rounded-[9px] px-3 py-2 text-[13px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }} />
            <input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="Portfolio HTTPS холбоос (сонголт)" className="w-full rounded-[9px] px-3 py-2 text-[13px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }} />
            <label className="flex items-start gap-2 text-[12px]" style={{ color: "var(--arc-dim)" }}>
              <input type="checkbox" checked={acceptJoin} onChange={(e) => setAcceptJoin(e.target.checked)} />
              Зөвшөөрөгдвөл та энэ багт гишүүнээр нэмэгдэнэ.
            </label>
            <button type="submit" disabled={!user || submitting} className="rounded-[9px] px-4 py-2 text-[12px] font-semibold disabled:opacity-60" style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
              {submitting ? "Илгээж байна..." : "Хүсэлт илгээх"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
