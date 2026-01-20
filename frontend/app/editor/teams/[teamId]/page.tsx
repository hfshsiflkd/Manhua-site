/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  editorAddTeamMember,
  editorDeleteTeam,
  editorGetTeam,
  editorGetTeamManhuas,
  editorGetTeamInvites,
  editorRemoveTeamMember,
  editorUpdateTeam,
  editorUpdateTeamMember,
  TeamInvite,
  Team,
  TeamRole,
  Manhua,
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

  useEffect(() => {
    if (!teamId) return;
    let active = true;
    setLoading(true);
    editorGetTeam(teamId)
      .then((data) => {
        if (!active) return;
        setTeam(data);
        setName(data.name || "");
        setDescription(data.description || "");
      })
      .catch((e) => {
        if (!active) return;
        console.error(e);
        setError(e?.response?.data?.message || "Team ачаалж чадсангүй");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    let active = true;
    setLoadingManhuas(true);
    editorGetTeamManhuas(teamId)
      .then((data) => {
        if (!active) return;
        setManhuas(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!active) return;
        console.error(e);
        setManhuas([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingManhuas(false);
      });
    return () => {
      active = false;
    };
  }, [teamId]);

  const myRole = useMemo(() => {
    const member = team?.members?.find(
      (m) => m.user?._id && m.user._id === user?._id
    );
    return member?.role || null;
  }, [team?.members, user?._id]);

  const canManage =
    user?.role === "admin" || myRole === "owner" || myRole === "admin";
  const isGlobalAdmin = user?.role === "admin";

  useEffect(() => {
    if (!teamId || !canManage) return;
    let active = true;
    setLoadingInvites(true);
    editorGetTeamInvites(teamId)
      .then((data) => {
        if (!active) return;
        setInvites(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!active) return;
        console.error(e);
        setInvites([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingInvites(false);
      });
    return () => {
      active = false;
    };
  }, [teamId, canManage]);

  const handleSaveTeam = async () => {
    if (!team) return;
    try {
      setSavingTeam(true);
      const updated = await editorUpdateTeam(team._id, {
        name: name.trim(),
        description: description.trim(),
      });
      setTeam(updated);
      toast.success("Багийн мэдээлэл хадгалагдлаа");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Хадгалах үед алдаа гарлаа");
    } finally {
      setSavingTeam(false);
    }
  };

  const handleAddMember = async () => {
    if (!team) return;
    const input = memberInput.trim();
    if (!input) {
      setError("Username эсвэл email оруулна уу.");
      return;
    }
    try {
      setAddingMember(true);
      setError(null);
      const payload = input.includes("@")
        ? { email: input, role: memberRole }
        : { username: input, role: memberRole };
      const res = await editorAddTeamMember(team._id, payload);
      setInvites((prev) => [res.invite, ...prev]);
      setMemberInput("");
      setMemberRole("editor");
      toast.success("Хүсэлт илгээгдлээ");
    } catch (e: any) {
      console.error(e);
      const message =
        e?.response?.data?.message || "Гишүүн нэмэх үед алдаа гарлаа";
      setError(message);
      toast.error(message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleChangeRole = async (userId: string, role: TeamRole) => {
    if (!team) return;
    try {
      setWorkingUserId(userId);
      const updated = await editorUpdateTeamMember(team._id, userId, role);
      setTeam(updated);
      toast.success("Role шинэчлэгдлээ");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Role өөрчлөх үед алдаа гарлаа");
    } finally {
      setWorkingUserId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!team) return;
    const ok = await confirm({
      title: "Гишүүн устгах уу?",
      description: "Энэ гишүүнийг баг-аас хасах уу?",
      confirmText: "Устгах",
      cancelText: "Болих",
    });
    if (!ok) return;
    try {
      setWorkingUserId(userId);
      const updated = await editorRemoveTeamMember(team._id, userId);
      setTeam(updated);
      toast.success("Гишүүн устгагдлаа");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Устгах үед алдаа гарлаа");
    } finally {
      setWorkingUserId(null);
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    const ok = await confirm({
      title: "Баг устгах уу?",
      description: "Энэ үйлдлийг буцаах боломжгүй.",
      confirmText: "Устгах",
      cancelText: "Болих",
    });
    if (!ok) return;
    try {
      await editorDeleteTeam(team._id);
      toast.success("Баг устгагдлаа");
      router.push("/editor/teams");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Устгах үед алдаа гарлаа");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-400">Уншиж байна...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error || "Team олдсонгүй"}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/85 p-5 sm:p-6 shadow-xl shadow-black/50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-500/10 blur-2xl" />
          <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
            {team.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Багийн мэдээлэл болон гишүүдийн тохиргоо
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {isGlobalAdmin && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40 space-y-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Team мэдээлэл
          </h2>
          <div className="grid gap-3 sm:grid-cols-[1fr,1fr]">
            <input
              type="text"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleSaveTeam}
              disabled={savingTeam}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 disabled:opacity-60 transition"
            >
              {savingTeam ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </div>
        </section>
      )}

      {canManage && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">
              Гишүүд нэмэх
            </h2>
            <span className="text-[11px] text-slate-500">
              Role: editor / team admin
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr,140px,auto]">
            <input
              type="text"
              placeholder="username эсвэл email"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
            />
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as TeamRole)}
            >
              <option value="editor">Editor</option>
              <option value="admin">Team admin</option>
            </select>
            <button
              type="button"
              onClick={handleAddMember}
              disabled={addingMember}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition"
            >
              {addingMember ? "Нэмэж байна..." : "Нэмэх"}
            </button>
          </div>
        </section>
      )}

      {canManage && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">
              Хүлээгдэж буй хүсэлт
            </h2>
            <span className="text-xs text-slate-500">
              {invites.filter((i) => i.status === "pending").length}
            </span>
          </div>
          {loadingInvites ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl border border-slate-800 bg-slate-950/60 animate-pulse"
                />
              ))}
            </div>
          ) : invites.filter((i) => i.status === "pending").length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
              Хүлээгдэж буй хүсэлт алга.
            </div>
          ) : (
            <div className="space-y-2">
              {invites
                .filter((i) => i.status === "pending")
                .map((invite) => (
                  <div
                    key={invite._id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-100">
                        {invite.invitedUser?.username || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {invite.invitedUser?.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] uppercase text-amber-200">
                        pending
                      </span>
                      <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase text-slate-300">
                        {invite.role}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Гишүүд</h2>
          <span className="text-xs text-slate-500">
            Нийт {team.members?.length || 0}
          </span>
        </div>
        <div className="space-y-2">
          {(team.members || []).map((member) => (
            <div
              key={member.user._id}
              className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-100">
                  {member.user.username}
                </div>
                <div className="text-xs text-slate-500">
                  {member.user.email}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] uppercase ${
                    member.role === "owner"
                      ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10"
                      : member.role === "admin"
                      ? "border-cyan-500/40 text-cyan-200 bg-cyan-500/10"
                      : "border-slate-700 text-slate-300"
                  }`}
                >
                  {member.role}
                </span>
                {canManage && member.role !== "owner" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleChangeRole(
                          member.user._id,
                          member.role === "admin" ? "editor" : "admin"
                        )
                      }
                      disabled={workingUserId === member.user._id}
                      className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-900 disabled:opacity-60"
                    >
                      {member.role === "admin" ? "Editor болгох" : "Admin болгох"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.user._id)}
                      disabled={workingUserId === member.user._id}
                      className="rounded-lg border border-rose-500/60 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                    >
                      Устгах
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Багийн манхуа
          </h2>
          <span className="text-xs text-slate-500">
            Нийт {manhuas.length}
          </span>
        </div>
        {loadingManhuas ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl border border-slate-800 bg-slate-950/60 animate-pulse"
              />
            ))}
          </div>
        ) : manhuas.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
            Одоогоор багт харьяалагдсан манхуа алга.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {manhuas.map((m) => (
              <div
                key={m._id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex gap-3">
                  <div className="h-16 w-12 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                    <img
                      src={
                        m.coverImageUrl ||
                        m.coverImage ||
                        "https://via.placeholder.com/96x128?text=No+Cover"
                      }
                      alt={m.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100 truncate">
                      {m.title}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Owner:{" "}
                      <span className="text-slate-200">
                        {m.createdBy?.username || "—"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                      <span>
                        Chapters:{" "}
                        <span className="text-slate-200">
                          {m.chapterCount ?? 0}
                        </span>
                      </span>
                      <span>
                        Views:{" "}
                        <span className="text-slate-200">
                          {(m.chapterViews ?? 0).toLocaleString("en-US")}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                {m.status && (
                  <div className="mt-3 text-[10px] uppercase text-slate-500">
                    {m.status}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {isGlobalAdmin && (
        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold">Danger zone</div>
              <div className="text-xs text-rose-200/80">
                Баг устгавал бүх холбоос сална.
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeleteTeam}
              className="rounded-xl border border-rose-500/60 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/20"
            >
              Баг устгах
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
