"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  getOwnCreatorProfile,
  updateOwnCreatorProfile,
  type OwnCreatorProfile,
} from "@/lib/api";
import { LANGUAGE_LABELS, SKILL_LABELS } from "@/lib/creatorLabels";
import { creatorPublicPath } from "@/lib/site";

const DRAFT_KEY = "arc.creator-profile.draft";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 9,
  border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)",
  padding: "10px 14px",
  fontSize: 13,
  color: "var(--arc-text)",
  outline: "none",
};

type Draft = {
  penName: string;
  bio: string;
  skills: string[];
  languages: string[];
  customLanguage: string;
  portfolioUrl: string;
};

const emptyDraft: Draft = {
  penName: "",
  bio: "",
  skills: [],
  languages: [],
  customLanguage: "",
  portfolioUrl: "",
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[11px]" role="alert" style={{ color: "oklch(0.75 0.18 15)" }}>
      {message}
    </p>
  );
}

export function CreatorProfileForm({ userId }: { userId: string }) {
  const [loaded, setLoaded] = useState<OwnCreatorProfile | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getOwnCreatorProfile()
      .then((profile) => {
        if (!active) return;
        setLoaded(profile);
        let next: Draft = {
          penName: profile.penName || "",
          bio: profile.bio || "",
          skills: profile.skills || [],
          languages: (profile.languages || []).filter((code) => LANGUAGE_LABELS[code]),
          customLanguage: (profile.languages || []).filter((code) => !LANGUAGE_LABELS[code]).join(", "),
          portfolioUrl: profile.portfolioUrl || "",
        };
        try {
          const raw = sessionStorage.getItem(DRAFT_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as Partial<Draft>;
            next = { ...next, ...parsed, skills: parsed.skills || next.skills, languages: parsed.languages || next.languages };
          }
        } catch {
          /* ignore */
        }
        setDraft(next);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err?.response?.data?.message || "Профайл ачаалж чадсангүй.");
      });
    return () => {
      active = false;
    };
  }, []);

  function update(partial: Partial<Draft>) {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    setSuccess(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFields({});
    setSuccess(false);
    try {
      const res = await updateOwnCreatorProfile({
        penName: draft.penName,
        bio: draft.bio,
        skills: draft.skills,
        languages: draft.languages,
        customLanguage: draft.customLanguage || undefined,
        portfolioUrl: draft.portfolioUrl,
      });
      setLoaded(res.profile);
      setDraft({
        penName: res.profile.penName,
        bio: res.profile.bio,
        skills: res.profile.skills,
        languages: (res.profile.languages || []).filter((code) => LANGUAGE_LABELS[code]),
        customLanguage: (res.profile.languages || []).filter((code) => !LANGUAGE_LABELS[code]).join(", "),
        portfolioUrl: res.profile.portfolioUrl || "",
      });
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setSuccess(true);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; fields?: Record<string, string> } } })?.response?.data;
      setFields(data?.fields || {});
      setFormError(data?.message || "Профайл хадгалж чадсангүй.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <p className="text-[13px]" style={{ color: "oklch(0.75 0.18 15)" }}>
        {loadError}
      </p>
    );
  }
  if (!loaded) {
    return <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Профайл ачаалж байна...</p>;
  }

  const publicHref = creatorPublicPath(userId);

  return (
    <section className="rounded-[14px] p-4 sm:p-5 space-y-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-cyan)" }} />
          <h2 className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
            Нийтийн профайл
          </h2>
        </div>
        <Link
          href={publicHref}
          className="rounded-[8px] px-3 py-1.5 text-[12px] font-semibold no-underline"
          style={{ background: "var(--arc-cyan)", color: "#07070e" }}
        >
          Миний public профайл
        </Link>
      </div>
      <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>
        Нэвтрэх нэр солигдохгүй. Энэ мэдээлэл нийтэд харагдана.
      </p>
      {formError && (
        <div className="rounded-[9px] px-3 py-2 text-[12px]" role="alert" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
          {formError}
        </div>
      )}
      {success && (
        <p className="text-[12px]" role="status" style={{ color: "oklch(0.8 0.14 145)" }}>
          Хадгаллаа. Public профайл болон credit шинэчлэгдлээ.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <label className="block space-y-1">
          <span className="text-[12px]" style={{ color: "var(--arc-dim)" }}>Нийтлэгчийн нэр</span>
          <input
            value={draft.penName}
            onChange={(e) => update({ penName: e.target.value })}
            minLength={2}
            maxLength={40}
            required
            disabled={submitting}
            aria-invalid={Boolean(fields.penName)}
            aria-describedby="creator-pen-error"
            style={fieldStyle}
          />
          <FieldError id="creator-pen-error" message={fields.penName} />
        </label>
        <label className="block space-y-1">
          <span className="text-[12px]" style={{ color: "var(--arc-dim)" }}>Танилцуулга</span>
          <textarea
            value={draft.bio}
            onChange={(e) => update({ bio: e.target.value })}
            minLength={20}
            maxLength={500}
            rows={4}
            required
            disabled={submitting}
            aria-invalid={Boolean(fields.bio)}
            aria-describedby="creator-bio-error"
            style={{ ...fieldStyle, resize: "vertical" }}
          />
          <FieldError id="creator-bio-error" message={fields.bio} />
        </label>
        <fieldset className="space-y-1">
          <legend className="text-[12px]" style={{ color: "var(--arc-dim)" }}>Ур чадвар</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SKILL_LABELS).map(([id, label]) => (
              <label key={id} className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--arc-text)" }}>
                <input
                  type="checkbox"
                  checked={draft.skills.includes(id)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...draft.skills, id] : draft.skills.filter((s) => s !== id);
                    update({ skills: next });
                  }}
                  disabled={submitting}
                />
                {label}
              </label>
            ))}
          </div>
          <FieldError id="creator-skills-error" message={fields.skills} />
        </fieldset>
        <fieldset className="space-y-1">
          <legend className="text-[12px]" style={{ color: "var(--arc-dim)" }}>Ажиллах хэл</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LANGUAGE_LABELS).map(([id, label]) => (
              <label key={id} className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--arc-text)" }}>
                <input
                  type="checkbox"
                  checked={draft.languages.includes(id)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...draft.languages, id] : draft.languages.filter((s) => s !== id);
                    update({ languages: next });
                  }}
                  disabled={submitting}
                />
                {label}
              </label>
            ))}
          </div>
          <label className="block space-y-1">
            <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Бусад хэл</span>
            <input
              value={draft.customLanguage}
              onChange={(e) => update({ customLanguage: e.target.value })}
              maxLength={40}
              disabled={submitting}
              style={fieldStyle}
            />
          </label>
          <FieldError id="creator-lang-error" message={fields.languages || fields.customLanguage} />
        </fieldset>
        <label className="block space-y-1">
          <span className="text-[12px]" style={{ color: "var(--arc-dim)" }}>Portfolio (HTTPS)</span>
          <input
            type="url"
            value={draft.portfolioUrl}
            onChange={(e) => update({ portfolioUrl: e.target.value })}
            maxLength={200}
            disabled={submitting}
            placeholder="https://"
            aria-invalid={Boolean(fields.portfolioUrl)}
            style={fieldStyle}
          />
          <FieldError id="creator-url-error" message={fields.portfolioUrl} />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-[9px] px-4 py-2 text-[12px] font-semibold disabled:opacity-50"
          style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
        >
          {submitting ? "Хадгалж байна..." : "Хадгалах"}
        </button>
      </form>
    </section>
  );
}
