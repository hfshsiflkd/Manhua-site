/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  editorAcceptTeamInvite,
  editorCreateTeam,
  editorDeclineTeamInvite,
  editorGetMyTeamInvites,
  editorGetTeams,
  Team,
  TeamInvite,
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

  useEffect(() => {
    let active = true;
    editorGetTeams()
      .then((data) => {
        if (!active) return;
        setTeams(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setTeams([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingInvites(true);
    editorGetMyTeamInvites()
      .then((data) => {
        if (!active) return;
        setInvites(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setInvites([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingInvites(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Багийн нэр оруулна уу.");
      return;
    }
    try {
      setCreating(true);
      setError(null);
      const team = await editorCreateTeam({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setTeams((prev) => [team, ...prev]);
      setName("");
      setDescription("");
      toast.success("Баг үүсгэлээ");
    } catch (e: any) {
      console.error(e);
      const message =
        e?.response?.data?.message || "Баг үүсгэх үед алдаа гарлаа";
      setError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleAccept = async (invite: TeamInvite) => {
    try {
      setWorkingInviteId(invite._id);
      await editorAcceptTeamInvite(invite.team._id, invite._id);
      setInvites((prev) => prev.filter((i) => i._id !== invite._id));
      const data = await editorGetTeams();
      setTeams(Array.isArray(data) ? data : []);
      toast.success("Багийн хүсэлт зөвшөөрөгдлөө");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setWorkingInviteId(null);
    }
  };

  const handleDecline = async (invite: TeamInvite) => {
    try {
      setWorkingInviteId(invite._id);
      await editorDeclineTeamInvite(invite.team._id, invite._id);
      setInvites((prev) => prev.filter((i) => i._id !== invite._id));
      toast.success("Хүсэлт татгалзлаа");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Алдаа гарлаа");
    } finally {
      setWorkingInviteId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6 shadow-xl shadow-black/50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-2xl" />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1">
              Teams
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Зөвхөн таны орсон багууд энд харагдана.
            </p>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-300">
            Нийт:{" "}
            <span className="font-semibold text-slate-100">
              {teams.length}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {isAdmin && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Шинэ баг</h2>
            <span className="text-[11px] text-slate-500">
              Admin эрх шаардлагатай
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr,1fr,auto]">
            <input
              type="text"
              placeholder="Team нэр"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Тайлбар (сонголт)"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 disabled:opacity-60 transition"
            >
              {creating ? "Үүсгэж байна..." : "Баг үүсгэх"}
            </button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Хүсэлтүүд</h2>
          <button
            type="button"
            onClick={() => setShowInvites((v) => !v)}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800"
          >
            {showInvites ? "Хаах" : "Хүсэлтүүдийг харах"}
          </button>
        </div>
        {showInvites && (
          <>
            {loadingInvites ? (
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse"
                  />
                ))}
              </div>
            ) : invites.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                Хүлээгдэж буй багийн хүсэлт алга.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {invites.map((invite) => (
                  <div
                    key={invite._id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                  >
                    <div className="text-sm font-semibold text-slate-100">
                      {invite.team?.name || "Team"}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Урьсан:{" "}
                      <span className="text-slate-200">
                        {invite.invitedBy?.username || "—"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] uppercase text-amber-200">
                        pending
                      </span>
                      <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase text-slate-300">
                        {invite.role}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAccept(invite)}
                        disabled={workingInviteId === invite._id}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                      >
                        Зөвшөөрөх
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecline(invite)}
                        disabled={workingInviteId === invite._id}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                      >
                        Татгалзах
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Миний багууд</h2>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse"
              />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
            Одоогоор таны орсон баг алга.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <div
                key={team._id}
                className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40 transition hover:border-cyan-500/40 hover:bg-slate-900/80"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-100 transition">
                    {team.name}
                  </h3>
                  {team.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {team.description}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Гишүүд:{" "}
                    <span className="text-slate-200">
                      {team.membersCount ?? team.members?.length ?? 0}
                    </span>
                  </span>
                  <Link
                    href={`/editor/teams/${team._id}`}
                    className="rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 transition"
                  >
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
