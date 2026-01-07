"use client";

import { useState } from "react";
import { submitFeedback, type FeedbackType } from "@/lib/feedback";

const typeOptions: Array<{ value: FeedbackType; label: string; hint: string }> = [
  {
    value: "suggestion_request",
    label: "Suggestion / Request",
    hint: "Feature requests, improvement ideas, content requests.",
  },
  {
    value: "complaint",
    label: "Complaint / Report",
    hint: "Issues, bugs, errors, or anything that needs fixing.",
  },
];

export default function FeedbackFooterForm() {
  const [open, setOpen] = useState(false);
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
      setOk("Sent. Thank you — we’ll review it soon.");
      setName("");
      setDescription("");
      setImage(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-950/60 p-4 shadow-lg shadow-black/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">
              Suggestions &amp; complaints
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Send requests, ideas, bug reports — optional screenshot.
            </div>
          </div>
          <div className="mt-1 shrink-0 rounded-full border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] text-gray-300">
            {open ? "Hide" : "Open"}
          </div>
        </div>
      </button>

      {open && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] text-gray-400">Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                className="w-full rounded-xl border border-zinc-800 bg-[#0B0D17] px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                placeholder="Name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-gray-400">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
                className="w-full rounded-xl border border-zinc-800 bg-[#0B0D17] px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                {typeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-gray-500">{selected.hint}</div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-gray-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={5000}
              rows={4}
              className="w-full resize-none rounded-xl border border-zinc-800 bg-[#0B0D17] px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              placeholder="Describe your suggestion or the issue you encountered…"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-gray-400">Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="block w-full text-xs text-gray-300 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-200 hover:file:bg-cyan-500/25"
            />
          </div>

          {err && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {err}
            </div>
          )}
          {ok && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              {ok}
            </div>
          )}

          <button
            disabled={busy}
            className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </form>
      )}
    </div>
  );
}

