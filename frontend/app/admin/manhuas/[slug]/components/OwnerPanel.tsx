/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Manhua, User } from "@/lib/api";
import { adminGetUsers, adminSetManhuaOwners } from "@/lib/api";
import { PanelShell } from "./PanelShell";
import { useToast } from "@/app/components/ToastProvider";

interface OwnerPanelProps {
  manhua: Manhua;
  onUpdated?: (m: Manhua) => void;
}

interface OwnerLite {
  _id: string;
  username: string;
  email?: string;
  role?: string;
}

function normalizeOwners(manhua: Manhua): OwnerLite[] {
  if (!Array.isArray(manhua.owners)) return [];
  return manhua.owners
    .filter(
      (o): o is OwnerLite =>
        typeof o === "object" && o !== null && "_id" in o
    )
    .map((o) => ({
      _id: o._id,
      username: o.username,
      email: o.email,
      role: o.role,
    }));
}

const ROLE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  admin: {
    bg: "oklch(0.65 0.22 25 / .12)",
    fg: "oklch(0.78 0.18 25)",
    border: "oklch(0.65 0.22 25 / .35)",
  },
  editor: {
    bg: "oklch(0.72 0.17 195 / .12)",
    fg: "var(--arc-cyan)",
    border: "oklch(0.72 0.17 195 / .35)",
  },
  translator: {
    bg: "oklch(0.72 0.17 285 / .12)",
    fg: "oklch(0.78 0.16 285)",
    border: "oklch(0.72 0.17 285 / .35)",
  },
  user: {
    bg: "var(--arc-elevated)",
    fg: "var(--arc-muted)",
    border: "var(--arc-border)",
  },
};

function RoleBadge({ role }: { role?: string }) {
  const r = role || "user";
  const c = ROLE_COLORS[r] || ROLE_COLORS.user;
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wide"
      style={{
        padding: "2px 6px",
        borderRadius: 4,
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        letterSpacing: "0.04em",
      }}
    >
      {r}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  // simple deterministic hue from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        flexShrink: 0,
        background: `oklch(0.62 0.16 ${hue})`,
        color: "#0a0a14",
        fontSize: 12,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        letterSpacing: "-0.01em",
      }}
    >
      {initial}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 11px 8px 32px",
  borderRadius: 8,
  border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)",
  color: "var(--arc-text)",
  fontSize: 12,
  outline: "none",
  fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
};

const SearchIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      position: "absolute",
      left: 10,
      top: "50%",
      transform: "translateY(-50%)",
      color: "var(--arc-muted)",
      pointerEvents: "none",
    }}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const CrownIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3 5 5-3-2 11H6L4 4l5 3 3-5z" />
  </svg>
);

export function OwnerPanel({ manhua, onUpdated }: OwnerPanelProps) {
  const toast = useToast();
  const [owners, setOwners] = useState<OwnerLite[]>(() => normalizeOwners(manhua));
  const [creator, setCreator] = useState(manhua.createdBy);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setOwners(normalizeOwners(manhua));
    setCreator(manhua.createdBy);
  }, [manhua]);

  // Хайлт debounce
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const users = await adminGetUsers(q);
        if (cancelled) return;
        const allowed = new Set(["editor", "admin", "translator"]);
        const filtered = (users || []).filter((u) =>
          allowed.has(String(u.role || "user"))
        );
        setResults(filtered);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const ownerIds = useMemo(() => new Set(owners.map((o) => o._id)), [owners]);
  const creatorId =
    creator && typeof creator === "object" ? (creator as any)._id : null;

  async function persist(nextOwners: OwnerLite[]) {
    setBusy(true);
    try {
      const updated = await adminSetManhuaOwners(
        manhua._id,
        nextOwners.map((o) => o._id)
      );
      setOwners(normalizeOwners(updated));
      onUpdated?.(updated);
      toast.success("Эзэмшигчид шинэчлэгдлээ");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Шинэчлэх үед алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(u: User) {
    if (ownerIds.has(u._id)) return;
    const next = [
      ...owners,
      { _id: u._id, username: u.username, email: u.email, role: u.role },
    ];
    setQuery("");
    setResults([]);
    await persist(next);
  }

  async function handleRemove(id: string, username: string) {
    if (!confirm(`"${username}"-г эзэмшигчээс хасах уу?`)) return;
    const next = owners.filter((o) => o._id !== id);
    await persist(next);
  }

  const totalCount = owners.length + (creator ? 1 : 0);

  return (
    <PanelShell
      title="Эзэмшигчид"
      right={
        <span
          className="text-[10px] font-semibold"
          style={{
            padding: "2px 8px",
            borderRadius: 10,
            background: "var(--arc-elevated)",
            border: "1px solid var(--arc-border)",
            color: "var(--arc-dim)",
          }}
        >
          {totalCount}
        </span>
      }
    >
      <div className="space-y-4">
        {/* Үүсгэгч (creator) */}
        {creator && typeof creator === "object" && (
          <div>
            <div
              className="flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--arc-muted)" }}
            >
              <CrownIcon />
              Үүсгэгч
            </div>
            <div
              className="rounded-[8px] p-2.5 flex items-center gap-2.5"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.82 0.16 85 / .08), var(--arc-elevated))",
                border: "1px solid oklch(0.82 0.16 85 / .25)",
              }}
            >
              <Avatar name={(creator as any).username || "?"} />
              <div className="flex-1 min-w-0">
                <div
                  className="text-[12px] font-semibold truncate leading-tight"
                  style={{ color: "var(--arc-text)" }}
                >
                  {(creator as any).username}
                </div>
                {(creator as any).email && (
                  <div
                    className="text-[10px] truncate leading-tight mt-0.5"
                    style={{ color: "var(--arc-muted)" }}
                  >
                    {(creator as any).email}
                  </div>
                )}
              </div>
              <RoleBadge role={(creator as any).role} />
            </div>
          </div>
        )}

        {/* Хамтын эзэмшигчид */}
        <div>
          <div
            className="flex items-center justify-between mb-1.5"
            style={{ color: "var(--arc-muted)" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Хамтын эзэмшигчид
            </span>
            <span className="text-[10px]">{owners.length}</span>
          </div>
          {owners.length === 0 ? (
            <div
              className="rounded-[8px] py-4 text-center text-[11px]"
              style={{
                background: "var(--arc-elevated)",
                border: "1px dashed var(--arc-border)",
                color: "var(--arc-muted)",
              }}
            >
              Эзэмшигч байхгүй. Доорх хайлтаар нэмнэ үү.
            </div>
          ) : (
            <div className="space-y-1.5">
              {owners.map((o) => (
                <div
                  key={o._id}
                  className="rounded-[8px] p-2.5 flex items-center gap-2.5 transition-colors group"
                  style={{
                    background: "var(--arc-elevated)",
                    border: "1px solid var(--arc-border)",
                  }}
                >
                  <Avatar name={o.username} />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[12px] font-semibold truncate leading-tight"
                      style={{ color: "var(--arc-text)" }}
                    >
                      {o.username}
                    </div>
                    {o.email && (
                      <div
                        className="text-[10px] truncate leading-tight mt-0.5"
                        style={{ color: "var(--arc-muted)" }}
                      >
                        {o.email}
                      </div>
                    )}
                  </div>
                  <RoleBadge role={o.role} />
                  <button
                    title="Эзэмшигчээс хасах"
                    disabled={busy}
                    onClick={() => handleRemove(o._id, o.username)}
                    className="opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      border: "1px solid oklch(0.65 0.22 25 / .35)",
                      background: "transparent",
                      color: "oklch(0.78 0.18 25)",
                      cursor: busy ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Хайж нэмэх */}
        <div
          className="pt-3"
          style={{ borderTop: "1px solid var(--arc-border)" }}
        >
          <div
            className="text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--arc-muted)" }}
          >
            Эзэмшигч нэмэх
          </div>
          <div style={{ position: "relative" }}>
            <SearchIcon />
            <input
              type="text"
              placeholder="Username / email хайх…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={busy}
              style={inputStyle}
            />
          </div>

          <p
            className="text-[10px] mt-1.5"
            style={{ color: "var(--arc-muted)" }}
          >
            Зөвхөн{" "}
            <span style={{ color: "var(--arc-cyan)" }}>editor</span> /{" "}
            <span style={{ color: "oklch(0.78 0.16 285)" }}>translator</span> /{" "}
            <span style={{ color: "oklch(0.78 0.18 25)" }}>admin</span>{" "}
            нэмж болно
          </p>

          {/* Search states */}
          {searching && (
            <div
              className="text-[11px] mt-2 flex items-center gap-2"
              style={{ color: "var(--arc-muted)" }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "1.5px solid var(--arc-border)",
                  borderTopColor: "var(--arc-cyan)",
                  animation: "spin 0.7s linear infinite",
                  display: "inline-block",
                }}
              />
              Хайж байна…
            </div>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p
              className="text-[11px] mt-2"
              style={{ color: "var(--arc-muted)" }}
            >
              Хэрэглэгч олдсонгүй.
            </p>
          )}
          {results.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {results.slice(0, 8).map((u) => {
                const already = ownerIds.has(u._id);
                const isCreator = u._id === creatorId;
                return (
                  <button
                    key={u._id}
                    type="button"
                    disabled={busy || already || isCreator}
                    onClick={() => handleAdd(u)}
                    className="w-full rounded-[8px] p-2.5 flex items-center gap-2.5 text-left transition-colors"
                    style={{
                      background: "var(--arc-elevated)",
                      border: "1px solid var(--arc-border)",
                      cursor:
                        busy || already || isCreator ? "not-allowed" : "pointer",
                      opacity: already || isCreator ? 0.55 : 1,
                    }}
                  >
                    <Avatar name={u.username} />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[12px] font-semibold truncate leading-tight"
                        style={{ color: "var(--arc-text)" }}
                      >
                        {u.username}
                      </div>
                      <div
                        className="text-[10px] truncate leading-tight mt-0.5"
                        style={{ color: "var(--arc-muted)" }}
                      >
                        {u.email}
                      </div>
                    </div>
                    <RoleBadge role={u.role} />
                    {already || isCreator ? (
                      <span
                        className="text-[9px] font-semibold uppercase"
                        style={{
                          padding: "3px 7px",
                          borderRadius: 4,
                          background: "var(--arc-card)",
                          border: "1px solid var(--arc-border)",
                          color: "var(--arc-muted)",
                          flexShrink: 0,
                        }}
                      >
                        {isCreator ? "Үүсгэгч" : "Орсон"}
                      </span>
                    ) : (
                      <span
                        className="flex items-center gap-1 text-[10px] font-bold uppercase"
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: "oklch(0.72 0.17 195 / .15)",
                          color: "var(--arc-cyan)",
                          border: "1px solid oklch(0.72 0.17 195 / .4)",
                          flexShrink: 0,
                        }}
                      >
                        <PlusIcon /> Нэмэх
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </PanelShell>
  );
}
