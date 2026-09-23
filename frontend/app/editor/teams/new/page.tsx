"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { editorCreateTeam } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/app/components/ToastProvider";

const DRAFT_KEY = "arc.create-team.draft";
const NAME_MIN = 2;
const NAME_MAX = 60;
const BIO_MIN = 20;
const BIO_MAX = 1000;

type Draft = { name: string; description: string; acceptTerms: boolean };

const fieldStyle: React.CSSProperties = {
  border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)",
  color: "var(--arc-text)",
  borderRadius: 9,
  padding: "10px 16px",
  fontSize: 13,
  outline: "none",
  width: "100%",
};

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return { name: "", description: "", acceptTerms: false };
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      name: String(parsed.name || ""),
      description: String(parsed.description || ""),
      acceptTerms: Boolean(parsed.acceptTerms),
    };
  } catch {
    return { name: "", description: "", acceptTerms: false };
  }
}

export default function EditorNewTeamPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(() => (typeof window === "undefined" ? { name: "", description: "", acceptTerms: false } : loadDraft()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const idempotencyKey = useMemo(
    () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `team-${Date.now()}`),
    []
  );

  const canCreate =
    user?.role === "admin" ||
    (user?.role === "editor" && user?.canCreateTeam !== false);

  const update = (patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    const name = draft.name.trim();
    const description = draft.description.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) next.name = `Нэр ${NAME_MIN}–${NAME_MAX} тэмдэгт.`;
    if (description.length < BIO_MIN || description.length > BIO_MAX) next.description = `Танилцуулга ${BIO_MIN}–${BIO_MAX} тэмдэгт.`;
    if (!draft.acceptTerms) next.acceptTerms = "Нийтлэх дүрмийг зөвшөөрнө үү.";
    return next;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextFields = validate();
    setFields(nextFields);
    if (Object.keys(nextFields).length) {
      setError("Мэдээллээ шалгана уу.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const team = await editorCreateTeam({
        name: draft.name.trim(),
        description: draft.description.trim(),
        acceptTerms: true,
        idempotencyKey,
      });
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      toast.success("Баг үүслээ");
      router.push(`/editor/teams/${team._id}?created=1`);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; fields?: Record<string, string> } } };
      setFields(ax?.response?.data?.fields || {});
      setError(ax?.response?.data?.message || "Баг үүсгэх үед алдаа гарлаа");
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role === "user") {
    return (
      <div className="space-y-3 max-w-xl">
        <h1 className="text-xl font-bold" style={{ color: "var(--arc-text)" }}>Баг үүсгэх</h1>
        <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Энгийн хэрэглэгч баг үүсгэхгүй. Эхлээд editor болоорой.</p>
        <Link href="/profile/become-editor" className="inline-flex rounded-[9px] px-4 py-2 text-[12px] font-semibold no-underline" style={{ background: "var(--arc-cyan)", color: "#07070e" }}>
          Profile → Editor болох
        </Link>
      </div>
    );
  }

  if (user && !canCreate) {
    return (
      <div className="space-y-3 max-w-xl">
        <h1 className="text-xl font-bold" style={{ color: "var(--arc-text)" }}>Баг үүсгэх</h1>
        <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Шинэ баг үүсгэх эрхгүй эсвэл түр хаагдсан.</p>
        <Link href="/editor/teams" className="text-[12px]" style={{ color: "var(--arc-cyan)" }}>Багууд руу буцах</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6 max-w-xl">
      <div>
        <Link href="/editor/teams" className="text-[12px]" style={{ color: "var(--arc-muted)" }}>← Багууд</Link>
        <h1 className="text-xl sm:text-2xl font-bold mt-2 mb-1" style={{ color: "var(--arc-text)" }}>Баг үүсгэх</h1>
        <p className="text-xs sm:text-sm" style={{ color: "var(--arc-muted)" }}>Та багийн эзэн (owner) болно. Энэ нь сайт admin биш.</p>
      </div>

      {error && (
        <div className="rounded-[9px] px-4 py-3 text-sm" role="alert" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Багийн нэр <span style={{ color: "oklch(0.75 0.2 15)" }}>*</span></span>
          <input
            type="text"
            name="name"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            minLength={NAME_MIN}
            maxLength={NAME_MAX}
            required
            disabled={submitting}
            aria-invalid={Boolean(fields.name)}
            style={fieldStyle}
          />
          <span className="block text-[11px]" style={{ color: fields.name ? "oklch(0.85 0.12 15)" : "var(--arc-muted)" }}>
            {fields.name || `${draft.name.trim().length}/${NAME_MAX}`}
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium" style={{ color: "var(--arc-dim)" }}>Танилцуулга <span style={{ color: "oklch(0.75 0.2 15)" }}>*</span></span>
          <textarea
            name="description"
            value={draft.description}
            onChange={(e) => update({ description: e.target.value })}
            minLength={BIO_MIN}
            maxLength={BIO_MAX}
            required
            rows={5}
            disabled={submitting}
            aria-invalid={Boolean(fields.description)}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
          <span className="block text-[11px]" style={{ color: fields.description ? "oklch(0.85 0.12 15)" : "var(--arc-muted)" }}>
            {fields.description || `${draft.description.trim().length}/${BIO_MAX}`}
          </span>
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
          {fields.acceptTerms && <p className="text-[12px]" style={{ color: "oklch(0.85 0.12 15)" }}>{fields.acceptTerms}</p>}
        </fieldset>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-[9px] px-5 py-3 text-sm font-semibold disabled:opacity-60"
            style={{ background: "oklch(0.75 0.17 145)", color: "#07070e", border: "none" }}
          >
            {submitting ? "Үүсгэж байна..." : "Баг үүсгэх"}
          </button>
          <Link href="/editor/teams" className="rounded-[9px] px-5 py-3 text-sm text-center no-underline" style={{ border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }}>
            Болих
          </Link>
        </div>
      </form>
    </div>
  );
}
