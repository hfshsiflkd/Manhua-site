"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicCreatorProfile } from "@/lib/api";
import { copyTextToClipboard } from "@/lib/copyLink";
import { languageLabel, skillLabel } from "@/lib/creatorLabels";
import { creatorPublicUrl } from "@/lib/site";
import { ManhuaCard } from "@/app/manhuas/components/ManhuaCard";
import type { Manhua } from "@/types/manhua";

function CopyLinkButton({ url }: { url: string }) {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");

  async function copy() {
    const ok = await copyTextToClipboard(url);
    if (!ok) {
      setState("err");
      return;
    }
    setState("ok");
    setTimeout(() => setState((prev) => (prev === "ok" ? "idle" : prev)), 2000);
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col items-stretch gap-1.5 sm:items-end">
      <button
        type="button"
        onClick={copy}
        aria-label="Public профайлын холбоос хуулах"
        className="rounded-[9px] px-3 py-2 text-[12px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          border: "1px solid var(--arc-border)",
          background: "var(--arc-elevated)",
          color: state === "ok" ? "oklch(0.8 0.14 145)" : "var(--arc-text)",
          cursor: "pointer",
          outlineColor: "var(--arc-cyan)",
        }}
      >
        {state === "ok" ? "Хууллаа" : state === "err" ? "Хуулж чадсангүй" : "Холбоос хуулах"}
      </button>
      {state === "err" ? (
        <label className="w-full min-w-0 max-w-[min(100%,320px)] space-y-1">
          <span className="block text-[11px]" style={{ color: "var(--arc-muted)" }}>
            Холбоосыг сонгож хуулна уу.
          </span>
          <input
            readOnly
            value={url}
            aria-label="Public профайлын холбоос"
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            className="w-full rounded-[8px] px-2.5 py-1.5 text-[11px]"
            style={{
              border: "1px solid var(--arc-border)",
              background: "var(--arc-elevated)",
              color: "var(--arc-text)",
              outlineColor: "var(--arc-cyan)",
            }}
          />
        </label>
      ) : null}
    </div>
  );
}

function asManhuaCard(item: PublicCreatorProfile["manhuas"][number]): Manhua {
  return {
    _id: item._id,
    title: item.title,
    titleEn: item.titleEn || undefined,
    slug: item.slug,
    coverImage: item.coverImage || undefined,
    status: (item.status as Manhua["status"]) || "ongoing",
    views: item.views || 0,
    ratingAverage: item.ratingAverage || 0,
    updatedAt: item.updatedAt || new Date().toISOString(),
    chapters: [],
    lastChapter: null,
    latestChapterAt: null,
  };
}

export function CreatorProfileClient({
  profile,
}: {
  profile: PublicCreatorProfile;
}) {
  const shareUrl = creatorPublicUrl(profile.id);
  const initial = (profile.displayName || "?").charAt(0).toUpperCase();
  const totalPages = Math.max(1, Math.ceil(profile.publishedCount / (profile.limit || 12)));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 pb-16 space-y-6">
      <section
        className="rounded-[14px] p-4 sm:p-6"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
          <div
            className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center overflow-hidden rounded-[18px] text-2xl font-bold"
            aria-label={profile.displayName}
            style={{
              background: "linear-gradient(135deg,oklch(0.72 0.17 195),oklch(0.65 0.22 15))",
              color: "#fff",
            }}
          >
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt={profile.displayName} className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden>{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1
                className="text-[22px] sm:text-[26px] font-bold leading-tight"
                style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}
              >
                {profile.displayName}
              </h1>
              <CopyLinkButton url={shareUrl} />
            </div>
            {profile.bio ? (
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--arc-dim)" }}>
                {profile.bio}
              </p>
            ) : null}
            <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
              Нийтэлсэн манхва: <b style={{ color: "var(--arc-text)" }}>{profile.publishedCount}</b>
            </p>
            {profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Ур чадвар">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full px-2.5 py-1 text-[11px]"
                    style={{ border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }}
                  >
                    {skillLabel(skill)}
                  </span>
                ))}
              </div>
            )}
            {profile.languages.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Ажиллах хэл">
                {profile.languages.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-full px-2.5 py-1 text-[11px]"
                    style={{ background: "var(--arc-elevated)", color: "var(--arc-text)" }}
                  >
                    {languageLabel(lang)}
                  </span>
                ))}
              </div>
            )}
            {profile.portfolioUrl ? (
              <a
                href={profile.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex text-[12px] font-medium"
                style={{ color: "var(--arc-cyan)" }}
              >
                Портфолио
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold" style={{ color: "var(--arc-text)" }}>
          Нийтэлсэн манхва
        </h2>
        {profile.manhuas.length === 0 ? (
          <p
            className="rounded-[12px] px-4 py-8 text-center text-[13px]"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-muted)" }}
          >
            Одоогоор нийтэлсэн манхва байхгүй.
          </p>
        ) : (
          <>
            <div className="hidden sm:grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              {profile.manhuas.map((item) => (
                <ManhuaCard key={item._id} manhua={asManhuaCard(item)} />
              ))}
            </div>
            <div className="sm:hidden space-y-3">
              {profile.manhuas.map((item) => (
                <ManhuaCard key={item._id} manhua={asManhuaCard(item)} variant="horizontal" />
              ))}
            </div>
          </>
        )}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-3 pt-2" aria-label="Хуудас">
            {profile.page > 1 ? (
              <Link
                href={`/creators/${profile.id}?page=${profile.page - 1}`}
                className="rounded-[8px] px-3 py-1.5 text-[12px]"
                style={{ border: "1px solid var(--arc-border)", color: "var(--arc-text)" }}
              >
                Өмнөх
              </Link>
            ) : (
              <span className="rounded-[8px] px-3 py-1.5 text-[12px]" style={{ color: "var(--arc-muted)" }}>
                Өмнөх
              </span>
            )}
            <span className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
              {profile.page} / {totalPages}
            </span>
            {profile.page < totalPages ? (
              <Link
                href={`/creators/${profile.id}?page=${profile.page + 1}`}
                className="rounded-[8px] px-3 py-1.5 text-[12px]"
                style={{ border: "1px solid var(--arc-border)", color: "var(--arc-text)" }}
              >
                Дараах
              </Link>
            ) : (
              <span className="rounded-[8px] px-3 py-1.5 text-[12px]" style={{ color: "var(--arc-muted)" }}>
                Дараах
              </span>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
