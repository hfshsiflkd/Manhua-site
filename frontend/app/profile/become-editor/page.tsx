"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  becomeEditor,
  getEditorOnboarding,
  type EditorOnboardingMeta,
} from "@/lib/api";

const DRAFT_KEY = "arc.become-editor.draft";

type Draft = {
  penName: string;
  bio: string;
  skills: string[];
  experience: string;
  languages: string[];
  customLanguage: string;
  portfolioUrl: string;
  acceptTerms: boolean;
};

const emptyDraft: Draft = {
  penName: "",
  bio: "",
  skills: [],
  experience: "",
  languages: [],
  customLanguage: "",
  portfolioUrl: "",
  acceptTerms: false,
};

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return { ...emptyDraft, ...parsed, skills: parsed.skills || [], languages: parsed.languages || [] };
  } catch {
    return emptyDraft;
  }
}

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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[11px]" role="alert" style={{ color: "oklch(0.75 0.18 15)" }}>
      {message}
    </p>
  );
}

export default function BecomeEditorPage() {
  const router = useRouter();
  const { user, applySession } = useAuth();
  const [meta, setMeta] = useState<EditorOnboardingMeta | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  useEffect(() => {
    getEditorOnboarding()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, [user?.role]);

  const role = String(user?.role || meta?.role || "user").toLowerCase();
  const alreadyStaff = role === "admin" || role === "translator";
  const alreadyEditor = role === "editor";

  const update = (patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...patch }));

  const toggleSkill = (id: string) => {
    update({
      skills: draft.skills.includes(id)
        ? draft.skills.filter((s) => s !== id)
        : [...draft.skills, id],
    });
  };

  const toggleLanguage = (id: string) => {
    update({
      languages: draft.languages.includes(id)
        ? draft.languages.filter((s) => s !== id)
        : [...draft.languages, id],
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setStatus("saving");
    setFormError(null);
    setFields({});
    try {
      const result = await becomeEditor({
        penName: draft.penName,
        bio: draft.bio,
        skills: draft.skills,
        experience: draft.experience,
        languages: draft.languages,
        customLanguage: draft.customLanguage || undefined,
        portfolioUrl: draft.portfolioUrl || undefined,
        acceptTerms: draft.acceptTerms,
      });
      if (result.token) {
        await applySession(result.token, result.user);
      }
      sessionStorage.removeItem(DRAFT_KEY);
      setStatus("success");
    } catch (err: any) {
      const data = err?.response?.data;
      setStatus("error");
      setFormError(data?.message || "Editor болоход алдаа гарлаа.");
      setFields(data?.fields || {});
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = useMemo(() => {
    if (status === "saving") return "Editor болж байна";
    if (status === "success") return "Амжилттай";
    if (status === "error") return "Алдаа";
    return "";
  }, [status]);

  if (!user) {
    return (
      <div className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 560 }}>
        <p className="text-[13px] mb-3" style={{ color: "var(--arc-dim)" }}>Энэ хуудсыг харахын өмнө нэвтэрнэ үү.</p>
        <Link href="/login" className="rounded-[9px] px-4 py-2 text-[13px] font-semibold no-underline" style={{ background: "var(--arc-cyan)", color: "#07070e" }}>
          Нэвтрэх
        </Link>
      </div>
    );
  }

  if (alreadyStaff) {
    return (
      <div className="mx-auto px-4 py-10 space-y-4" style={{ maxWidth: 640 }}>
        <h1 className="text-xl font-bold" style={{ color: "var(--arc-text)" }}>Удирдлагын эрх</h1>
        <p className="text-[13px]" style={{ color: "var(--arc-dim)" }}>
          Энэ бүртгэл аль хэдийн удирдлагын эрхтэй тул editor onboarding хэрэггүй.
        </p>
        <div className="flex flex-wrap gap-2">
          {role === "admin" && (
            <Link href="/admin" className="rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline" style={{ background: "var(--arc-amber)", color: "#07070e" }}>
              Admin удирдлага
            </Link>
          )}
          <Link href="/editor/manhuas" className="rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline" style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
            Editor удирдлага
          </Link>
        </div>
      </div>
    );
  }

  if (alreadyEditor && status !== "success") {
    return (
      <div className="mx-auto px-4 py-10 space-y-4" style={{ maxWidth: 640 }}>
        <h1 className="text-xl font-bold" style={{ color: "var(--arc-text)" }}>Та editor байна</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/editor/manhuas" className="rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline" style={{ background: "var(--arc-cyan)", color: "#07070e" }}>
            Editor удирдлага
          </Link>
          <Link href="/editor/manhuas/new" className="rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline" style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
            Манхва нэмэх
          </Link>
        </div>
      </div>
    );
  }

  if (meta && meta.signupEnabled === false) {
    return (
      <div className="mx-auto px-4 py-10 space-y-4" style={{ maxWidth: 640 }}>
        <h1 className="text-xl font-bold" style={{ color: "var(--arc-text)" }}>Одоогоор шинээр editor болох боломжгүй</h1>
        <p className="text-[13px]" style={{ color: "var(--arc-dim)" }}>
          Энэ бүртгэл user эрхтэй хэвээр байна. Аль хэдийн editor болсон хэрэглэгчид өөрийн манхвагаа үргэлжлүүлэн нийтэлнэ.
        </p>
        <Link href="/profile" className="inline-flex rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline" style={{ background: "var(--arc-cyan)", color: "#07070e" }}>
          Профайл руу буцах
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="mx-auto px-4 py-10 space-y-5" style={{ maxWidth: 640 }}>
        <p className="sr-only" aria-live="polite">Амжилттай</p>
        <h1 className="text-xl font-bold" style={{ color: "var(--arc-text)" }}>Та editor боллоо. Анхны манхвагаа нэмээрэй.</h1>
        <ul className="rounded-[14px] p-4 space-y-2 text-[13px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-dim)" }}>
          <li>Манхвагийн нэр, тайлбар, хавтас оруулах.</li>
          <li>Эхний бүлгийн зургуудыг оруулах.</li>
          <li>Preview шалгаад нийтлэх.</li>
        </ul>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/editor/manhuas/new" className="rounded-[9px] px-4 py-3 text-center text-[13px] font-semibold no-underline" style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
            Манхва нэмэх
          </Link>
          <Link href="/editor/manhuas" className="rounded-[9px] px-4 py-3 text-center text-[13px] font-semibold no-underline" style={{ border: "1px solid var(--arc-border)", color: "var(--arc-text)" }}>
            Editor удирдлага
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 py-8 pb-24" style={{ maxWidth: 640 }}>
      <button
        type="button"
        onClick={() => router.push("/profile")}
        className="mb-4 text-[12px]"
        style={{ background: "none", border: "none", color: "var(--arc-muted)", cursor: "pointer" }}
      >
        ← Профайл
      </button>
      <h1 className="text-xl font-bold mb-1" style={{ color: "var(--arc-text)" }}>Editor болох</h1>
      <p className="text-[13px] mb-5" style={{ color: "var(--arc-dim)" }}>
        Өөрийн орчуулсан манхвагаа нийтэлж, уншигчдад хүргээрэй.
      </p>

      <div aria-live="polite" className="sr-only">{statusLabel}</div>
      {formError && (
        <div className="mb-4 rounded-[9px] px-4 py-3 text-[13px]" role="alert" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block space-y-1">
          <span className="text-[12px] font-medium" style={{ color: "var(--arc-dim)" }}>Нийтлэгчийн нэр / pen name</span>
          <input
            id="penName"
            name="penName"
            value={draft.penName}
            onChange={(e) => update({ penName: e.target.value })}
            minLength={2}
            maxLength={40}
            required
            disabled={submitting}
            aria-invalid={Boolean(fields.penName)}
            aria-describedby="penName-help penName-error"
            style={fieldStyle}
          />
          <span id="penName-help" className="block text-[11px]" style={{ color: "var(--arc-muted)" }}>
            Нэвтрэх нэр солигдохгүй. Энэ нэр нийтийн бүтээл дээр харагдана.
          </span>
          <FieldError id="penName-error" message={fields.penName} />
        </label>

        <label className="block space-y-1">
          <span className="text-[12px] font-medium" style={{ color: "var(--arc-dim)" }}>Танилцуулга</span>
          <textarea
            id="bio"
            name="bio"
            value={draft.bio}
            onChange={(e) => update({ bio: e.target.value })}
            minLength={20}
            maxLength={500}
            rows={5}
            required
            disabled={submitting}
            aria-invalid={Boolean(fields.bio)}
            aria-describedby="bio-help bio-error"
            style={{ ...fieldStyle, resize: "vertical" }}
          />
          <span id="bio-help" className="block text-[11px]" style={{ color: "var(--arc-muted)" }}>
            20–500 тэмдэгт. Editor профайл дээр нийтэд харагдана.
          </span>
          <FieldError id="bio-error" message={fields.bio} />
        </label>

        <fieldset className="space-y-2" disabled={submitting}>
          <legend className="text-[12px] font-medium" style={{ color: "var(--arc-dim)" }}>Хийж чаддаг ажил</legend>
          <div className="flex flex-wrap gap-2">
            {(meta?.skills || [
              { id: "translation", label: "Орчуулга" },
              { id: "cleanup", label: "Зураг цэвэрлэх" },
              { id: "typesetting", label: "Текст өрөх" },
              { id: "proofreading", label: "Хянах" },
            ]).map((skill) => {
              const active = draft.skills.includes(skill.id);
              return (
                <label
                  key={skill.id}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] cursor-pointer"
                  style={
                    active
                      ? { border: "1px solid oklch(0.72 0.17 195/.6)", background: "oklch(0.72 0.17 195/.15)", color: "var(--arc-cyan)" }
                      : { border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }
                  }
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={active}
                    onChange={() => toggleSkill(skill.id)}
                  />
                  {skill.label}
                </label>
              );
            })}
          </div>
          <FieldError id="skills-error" message={fields.skills} />
        </fieldset>

        <fieldset className="space-y-2" disabled={submitting}>
          <legend className="text-[12px] font-medium" style={{ color: "var(--arc-dim)" }}>Туршлага</legend>
          {(meta?.experience || [
            { id: "beginner", label: "Анхлан" },
            { id: "previous", label: "Өмнө ажиллаж байсан" },
            { id: "regular", label: "Тогтмол хийдэг" },
          ]).map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--arc-text)" }}>
              <input
                type="radio"
                name="experience"
                value={item.id}
                checked={draft.experience === item.id}
                onChange={() => update({ experience: item.id })}
                required
              />
              {item.label}
            </label>
          ))}
          <FieldError id="experience-error" message={fields.experience} />
        </fieldset>

        <fieldset className="space-y-2" disabled={submitting}>
          <legend className="text-[12px] font-medium" style={{ color: "var(--arc-dim)" }}>Ажиллах хэл</legend>
          <div className="flex flex-wrap gap-2">
            {(meta?.languages || [
              { id: "mn", label: "Монгол" },
              { id: "en", label: "Англи" },
              { id: "zh", label: "Хятад" },
              { id: "ja", label: "Япон" },
              { id: "ko", label: "Солонгос" },
              { id: "ru", label: "Орос" },
            ]).map((lang) => {
              const active = draft.languages.includes(lang.id);
              return (
                <label
                  key={lang.id}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] cursor-pointer"
                  style={
                    active
                      ? { border: "1px solid oklch(0.72 0.17 195/.6)", background: "oklch(0.72 0.17 195/.15)", color: "var(--arc-cyan)" }
                      : { border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }
                  }
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={active}
                    onChange={() => toggleLanguage(lang.id)}
                  />
                  {lang.label}
                </label>
              );
            })}
          </div>
          <label className="block space-y-1">
            <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Өөр хэл нэмэх (сонголттой)</span>
            <input
              value={draft.customLanguage}
              onChange={(e) => update({ customLanguage: e.target.value })}
              maxLength={40}
              aria-invalid={Boolean(fields.customLanguage)}
              style={fieldStyle}
              placeholder="Жишээ: español"
            />
          </label>
          <FieldError id="languages-error" message={fields.languages || fields.customLanguage} />
        </fieldset>

        <label className="block space-y-1">
          <span className="text-[12px] font-medium" style={{ color: "var(--arc-dim)" }}>Бүтээл / portfolio холбоос (сонголттой)</span>
          <input
            type="url"
            inputMode="url"
            value={draft.portfolioUrl}
            onChange={(e) => update({ portfolioUrl: e.target.value })}
            maxLength={200}
            disabled={submitting}
            aria-invalid={Boolean(fields.portfolioUrl)}
            aria-describedby="portfolio-help portfolio-error"
            placeholder="https://"
            style={fieldStyle}
          />
          <span id="portfolio-help" className="block text-[11px]" style={{ color: "var(--arc-muted)" }}>
            Зөвхөн HTTPS. Нийтийн editor профайл дээр харагдана.
          </span>
          <FieldError id="portfolio-error" message={fields.portfolioUrl} />
        </label>

        <fieldset className="rounded-[14px] p-4 space-y-2" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <legend className="text-[12px] font-medium px-1" style={{ color: "var(--arc-dim)" }}>Нийтлэх дүрэм</legend>
          <ul className="text-[12px] space-y-1" style={{ color: "var(--arc-dim)" }}>
            <li>Бусдын бүтээлийг өөрийн нэрээр тавихгүй.</li>
            <li>Нийтлэх эрх, зөвшөөрлөө өөрөө хариуцна.</li>
            <li>Spam болон хориотой контент оруулахгүй.</li>
          </ul>
          <label className="flex items-start gap-2 text-[13px]" style={{ color: "var(--arc-text)" }}>
            <input
              type="checkbox"
              checked={draft.acceptTerms}
              onChange={(e) => update({ acceptTerms: e.target.checked })}
              required
              disabled={submitting}
              aria-invalid={Boolean(fields.acceptTerms)}
            />
            <span>Би нийтлэх дүрмийг уншиж, зөвшөөрч байна.</span>
          </label>
          <FieldError id="terms-error" message={fields.acceptTerms} />
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-[9px] px-4 py-3 text-[13px] font-semibold disabled:opacity-60"
          style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
        >
          {submitting ? "Editor болж байна..." : "Editor болоод эхлэх"}
        </button>
      </form>
    </div>
  );
}
