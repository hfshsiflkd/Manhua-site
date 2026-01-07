"use client";

import { useState } from "react";
import { submitFeedback, type FeedbackType } from "@/lib/feedback";

const typeOptions: Array<{ value: FeedbackType; label: string; hint: string }> = [
  {
    value: "suggestion_request",
    label: "Санал / Хүсэлт",
    hint: "Шинэ боломж, сайжруулалт, контентын хүсэлт гэх мэт.",
  },
  {
    value: "complaint",
    label: "Гомдол / Алдаа мэдэгдэх",
    hint: "Сайт дээрх асуудал, алдаа, эвдрэл, буруу ажиллаж буй хэсэг.",
  },
];

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
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await submitFeedback({
        name: name.trim(),
        type,
        description: description.trim(),
        image,
      });
      setOk("Амжилттай илгээлээ. Баярлалаа!");
      setName("");
      setDescription("");
      setImage(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Илгээж чадсангүй. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(99,102,241,0.10),transparent_55%)]" />
        <div className="relative mx-auto w-full max-w-4xl px-4 py-14 text-center sm:px-6">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-slate-300">
            ✉️ Санал хүсэлт
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            Санал, хүсэлт, гомдол илгээх
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300">
            Сайтыг сайжруулах санал, шинэ боломжийн хүсэлт, эсвэл асуудал/алдааг
            зурагтай нь илгээнэ үү.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg shadow-black/30"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Таны нэр</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={120}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Нэр"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Төрөл</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as FeedbackType)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {typeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-slate-500">{selected.hint}</div>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <label className="text-xs text-slate-400">Дэлгэрэнгүй тайлбар</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  maxLength={5000}
                  rows={6}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Юу болсон, хаана, хэрхэн давтагдаж байна гэх мэт…"
                />
              </div>

              <div className="mt-4 space-y-1">
                <label className="text-xs text-slate-400">Зураг хавсаргах (сонголтоор)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-200 hover:file:bg-cyan-500/25"
                />
                <div className="text-[11px] text-slate-500">
                  Screenshot эсвэл алдааны зургийг оруулбал хурдан шийдэхэд тус болно.
                </div>
              </div>

              {err && (
                <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {err}
                </div>
              )}
              {ok && (
                <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  {ok}
                </div>
              )}

              <button
                disabled={busy}
                className="mt-4 w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:opacity-60"
              >
                {busy ? "Илгээж байна…" : "Илгээх"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="text-sm font-semibold text-slate-100">Тайлбар</div>
              <p className="mt-2 text-sm text-slate-300">
                Илгээсэн мэдээлэл админ хэсэгт очиж, тус бүрээр нь шалгагдана.
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                Зураг хавсаргасан бол 10MB хүртэл зөвшөөрнө.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

