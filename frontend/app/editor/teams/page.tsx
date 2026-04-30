/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  editorAcceptTeamInvite, editorCreateTeam, editorDeclineTeamInvite,
  editorGetMyTeamInvites, editorGetTeams, Team, TeamInvite,
} from "@/lib/api";
import { useToast } from "@/app/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";

export default function EditorTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [workingInviteId, setWorkingInviteId] = useState<string | null>(null);
  const [showInvites, setShowInvites] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = String(user?.role || "") === "admin";

  const fieldStyle: React.CSSProperties = { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)", borderRadius: 9, padding: "10px 16px", fontSize: 13, outline: "none", width: "100%" };

  useEffect(() => {
    let active = true;
    editorGetTeams().then((data) => { if (!active) return; setTeams(Array.isArray(data) ? data : []); })
      .catch(() => { if (!active) return; setTeams([]); })
      .finally(() => { if (!active) return; setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingInvites(true);
    editorGetMyTeamInvites().then((data) => { if (!active) return; setInvites(Array.isArray(data) ? data : []); })
      .catch(() => { if (!active) return; setInvites([]); })
      .finally(() => { if (!active) return; setLoadingInvites(false); });
    return () => { active = false; };
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Багийн нэр оруулна уу."); return; }
    try {
      setCreating(true); setError(null);
      const team = await editorCreateTeam({ name: name.trim(), description: description.trim() || undefined });
      setTeams((prev) => [team, ...prev]);
      setName(""); setDescription("");
      toast.success("Баг үүсгэлээ");
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Баг үүсгэх үед алдаа гарлаа";
      setError(msg); toast.error(msg);
    } finally { setCreating(false); }
  };

  const handleAccept = async (invite: TeamInvite) => {
    try {
      setWorkingInviteId(invite._id);
      await editorAcceptTeamInvite(invite.team._id, invite._id);
      setInvites((prev) => prev.filter((i) => i._id !== invite._id));
      const data = await editorGetTeams();
      setTeams(Array.isArray(data) ? data : []);
      toast.success("Багийн хүсэлт зөвшөөрөгдлөө");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Алдаа гарлаа"); }
    finally { setWorkingInviteId(null); }
  };

  const handleDecline = async (invite: TeamInvite) => {
    try {
      setWorkingInviteId(invite._id);
      await editorDeclineTeamInvite(invite.team._id, invite._id);
      setInvites((prev) => prev.filter((i) => i._id !== invite._id));
      toast.success("Хүсэлт татгалзлаа");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Алдаа гарлаа"); }
    finally { setWorkingInviteId(null); }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="relative overflow-hidden rounded-[14px] p-5 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--arc-text)" }}>Teams</h1>
            <p className="text-xs sm:text-sm" style={{ color: "var(--arc-muted)" }}>Зөвхөн таны орсон багууд энд харагдана.</p>
          </div>
          <div className="rounded-full px-3 py-1.5 text-[11px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>
            Нийт: <span className="font-semibold" style={{ color: "var(--arc-text)" }}>{teams.length}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
          {error}
        </div>
      )}

      {isAdmin && (
        <section className="rounded-[14px] p-4 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: "var(--arc-text)" }}>Шинэ баг</h2>
            <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Admin эрх шаардлагатай</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr,1fr,auto]">
            <input type="text" placeholder="Team нэр" style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} />
            <input type="text" placeholder="Тайлбар (сонголт)" style={fieldStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
            <button
              type="button" onClick={handleCreate} disabled={creating}
              className="rounded-[9px] px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}
            >
              {creating ? "Үүсгэж байна..." : "Баг үүсгэх"}
            </button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--arc-text)" }}>Хүсэлтүүд</h2>
          <button
            type="button" onClick={() => setShowInvites((v) => !v)}
            className="rounded-full px-3 py-1.5 text-[11px] transition-opacity hover:opacity-80"
            style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}
          >
            {showInvites ? "Хаах" : "Хүсэлтүүдийг харах"}
          </button>
        </div>
        {showInvites && (
          loadingInvites ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2].map((i) => <div key={i} className="h-16 rounded-[14px] animate-pulse" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }} />)}
            </div>
          ) : invites.length === 0 ? (
            <div className="rounded-[14px] p-4 text-sm" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-muted)" }}>
              Хүлээгдэж буй багийн хүсэлт алга.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {invites.map((invite) => (
                <div key={invite._id} className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                  <div className="text-sm font-semibold" style={{ color: "var(--arc-text)" }}>{invite.team?.name || "Team"}</div>
                  <div className="mt-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>
                    Урьсан: <span style={{ color: "var(--arc-dim)" }}>{invite.invitedBy?.username || "—"}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full px-2 py-1 text-[10px] uppercase" style={{ border: "1px solid oklch(0.82 0.18 75/.4)", background: "oklch(0.82 0.18 75/.08)", color: "var(--arc-amber)" }}>pending</span>
                    <span className="rounded-full px-2 py-1 text-[10px] uppercase" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>{invite.role}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={() => handleAccept(invite)} disabled={workingInviteId === invite._id}
                      className="rounded-[9px] px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
                      style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
                      Зөвшөөрөх
                    </button>
                    <button type="button" onClick={() => handleDecline(invite)} disabled={workingInviteId === invite._id}
                      className="rounded-[9px] px-3 py-1.5 text-xs transition-opacity hover:opacity-80 disabled:opacity-60"
                      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>
                      Татгалзах
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--arc-text)" }}>Миний багууд</h2>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-[14px] animate-pulse" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }} />)}
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-[14px] p-6 text-sm" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-muted)" }}>
            Одоогоор таны орсон баг алга.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <div key={team._id} className="rounded-[14px] p-4 transition-all hover:brightness-110" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold" style={{ color: "var(--arc-text)" }}>{team.name}</h3>
                  {team.description && <p className="text-xs line-clamp-2" style={{ color: "var(--arc-muted)" }}>{team.description}</p>}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--arc-muted)" }}>
                  <span>Гишүүд: <span style={{ color: "var(--arc-dim)" }}>{team.membersCount ?? team.members?.length ?? 0}</span></span>
                  <Link href={`/editor/teams/${team._id}`} className="rounded-full px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
                    style={{ border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" }}>
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
