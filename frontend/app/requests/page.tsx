"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadImage } from "@/lib/api";
import { useToast } from "@/app/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { createRequest, getRequests, voteRequest, type RequestItem } from "@/lib/requests";

const MAX_IMAGE_SIZE_MB = 10;

function RequestBadge({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl?: string;
}) {
  const initial = (title || "?").trim().slice(0, 1).toUpperCase();
  if (imageUrl) {
    return (
      <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm font-bold text-slate-100">
      {initial}
    </div>
  );
}

export default function ReaderRequestsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [monthKey, setMonthKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [voteTarget, setVoteTarget] = useState<RequestItem | null>(null);

  const votedKey = useMemo(
    () => (monthKey ? `request_votes_${monthKey}` : "request_votes"),
    [monthKey]
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRequests();
      setItems(data.items || []);
      setMonthKey(data.monthKey);
    } catch {
      toast.error("Хүсэлтүүдийг уншиж чадсангүй");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topRequests = useMemo(() => {
    return [...items].sort((a, b) => b.votesThisMonth - a.votesThisMonth);
  }, [items]);

  const hasVipAccess =
    !!user &&
    (user.isVIP ||
      (user.vipExpiresAt && new Date(user.vipExpiresAt).getTime() > Date.now()));

  const hasVoted = (id: string) => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem(votedKey);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as string[];
      return parsed.includes(id);
    } catch {
      return false;
    }
  };

  const markVoted = (id: string) => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(votedKey);
    const current = raw ? (JSON.parse(raw) as string[]) : [];
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(votedKey, JSON.stringify(current));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasVipAccess) {
      toast.error("Зөвхөн VIP хэрэглэгч хүсэлт нэмэх боломжтой.");
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Манхуа нэр оруулна уу");
      return;
    }

    try {
      setSubmitting(true);
      let imageUrl = "";

      if (image) {
        const sizeMb = image.size / 1024 / 1024;
        if (sizeMb > MAX_IMAGE_SIZE_MB) {
          toast.error("Зураг 10MB-с их байна");
          return;
        }
        setUploading(true);
        setUploadProgress(0);
        const uploadResult = await uploadImage(image, (percent) => {
          setUploadProgress(percent);
        });
        imageUrl = (uploadResult as any).url || "";
        setUploadProgress(100);
      }

      const created = await createRequest({ title: trimmed, imageUrl });
      setItems((prev) => [created, ...prev]);
      setTitle("");
      setImage(null);
      if (created.id) {
        markVoted(created.id);
      }
      toast.success("Хүсэлт амжилттай илгээгдлээ");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Хүсэлт илгээж чадсангүй");
    } finally {
      setSubmitting(false);
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleVote = async (id: string) => {
    if (!hasVipAccess) {
      toast.error("Зөвхөн VIP хэрэглэгч санал өгөх боломжтой.");
      return;
    }
    if (hasVoted(id)) {
      toast.info("Та энэ сард санал өгсөн байна");
      return;
    }

    try {
      const data = await voteRequest(id);

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                votes: data.votes ?? item.votes,
                votesThisMonth: data.votesThisMonth ?? item.votesThisMonth,
              }
            : item
        )
      );
      markVoted(id);
      toast.success("Санал өглөө");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Санал өгч чадсангүй");
    }
  };

  const openVoteModal = (item: RequestItem) => {
    setVoteTarget(item);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {voteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/95 shadow-2xl shadow-black/60">
            <div className="p-5">
              <div className="text-xs text-slate-400">Санал өгөх</div>
              <h3 className="mt-1 text-lg font-semibold text-slate-100">
                {voteTarget.title}
              </h3>
            </div>
            {voteTarget.imageUrl ? (
              <div className="px-5 pb-4">
                <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={voteTarget.imageUrl}
                    alt={voteTarget.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="px-5 pb-4">
                <div className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 text-xs text-slate-500">
                  No image
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-slate-950/80 px-5 py-4">
              {!hasVipAccess && (
                <div className="mr-auto rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">
                  VIP хэрэгтэй
                </div>
              )}
              {hasVoted(voteTarget.id) && (
                <div className="mr-auto rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                  Энэ сард санал өгсөн
                </div>
              )}
              <button
                type="button"
                onClick={() => setVoteTarget(null)}
                className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = voteTarget.id;
                  setVoteTarget(null);
                  await handleVote(id);
                }}
                disabled={!hasVipAccess || hasVoted(voteTarget.id)}
                className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-1.5 text-xs font-bold text-slate-950 shadow shadow-cyan-500/30 hover:brightness-110 disabled:opacity-50"
              >
                Санал өгөх
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-indigo-950/25 to-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.10),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(167,139,250,0.10),transparent_45%)]" />
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-cyan-200">
            ✨ Уншихыг хүссэн манхуа
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            Уншигчийн хүсэлтийн жагсаалт
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Та өөрийн хүссэн манхуагаа нэмээд, бусдын хүсэлтэд санал өгч болно.
            Энэ сарын хамгийн их саналтай хүсэлтийг доор харуулна.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-16 pb-24 lg:pb-32">
        <section className="rounded-3xl bg-slate-900/40 p-6 shadow-lg shadow-black/30 backdrop-blur lg:fixed lg:bottom-6 lg:right-6 lg:w-[360px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Хүсэлт нэмэх
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Хүссэн манхуагаа оруулаад бусдад санал өгөх боломж олгоно.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200">
                Сар: {monthKey || "--"}
              </div>
              <button
                type="button"
                onClick={() => setShowForm((prev) => !prev)}
                className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2 text-[11px] font-bold text-slate-950 shadow-lg shadow-cyan-500/30 hover:brightness-110"
              >
                {showForm ? "Хүсэлт хаах" : "Хүсэлт нэмэх"}
              </button>
            </div>
          </div>

          {!hasVipAccess && (
            <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              Зөвхөн VIP хэрэглэгч хүсэлт нэмэх болон санал өгөх боломжтой.
            </div>
          )}

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="mt-5 grid gap-4 lg:grid-cols-[1fr,1fr,180px]"
            >
              <div className="space-y-1 lg:col-span-1">
                <label className="text-xs text-slate-400">Манхуа нэр</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Жишээ: Solo Leveling"
                  maxLength={120}
                  disabled={!hasVipAccess}
                />
              </div>
              <div className="space-y-2 lg:col-span-1">
                <label className="text-xs text-slate-400">
                  Зураг (сонголтоор)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-200 hover:file:bg-cyan-500/25"
                  disabled={!hasVipAccess}
                />
                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {uploading ? "Upload хийж байна..." : "Upload"}
                      </span>
                      <span className="font-mono text-slate-200">
                        {uploadProgress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-[width] duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="text-[11px] text-slate-500">
                  10MB хүртэл зөвшөөрнө.
                </div>
              </div>
              <div className="flex items-end lg:col-span-1">
                <button
                  type="submit"
                  disabled={submitting || uploading || !hasVipAccess}
                  className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/30 hover:brightness-110 disabled:opacity-60"
                >
                  {uploading
                    ? "Зураг upload хийж байна..."
                    : submitting
                    ? "Илгээж байна..."
                    : "Хүсэлт илгээх"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="mx-auto mt-8 w-full max-w-5xl rounded-3xl bg-slate-900/40 p-6 shadow-lg shadow-black/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Энэ сарын шилдэг 3 хүсэлт
              </h2>
              <p className="mt-1 text-xs text-slate-500">Сар: {monthKey}</p>
            </div>
            <div className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-200">
              Leaderboard
            </div>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-slate-400">Уншиж байна…</div>
          ) : topRequests.length === 0 ? (
            <div className="mt-4 text-sm text-slate-500">
              Одоогоор хүсэлт алга.
            </div>
          ) : (
            <section className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-3">
              {[
                {
                  idx: 1,
                  label: "2nd",
                  accent: "from-slate-300/20 to-slate-900/40",
                  ring: "border-slate-700",
                  amount: "text-slate-100",
                  icon: "🥈",
                },
                {
                  idx: 0,
                  label: "1st",
                  accent: "from-amber-400/20 to-slate-900/40",
                  ring: "border-amber-500/40",
                  amount: "text-amber-200",
                  icon: "👑",
                },
                {
                  idx: 2,
                  label: "3rd",
                  accent: "from-rose-400/15 to-slate-900/40",
                  ring: "border-rose-500/30",
                  amount: "text-rose-200",
                  icon: "🥉",
                },
              ].map((slot) => {
                const item = topRequests[slot.idx];
                return (
                  <div
                    key={slot.label}
                    className={[
                      "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-lg shadow-black/30",
                      slot.accent,
                    ].join(" ")}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.06),transparent_55%)]" />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">
                          {slot.label}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <RequestBadge
                            title={item?.title || ""}
                            imageUrl={item?.imageUrl}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-slate-50">
                              {item?.title || "—"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Manhua request
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-950/30 p-2">
                        <span className="text-base">{slot.icon}</span>
                      </div>
                    </div>

                    <div className="relative mt-4">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        This month
                      </div>
                      <div className={`mt-1 text-2xl font-bold ${slot.amount}`}>
                        {item ? `${item.votesThisMonth} санал` : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </section>

        <section className="mx-auto mt-8 w-full max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-100">
              Бүх хүсэлтүүд
            </h2>
            <button
              onClick={load}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-slate-400">Уншиж байна…</div>
          ) : items.length === 0 ? (
            <div className="mt-4 text-sm text-slate-500">
              Одоогоор хүсэлт алга.
            </div>
          ) : (
            <section className="mt-5 overflow-hidden rounded-2xl bg-slate-900/50 shadow-lg shadow-black/30">
              <div className="flex items-center justify-between bg-slate-950/40 px-4 py-3">
                <div className="text-sm font-semibold text-slate-100">
                  Full ranking
                </div>
                <div className="text-[11px] text-slate-400">
                  This month (votes)
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-950/40 text-xs text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Manhua</th>
                      <th className="px-4 py-3 text-right">This month</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Vote</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {topRequests.map((item, idx) => {
                      const rank = idx + 1;
                      const highlight =
                        rank === 1
                          ? "bg-amber-500/5"
                          : rank === 2
                          ? "bg-slate-500/5"
                          : rank === 3
                          ? "bg-rose-500/5"
                          : "";
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-950/40 ${highlight}`}
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2">
                              <span className="text-slate-200">#{rank}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openVoteModal(item)}
                              className="group flex w-full items-center gap-3 text-left"
                            >
                              <RequestBadge
                                title={item.title}
                                imageUrl={item.imageUrl}
                              />
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-100 group-hover:text-cyan-200">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Manhua request
                                </div>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-cyan-200">
                            {item.votesThisMonth}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-300">
                            {item.votes}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => openVoteModal(item)}
                              disabled={hasVoted(item.id) || !hasVipAccess}
                              className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-50"
                            >
                              {hasVoted(item.id)
                                ? "Санал өгсөн"
                                : hasVipAccess
                                ? "Санал өгөх"
                                : "VIP хэрэгтэй"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {topRequests.length === 0 && (
                      <tr>
                        <td
                          className="px-4 py-8 text-sm text-slate-400"
                          colSpan={5}
                        >
                          Одоогоор хүсэлт алга.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}
