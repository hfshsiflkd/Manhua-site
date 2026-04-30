"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadImage } from "@/lib/api";
import { useToast } from "@/app/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { createRequest, getRequests, voteRequest, type RequestItem } from "@/lib/requests";

const MAX_IMAGE_SIZE_MB = 10;

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 9,
  border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)",
  padding: "9px 14px",
  fontSize: 13,
  color: "var(--arc-text)",
  outline: "none",
};

function RequestBadge({ title, imageUrl }: { title: string; imageUrl?: string }) {
  const initial = (title || "?").trim().slice(0, 1).toUpperCase();
  if (imageUrl) {
    return (
      <div className="overflow-hidden shrink-0" style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid var(--arc-border)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className="flex items-center justify-center text-[13px] font-bold shrink-0"
      style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-cyan)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}
    >
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

  const topRequests = useMemo(() => [...items].sort((a, b) => b.votesThisMonth - a.votesThisMonth), [items]);

  const isLoggedIn = !!user;

  const hasVoted = (id: string) => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem(votedKey);
    if (!raw) return false;
    try { return (JSON.parse(raw) as string[]).includes(id); } catch { return false; }
  };

  const markVoted = (id: string) => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(votedKey);
    const current = raw ? (JSON.parse(raw) as string[]) : [];
    if (!current.includes(id)) { current.push(id); localStorage.setItem(votedKey, JSON.stringify(current)); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { toast.error("Нэвтэрсэн байх шаардлагатай."); return; }
    const trimmed = title.trim();
    if (!trimmed) { toast.error("Манхуа нэр оруулна уу"); return; }
    try {
      setSubmitting(true);
      let imageUrl = "";
      if (image) {
        const sizeMb = image.size / 1024 / 1024;
        if (sizeMb > MAX_IMAGE_SIZE_MB) { toast.error("Зураг 10MB-с их байна"); return; }
        setUploading(true); setUploadProgress(0);
        const uploadResult = await uploadImage(image, (percent) => setUploadProgress(percent));
        imageUrl = (uploadResult as any).url || "";
        setUploadProgress(100);
      }
      const created = await createRequest({ title: trimmed, imageUrl });
      setItems((prev) => [created, ...prev]);
      setTitle(""); setImage(null);
      if (created.id) markVoted(created.id);
      toast.success("Хүсэлт амжилттай илгээгдлээ");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Хүсэлт илгээж чадсангүй");
    } finally { setSubmitting(false); setUploading(false); setUploadProgress(null); }
  };

  const handleVote = async (id: string) => {
    if (!isLoggedIn) { toast.error("Нэвтэрсэн байх шаардлагатай."); return; }
    if (hasVoted(id)) { toast.info("Та энэ сард санал өгсөн байна"); return; }
    try {
      const data = await voteRequest(id);
      setItems((prev) => prev.map((item) =>
        item.id === id ? { ...item, votes: data.votes ?? item.votes, votesThisMonth: data.votesThisMonth ?? item.votesThisMonth } : item
      ));
      markVoted(id);
      toast.success("Санал өглөө");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Санал өгч чадсангүй");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--arc-bg)" }}>
      {/* Vote modal */}
      {voteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm overflow-hidden rounded-[16px] shadow-2xl" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <div className="p-5">
              <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Санал өгөх</div>
              <h3 className="mt-1 text-[15px] font-semibold" style={{ color: "var(--arc-text)" }}>{voteTarget.title}</h3>
            </div>
            {voteTarget.imageUrl ? (
              <div className="px-5 pb-4">
                <div className="aspect-[3/4] w-full overflow-hidden rounded-[10px]" style={{ border: "1px solid var(--arc-border)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={voteTarget.imageUrl} alt={voteTarget.title} className="h-full w-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="px-5 pb-4">
                <div className="flex aspect-[3/4] w-full items-center justify-center rounded-[10px] text-[12px]" style={{ border: "1px dashed var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-muted)" }}>
                  No image
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
              {!isLoggedIn && (
                <div className="mr-auto rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: "oklch(0.72 0.17 195/.1)", border: "1px solid oklch(0.72 0.17 195/.3)", color: "var(--arc-cyan)" }}>
                  Нэвтрэх шаардлагатай
                </div>
              )}
              {hasVoted(voteTarget.id) && (
                <div className="mr-auto rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: "var(--arc-elevated)", border: "1px solid var(--arc-border)", color: "var(--arc-dim)" }}>
                  Энэ сард санал өгсөн
                </div>
              )}
              <button
                type="button"
                onClick={() => setVoteTarget(null)}
                className="rounded-full px-4 py-1.5 text-[12px] font-medium"
                style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}
              >
                Болих
              </button>
              <button
                type="button"
                onClick={async () => { const id = voteTarget.id; setVoteTarget(null); await handleVote(id); }}
                disabled={!isLoggedIn || hasVoted(voteTarget.id)}
                className="rounded-full px-4 py-1.5 text-[12px] font-bold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
              >
                Санал өгөх
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 20% 15%,oklch(0.72 0.17 195/.08),transparent 45%)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 80% 30%,oklch(0.65 0.22 15/.06),transparent 45%)" }} />
        <div className="relative mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
          <div
            className="inline-flex items-center gap-2 text-[11px] font-semibold mb-4"
            style={{ borderRadius: 99, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", padding: "4px 12px", color: "var(--arc-cyan)" }}
          >
            ✨ Уншихыг хүссэн манхуа
          </div>
          <h1 className="text-[30px] sm:text-[36px] font-extrabold tracking-tight" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)", letterSpacing: "-0.025em" }}>
            Уншигчийн хүсэлтийн жагсаалт
          </h1>
          <p className="mt-3 text-[13px]" style={{ color: "var(--arc-dim)", maxWidth: 520 }}>
            Та өөрийн хүссэн манхуагаа нэмээд, бусдын хүсэлтэд санал өгч болно.
            Энэ сарын хамгийн их саналтай хүсэлтийг доор харуулна.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 pb-24 lg:pb-32">

        {/* Submit form */}
        <section className="rounded-[14px] p-5 mb-8" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Хүсэлт нэмэх</h2>
              <p className="mt-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Хүссэн манхуагаа оруулаад бусдад санал өгөх боломж олгоно.</p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "var(--arc-cyan-dim)", border: "1px solid oklch(0.72 0.17 195/.2)", color: "var(--arc-cyan)" }}
              >
                Сар: {monthKey || "--"}
              </div>
              <button
                type="button"
                onClick={() => setShowForm((prev) => !prev)}
                className="rounded-[9px] px-4 py-2 text-[12px] font-bold transition-all hover:brightness-110"
                style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
              >
                {showForm ? "Хаах" : "Хүсэлт нэмэх"}
              </button>
            </div>
          </div>

          {!isLoggedIn && (
            <div className="mt-4 rounded-[10px] px-4 py-3 text-[12px]" style={{ background: "oklch(0.72 0.17 195/.08)", border: "1px solid oklch(0.72 0.17 195/.3)", color: "var(--arc-cyan)" }}>
              Хүсэлт нэмэхийн тулд нэвтэрнэ үү.
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="mt-5 grid gap-4 lg:grid-cols-[1fr,1fr,180px]">
              <div className="space-y-1">
                <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Манхуа нэр</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={inputStyle}
                  placeholder="Жишээ: Solo Leveling"
                  maxLength={120}
                  disabled={!isLoggedIn}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Зураг (сонголтоор)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="block w-full text-[12px] file:mr-3 file:rounded-full file:border-0 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold"
                  style={{ color: "var(--arc-dim)" }}
                  disabled={!isLoggedIn}
                />
                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--arc-muted)" }}>
                      <span>{uploading ? "Upload хийж байна..." : "Upload"}</span>
                      <span className="font-mono" style={{ color: "var(--arc-text)" }}>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--arc-elevated)" }}>
                      <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${uploadProgress}%`, background: "var(--arc-cyan)" }} />
                    </div>
                  </div>
                )}
                <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>10MB хүртэл зөвшөөрнө.</div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submitting || uploading || !isLoggedIn}
                  className="w-full rounded-[9px] px-4 py-2.5 text-[12px] font-bold transition-all hover:brightness-110 disabled:opacity-60"
                  style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
                >
                  {uploading ? "Зураг upload..." : submitting ? "Илгээж байна..." : "Хүсэлт илгээх"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Top 3 */}
        <section className="rounded-[14px] p-5 mb-8" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-cyan)", boxShadow: "0 0 8px var(--arc-cyan-glow)" }} />
              <div>
                <h2 className="text-[14px] font-semibold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Энэ сарын шилдэг 3 хүсэлт</h2>
                <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Сар: {monthKey}</p>
              </div>
            </div>
            <div
              className="text-[11px] font-semibold px-3 py-1 rounded-full"
              style={{ background: "oklch(0.82 0.16 85/.08)", border: "1px solid oklch(0.82 0.16 85/.3)", color: "var(--arc-amber)" }}
            >
              Leaderboard
            </div>
          </div>

          {loading ? (
            <div className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Уншиж байна…</div>
          ) : topRequests.length === 0 ? (
            <div className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Одоогоор хүсэлт алга.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { idx: 1, label: "2nd", borderColor: "var(--arc-border)", amberText: false, icon: "🥈" },
                { idx: 0, label: "1st", borderColor: "oklch(0.82 0.16 85/.4)", amberText: true, icon: "👑" },
                { idx: 2, label: "3rd", borderColor: "oklch(0.65 0.22 15/.3)", amberText: false, icon: "🥉" },
              ].map((slot) => {
                const item = topRequests[slot.idx];
                return (
                  <div key={slot.label} className="relative overflow-hidden rounded-[12px] p-4" style={{ border: `1px solid ${slot.borderColor}`, background: "var(--arc-elevated)" }}>
                    <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 25% 20%,rgba(255,255,255,.04),transparent 55%)" }} />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--arc-muted)" }}>{slot.label}</div>
                        <div className="mt-2 flex items-center gap-2.5">
                          <RequestBadge title={item?.title || ""} imageUrl={item?.imageUrl} />
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold" style={{ color: "var(--arc-text)" }}>{item?.title || "—"}</div>
                            <div className="text-[10px]" style={{ color: "var(--arc-muted)" }}>Manhua request</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-1.5 rounded-[7px] text-base" style={{ background: "var(--arc-card)" }}>{slot.icon}</div>
                    </div>
                    <div className="relative mt-3">
                      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--arc-muted)" }}>This month</div>
                      <div className="mt-0.5 text-[20px] font-bold" style={{ color: slot.amberText ? "var(--arc-amber)" : "var(--arc-text)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>
                        {item ? `${item.votesThisMonth} санал` : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Full table */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Бүх хүсэлтүүд</h2>
            <button
              onClick={load}
              className="rounded-[9px] px-3 py-1.5 text-[12px] transition-colors"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Уншиж байна…</div>
          ) : items.length === 0 ? (
            <div className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Одоогоор хүсэлт алга.</div>
          ) : (
            <div className="overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                <span className="text-[13px] font-semibold" style={{ color: "var(--arc-text)" }}>Full ranking</span>
                <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>This month (votes)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[13px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                      {["Rank", "Manhua", "This month", "Total", "Vote"].map((h, i) => (
                        <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider${i >= 2 ? " text-right" : ""}`} style={{ color: "var(--arc-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topRequests.map((item, idx) => {
                      const rank = idx + 1;
                      const highlightBg = rank === 1 ? "oklch(0.82 0.16 85/.04)" : rank === 3 ? "oklch(0.65 0.22 15/.04)" : "transparent";
                      return (
                        <tr
                          key={item.id}
                          style={{ borderBottom: idx < topRequests.length - 1 ? "1px solid var(--arc-border)" : "none", background: highlightBg }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.03)")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = highlightBg)}
                        >
                          <td className="px-4 py-3">
                            <span className="font-semibold text-[13px]" style={{ color: rank === 1 ? "var(--arc-amber)" : rank <= 3 ? "var(--arc-cyan)" : "var(--arc-muted)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>
                              #{rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => setVoteTarget(item)} className="group flex w-full items-center gap-3 text-left">
                              <RequestBadge title={item.title} imageUrl={item.imageUrl} />
                              <div className="min-w-0">
                                <div className="truncate font-semibold" style={{ color: "var(--arc-text)" }}>{item.title}</div>
                                <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Manhua request</div>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--arc-cyan)" }}>{item.votesThisMonth}</td>
                          <td className="px-4 py-3 text-right" style={{ color: "var(--arc-dim)" }}>{item.votes}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setVoteTarget(item)}
                              disabled={hasVoted(item.id) || !isLoggedIn}
                              className="rounded-full px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: hasVoted(item.id) ? "var(--arc-muted)" : "var(--arc-dim)", cursor: "pointer" }}
                            >
                              {hasVoted(item.id) ? "Санал өгсөн" : isLoggedIn ? "Санал өгөх" : "Нэвтрэх"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {topRequests.length === 0 && (
                      <tr>
                        <td className="px-4 py-8 text-[13px]" style={{ color: "var(--arc-muted)" }} colSpan={5}>Одоогоор хүсэлт алга.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
