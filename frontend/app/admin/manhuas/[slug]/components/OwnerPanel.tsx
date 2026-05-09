/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Manhua, User } from "@/lib/api";
import {
  adminGetUsers,
  adminSetManhuaOwners,
} from "@/lib/api";
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
    .filter((o): o is OwnerLite => typeof o === "object" && o !== null && "_id" in o)
    .map((o) => ({
      _id: o._id,
      username: o.username,
      email: o.email,
      role: o.role,
    }));
}

const removeBtn: React.CSSProperties = {
  fontSize: 10,
  padding: "3px 8px",
  borderRadius: 5,
  border: "1px solid oklch(0.65 0.22 25 / .35)",
  color: "oklch(0.78 0.18 25)",
  background: "transparent",
  cursor: "pointer",
};
const addBtn: React.CSSProperties = {
  fontSize: 10,
  padding: "5px 11px",
  borderRadius: 6,
  border: "1px solid oklch(0.72 0.17 195 / .4)",
  color: "var(--arc-cyan)",
  background: "transparent",
  cursor: "pointer",
  fontWeight: 600,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 9px",
  borderRadius: 6,
  border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)",
  color: "var(--arc-text)",
  fontSize: 11,
  outline: "none",
};

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
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const users = await adminGetUsers(q);
        if (cancelled) return;
        // зөвхөн editor/admin/translator role-уудыг харуулна
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
    if (ownerIds.has(u._id)) {
      toast.error("Энэ хэрэглэгч аль хэдийн эзэмшигч байна");
      return;
    }
    const next = [
      ...owners,
      { _id: u._id, username: u.username, email: u.email, role: u.role },
    ];
    setQuery("");
    setResults([]);
    await persist(next);
  }

  async function handleRemove(id: string) {
    if (!confirm("Эзэмшигчийг хасах уу?")) return;
    const next = owners.filter((o) => o._id !== id);
    await persist(next);
  }

  return (
    <PanelShell title="Эзэмшигчид">
      <div className="space-y-3">
        {/* Үүсгэгч (createdBy) — өөрчлөгдөхгүй */}
        {creator && typeof creator === "object" && (
          <div>
            <div
              className="text-[10px] uppercase tracking-wider mb-1.5"
              style={{ color: "var(--arc-muted)" }}
            >
              Үүсгэгч
            </div>
            <div
              className="rounded-[6px] px-2.5 py-2 flex items-center justify-between"
              style={{
                background: "var(--arc-elevated)",
                border: "1px solid var(--arc-border)",
              }}
            >
              <div>
                <div
                  className="text-[12px] font-medium"
                  style={{ color: "var(--arc-text)" }}
                >
                  {(creator as any).username}
                </div>
                {(creator as any).email && (
                  <div
                    className="text-[10px]"
                    style={{ color: "var(--arc-muted)" }}
                  >
                    {(creator as any).email}
                  </div>
                )}
              </div>
              <span
                className="rounded-[4px] px-2 py-0.5 text-[9px] font-semibold uppercase"
                style={{
                  background: "var(--arc-card)",
                  border: "1px solid var(--arc-border)",
                  color: "var(--arc-dim)",
                }}
              >
                {(creator as any).role || "user"}
              </span>
            </div>
          </div>
        )}

        {/* Хамтын эзэмшигчид */}
        <div>
          <div
            className="text-[10px] uppercase tracking-wider mb-1.5"
            style={{ color: "var(--arc-muted)" }}
          >
            Хамтын эзэмшигчид ({owners.length})
          </div>
          {owners.length === 0 ? (
            <p
              className="text-[11px] py-1"
              style={{ color: "var(--arc-muted)" }}
            >
              Бүртгэгдээгүй. Доорх хайлтаас нэмж болно.
            </p>
          ) : (
            <div className="space-y-1.5">
              {owners.map((o) => (
                <div
                  key={o._id}
                  className="rounded-[6px] px-2.5 py-2 flex items-center justify-between"
                  style={{
                    background: "var(--arc-elevated)",
                    border: "1px solid var(--arc-border)",
                    opacity: o._id === creatorId ? 0.6 : 1,
                  }}
                >
                  <div className="min-w-0">
                    <div
                      className="text-[12px] font-medium truncate"
                      style={{ color: "var(--arc-text)" }}
                    >
                      {o.username}
                      {o._id === creatorId && (
                        <span
                          className="ml-2 text-[9px]"
                          style={{ color: "var(--arc-muted)" }}
                        >
                          (үүсгэгч)
                        </span>
                      )}
                    </div>
                    {o.email && (
                      <div
                        className="text-[10px] truncate"
                        style={{ color: "var(--arc-muted)" }}
                      >
                        {o.email}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span
                      className="rounded-[4px] px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                      style={{
                        background: "var(--arc-card)",
                        border: "1px solid var(--arc-border)",
                        color: "var(--arc-dim)",
                      }}
                    >
                      {o.role || "user"}
                    </span>
                    <button
                      style={removeBtn}
                      disabled={busy}
                      onClick={() => handleRemove(o._id)}
                    >
                      Хасах
                    </button>
                  </div>
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
            className="text-[10px] uppercase tracking-wider mb-1.5"
            style={{ color: "var(--arc-muted)" }}
          >
            Эзэмшигч нэмэх
          </div>
          <input
            type="text"
            placeholder="Username эсвэл email-ээр хайх (editor/translator/admin)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={busy}
            style={inputStyle}
          />
          {searching && (
            <p
              className="text-[10px] mt-1.5"
              style={{ color: "var(--arc-muted)" }}
            >
              Хайж байна…
            </p>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p
              className="text-[10px] mt-1.5"
              style={{ color: "var(--arc-muted)" }}
            >
              Хэрэглэгч олдсонгүй.
            </p>
          )}
          {results.length > 0 && (
            <div className="space-y-1 mt-2">
              {results.slice(0, 8).map((u) => {
                const already = ownerIds.has(u._id);
                return (
                  <div
                    key={u._id}
                    className="rounded-[6px] px-2.5 py-2 flex items-center justify-between"
                    style={{
                      background: "var(--arc-elevated)",
                      border: "1px solid var(--arc-border)",
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="text-[12px] font-medium truncate"
                        style={{ color: "var(--arc-text)" }}
                      >
                        {u.username}{" "}
                        <span
                          className="text-[9px] uppercase"
                          style={{ color: "var(--arc-muted)" }}
                        >
                          {u.role}
                        </span>
                      </div>
                      <div
                        className="text-[10px] truncate"
                        style={{ color: "var(--arc-muted)" }}
                      >
                        {u.email}
                      </div>
                    </div>
                    <button
                      style={addBtn}
                      disabled={busy || already}
                      onClick={() => handleAdd(u)}
                    >
                      {already ? "Орсон" : "+ Нэмэх"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  );
}
