/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  editorAddTeamMember, editorDeleteTeam, editorGetTeam, editorGetTeamManhuas,
  editorGetTeamInvites, editorRemoveTeamMember, editorUpdateTeam, editorUpdateTeamMember,
  TeamInvite, Team, TeamRole, Manhua,
} from "@/lib/api";
import { useConfirm } from "@/app/components/ConfirmProvider";
import { useToast } from "@/app/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";

export default function EditorTeamDetailPage() {
  const params = useParams();
  const teamId = params?.teamId as string;
  const router = useRouter();
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [memberRole, setMemberRole] = useState<TeamRole>("editor");
  const [addingMember, setAddingMember] = useState(false);
  const [workingUserId, setWorkingUserId] = useState<string | null>(null);
  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [loadingManhuas, setLoadingManhuas] = useState(false);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const fieldStyle: React.CSSProperties = { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)", borderRadius: 9, padding: "10px 16px", fontSize: 13, outline: "none", width: "100%" };
  const btnBase: React.CSSProperties = { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" };

  useEffect(() => {
    if (!teamId) return;
    let active = true;
    setLoading(true);
    editorGetTeam(teamId).then((data) => { if (!active) return; setTeam(data); setName(data.name || ""); setDescription(data.description || ""); })
      .catch((e) => { if (!active) return; setError(e?.response?.data?.message || "Team ачаалж чадсангүй"); })
      .finally(() => { if (!active) return; setLoading(false); });
    return () => { active = false; };
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    let active = true;
    setLoadingManhuas(true);
    editorGetTeamManhuas(teamId).then((data) => { if (!active) return; setManhuas(Array.isArray(data) ? data : []); })
      .catch(() => { if (!active) return; setManhuas([]); })
      .finally(() => { if (!active) return; setLoadingManhuas(false); });
    return () => { active = false; };
  }, [teamId]);

  const myRole = useMemo(() => team?.members?.find((m) => m.user?._id === user?._id)?.role || null, [team?.members, user?._id]);
  const canManage = user?.role === "admin" || myRole === "owner" || myRole === "admin";
  const isGlobalAdmin = user?.role === "admin";

  useEffect(() => {
    if (!teamId || !canManage) return;
    let active = true;
    setLoadingInvites(true);
    editorGetTeamInvites(teamId).then((data) => { if (!active) return; setInvites(Array.isArray(data) ? data : []); })
      .catch(() => { if (!active) return; setInvites([]); })
      .finally(() => { if (!active) return; setLoadingInvites(false); });
    return () => { active = false; };
  }, [teamId, canManage]);

  const handleSaveTeam = async () => {
    if (!team) return;
    try {
      setSavingTeam(true);
      const updated = await editorUpdateTeam(team._id, { name: name.trim(), description: description.trim() });
      setTeam(updated); toast.success("Багийн мэдээлэл хадгалагдлаа");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Хадгалах үед алдаа гарлаа"); }
    finally { setSavingTeam(false); }
  };

  const handleAddMember = async () => {
    if (!team) return;
    const input = memberInput.trim();
    if (!input) { setError("Username эсвэл email оруулна уу."); return; }
    try {
      setAddingMember(true); setError(null);
      const payload = input.includes("@") ? { email: input, role: memberRole } : { username: input, role: memberRole };
      const res = await editorAddTeamMember(team._id, payload);
      setInvites((prev) => [res.invite, ...prev]);
      setMemberInput(""); setMemberRole("editor");
      toast.success("Хүсэлт илгээгдлээ");
    } catch (e: any) { const m = e?.response?.data?.message || "Гишүүн нэмэх үед алдаа гарлаа"; setError(m); toast.error(m); }
    finally { setAddingMember(false); }
  };

  const handleChangeRole = async (userId: string, role: TeamRole) => {
    if (!team) return;
    try {
      setWorkingUserId(userId);
      const updated = await editorUpdateTeamMember(team._id, userId, role);
      setTeam(updated); toast.success("Role шинэчлэгдлээ");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Role өөрчлөх үед алдаа гарлаа"); }
    finally { setWorkingUserId(null); }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!team) return;
    const ok = await confirm({ title: "Гишүүн устгах уу?", description: "Энэ гишүүнийг баг-аас хасах уу?", confirmText: "Устгах", cancelText: "Болих" });
    if (!ok) return;
    try {
      setWorkingUserId(userId);
      const updated = await editorRemoveTeamMember(team._id, userId);
      setTeam(updated); toast.success("Гишүүн устгагдлаа");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Устгах үед алдаа гарлаа"); }
    finally { setWorkingUserId(null); }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    const ok = await confirm({ title: "Баг устгах уу?", description: "Энэ үйлдлийг буцаах боломжгүй.", confirmText: "Устгах", cancelText: "Болих" });
    if (!ok) return;
    try {
      await editorDeleteTeam(team._id); toast.success("Баг устгагдлаа"); router.push("/editor/teams");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Устгах үед алдаа гарлаа"); }
  };

  const roleStyle = (role: string): React.CSSProperties => {
    if (role === "owner") return { border: "1px solid oklch(0.75 0.17 145/.4)", background: "oklch(0.75 0.17 145/.08)", color: "oklch(0.8 0.14 145)" };
    if (role === "admin") return { border: "1px solid oklch(0.72 0.17 195/.4)", background: "oklch(0.72 0.17 195/.08)", color: "var(--arc-cyan)" };
    return { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" };
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-sm" style={{ color: "var(--arc-muted)" }}>Уншиж байна...</div>;
  if (!team) return (
    <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
      {error || "Team олдсонгүй"}
    </div>
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="rounded-[14px] p-5 sm:p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--arc-text)" }}>{team.name}</h1>
        <p className="text-xs sm:text-sm" style={{ color: "var(--arc-muted)" }}>Багийн мэдээлэл болон гишүүдийн тохиргоо</p>
      </div>

      {error && (
        <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>{error}</div>
      )}

      {isGlobalAdmin && (
        <section className="rounded-[14px] p-4 sm:p-6 space-y-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--arc-text)" }}>Team мэдээлэл</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="text" style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} />
            <input type="text" style={fieldStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleSaveTeam} disabled={savingTeam}
              className="rounded-[9px] px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
              {savingTeam ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </div>
        </section>
      )}

      {canManage && (
        <section className="rounded-[14px] p-4 sm:p-6 space-y-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: "var(--arc-text)" }}>Гишүүд нэмэх</h2>
            <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Role: editor / team admin</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr,140px,auto]">
            <input type="text" placeholder="username эсвэл email" style={fieldStyle} value={memberInput} onChange={(e) => setMemberInput(e.target.value)} />
            <select style={fieldStyle} value={memberRole} onChange={(e) => setMemberRole(e.target.value as TeamRole)}>
              <option value="editor">Editor</option>
              <option value="admin">Team admin</option>
            </select>
            <button type="button" onClick={handleAddMember} disabled={addingMember}
              className="rounded-[9px] px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: "var(--arc-cyan)", color: "#07070e" }}>
              {addingMember ? "Нэмэж байна..." : "Нэмэх"}
            </button>
          </div>
        </section>
      )}

      {canManage && (
        <section className="rounded-[14px] p-4 sm:p-6 space-y-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: "var(--arc-text)" }}>Хүлээгдэж буй хүсэлт</h2>
            <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{invites.filter((i) => i.status === "pending").length}</span>
          </div>
          {loadingInvites ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-12 rounded-[9px] animate-pulse" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }} />)}
            </div>
          ) : invites.filter((i) => i.status === "pending").length === 0 ? (
            <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-muted)" }}>Хүлээгдэж буй хүсэлт алга.</div>
          ) : (
            <div className="space-y-2">
              {invites.filter((i) => i.status === "pending").map((invite) => (
                <div key={invite._id} className="flex flex-col gap-2 rounded-[9px] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium" style={{ color: "var(--arc-text)" }}>{invite.invitedUser?.username || "—"}</div>
                    <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{invite.invitedUser?.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2 py-1 text-[10px] uppercase" style={{ border: "1px solid oklch(0.82 0.18 75/.4)", background: "oklch(0.82 0.18 75/.08)", color: "var(--arc-amber)" }}>pending</span>
                    <span className="rounded-full px-2 py-1 text-[10px] uppercase" style={btnBase}>{invite.role}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-[14px] p-4 sm:p-6 space-y-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--arc-text)" }}>Гишүүд</h2>
          <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Нийт {team.members?.length || 0}</span>
        </div>
        <div className="space-y-2">
          {(team.members || []).map((member) => (
            <div key={member.user._id} className="flex flex-col gap-2 rounded-[9px] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
              <div className="min-w-0">
                <div className="text-sm font-medium" style={{ color: "var(--arc-text)" }}>{member.user.username}</div>
                <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{member.user.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-2 py-1 text-[10px] uppercase" style={roleStyle(member.role)}>{member.role}</span>
                {canManage && member.role !== "owner" && (
                  <>
                    <button type="button" onClick={() => handleChangeRole(member.user._id, member.role === "admin" ? "editor" : "admin")} disabled={workingUserId === member.user._id}
                      className="rounded-[7px] px-2.5 py-1 text-[11px] transition-opacity hover:opacity-80 disabled:opacity-60" style={btnBase}>
                      {member.role === "admin" ? "Editor болгох" : "Admin болгох"}
                    </button>
                    <button type="button" onClick={() => handleRemoveMember(member.user._id)} disabled={workingUserId === member.user._id}
                      className="rounded-[7px] px-2.5 py-1 text-[11px] transition-opacity hover:opacity-80 disabled:opacity-60"
                      style={{ border: "1px solid oklch(0.65 0.22 15/.4)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
                      Устгах
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[14px] p-4 sm:p-6 space-y-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--arc-text)" }}>Багийн манхуа</h2>
          <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Нийт {manhuas.length}</span>
        </div>
        {loadingManhuas ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-[9px] animate-pulse" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }} />)}
          </div>
        ) : manhuas.length === 0 ? (
          <div className="rounded-[9px] px-4 py-3 text-sm" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-muted)" }}>Одоогоор багт харьяалагдсан манхуа алга.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {manhuas.map((m) => (
              <div key={m._id} className="rounded-[9px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <div className="h-16 w-12 overflow-hidden rounded-[7px]" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                    <img src={m.coverImageUrl || m.coverImage || "https://via.placeholder.com/96x128?text=No+Cover"} alt={m.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--arc-text)" }}>{m.title}</div>
                    <div className="mt-1 text-[11px]" style={{ color: "var(--arc-muted)" }}>Owner: <span style={{ color: "var(--arc-dim)" }}>{m.createdBy?.username || "—"}</span></div>
                    <div className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: "var(--arc-muted)" }}>
                      <span>Chapters: <span style={{ color: "var(--arc-dim)" }}>{m.chapterCount ?? 0}</span></span>
                      <span>Views: <span style={{ color: "var(--arc-dim)" }}>{(m.chapterViews ?? 0).toLocaleString("en-US")}</span></span>
                    </div>
                  </div>
                </div>
                {m.status && <div className="mt-3 text-[10px] uppercase" style={{ color: "var(--arc-muted)" }}>{m.status}</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      {isGlobalAdmin && (
        <section className="rounded-[14px] p-4 text-sm" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.06)" }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold" style={{ color: "oklch(0.85 0.12 15)" }}>Danger zone</div>
              <div className="text-xs" style={{ color: "oklch(0.75 0.1 15)" }}>Баг устгавал бүх холбоос сална.</div>
            </div>
            <button type="button" onClick={handleDeleteTeam}
              className="rounded-[9px] px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ border: "1px solid oklch(0.65 0.22 15/.4)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
              Баг устгах
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
