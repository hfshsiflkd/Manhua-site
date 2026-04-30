"use client";

import { useState } from "react";
import { submitFeedback, type FeedbackType } from "@/lib/feedback";

const typeOptions: Array<{ value: FeedbackType; label: string; hint: string }> = [
  { value: "suggestion_request", label: "Санал / Хүсэлт", hint: "Шинэ боломж, сайжруулалт, контентын хүсэлт гэх мэт." },
  { value: "complaint", label: "Гомдол / Алдаа мэдэгдэх", hint: "Сайт дээрх асуудал, алдаа, эвдрэл, буруу ажиллаж буй хэсэг." },
];

const fieldStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)", padding: "9px 14px", fontSize: 13,
  color: "var(--arc-text)", outline: "none",
};

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>("suggestion_request");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const selected = typeOptions.find((o) => o.value === type)!;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null); setBusy(true);
    try {
      await submitFeedback({ name: name.trim(), type, description: description.trim(), image });
      setOk("Амжилттай илгээлээ. Баярлалаа!");
      setName(""); setDescription(""); setImage(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Илгээж чадсангүй. Дахин оролдоно уу.");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--arc-bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 25% 20%,oklch(0.72 0.17 195/.08),transparent 55%)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 80% 30%,oklch(0.65 0.22 15/.06),transparent 55%)" }} />
        <div className="relative mx-auto w-full max-w-4xl px-4 py-14 text-center sm:px-6">
          <div
            className="mx-auto inline-flex items-center gap-2 text-[11px] font-semibold mb-4"
            style={{ borderRadius: 99, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", padding: "4px 12px", color: "var(--arc-dim)" }}
          >
            ✉️ Санал хүсэлт
          </div>
          <h1
            className="text-[30px] sm:text-[38px] font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)", letterSpacing: "-0.025em" }}
          >
            Санал, хүсэлт, гомдол илгээх
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[13px]" style={{ color: "var(--arc-dim)" }}>
            Сайтыг сайжруулах санал, шинэ боломжийн хүсэлт, эсвэл асуудал/алдааг зурагтай нь илгээнэ үү.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <form
              onSubmit={onSubmit}
              className="rounded-[14px] p-5"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Таны нэр</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} style={fieldStyle} placeholder="Нэр" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Төрөл</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as FeedbackType)}
                    style={{ ...fieldStyle, appearance: "none" }}
                  >
                    {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{selected.hint}</div>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Дэлгэрэнгүй тайлбар</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required maxLength={5000} rows={6}
                  style={{ ...fieldStyle, resize: "vertical" }}
                  placeholder="Юу болсон, хаана, хэрхэн давтагдаж байна гэх мэт…"
                />
              </div>

              <div className="mt-4 space-y-1">
                <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Зураг хавсаргах (сонголтоор)</label>
                <input
                  type="file" accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="block w-full text-[12px] file:mr-3 file:rounded-full file:border-0 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold"
                  style={{ color: "var(--arc-dim)" }}
                />
                <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Screenshot эсвэл алдааны зургийг оруулбал хурдан шийдэхэд тус болно.</div>
              </div>

              {err && (
                <div className="mt-4 rounded-[10px] px-3 py-2 text-[12px]" style={{ background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "oklch(0.85 0.12 15)" }}>
                  {err}
                </div>
              )}
              {ok && (
                <div className="mt-4 rounded-[10px] px-3 py-2 text-[12px]" style={{ background: "oklch(0.75 0.16 145/.08)", border: "1px solid oklch(0.75 0.16 145/.35)", color: "oklch(0.8 0.14 145)" }}>
                  {ok}
                </div>
              )}

              <button
                disabled={busy}
                className="mt-4 w-full rounded-[9px] px-4 py-2.5 text-[13px] font-bold transition-all hover:brightness-110 disabled:opacity-60"
                style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
              >
                {busy ? "Илгээж байна…" : "Илгээх"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-[14px] p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <div className="text-[13px] font-semibold" style={{ color: "var(--arc-text)" }}>Тайлбар</div>
              <p className="mt-2 text-[13px]" style={{ color: "var(--arc-dim)" }}>
                Илгээсэн мэдээлэл админ хэсэгт очиж, тус бүрээр нь шалгагдана.
              </p>
              <p className="mt-2 text-[11px]" style={{ color: "var(--arc-muted)" }}>
                Зураг хавсаргасан бол 10MB хүртэл зөвшөөрнө.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
