"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createRecruitmentListing, editorGetTeam, editorGetTeamManhuas, type Manhua, type Team, type TeamMember } from "@/lib/api";
import { SKILL_LABELS, LANGUAGE_LABELS } from "@/lib/creatorLabels";
import { useToast } from "@/app/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";

function memberUserId(member: TeamMember | undefined) {
  const user = member?.user as unknown;
  if (!user) return "";
  if (typeof user === "string") return user;
  if (typeof user === "object" && user && "_id" in user) return String((user as { _id?: string })._id || "");
  return "";
}

const field: React.CSSProperties = {
  width: "100%",
  borderRadius: 9,
  border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)",
  padding: "10px 14px",
  fontSize: 13,
  color: "var(--arc-text)",
  outline: "none",
};

export default function NewRecruitmentPage() {
  const params = useParams();
  const teamId = String(params?.teamId || "");
  const router = useRouter();
  const toast = useToast();
  const { user, ready } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [manhuas, setManhuas] = useState<Manhua[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workRole, setWorkRole] = useState("translation");
  const [compensation, setCompensation] = useState("volunteer");
  const [compensationNote, setCompensationNote] = useState("");
  const [weeklyHoursNote, setWeeklyHoursNote] = useState("");
  const [languages, setLanguages] = useState<string[]>(["mn"]);
  const [manhuaId, setManhuaId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    let active = true;
    setLoadingTeam(true);
    editorGetTeam(teamId)
      .then((data) => {
        if (!active) return;
        setTeam(data);
        setTeamError(null);
      })
      .catch((e: { response?: { data?: { message?: string } } }) => {
        if (!active) return;
        setTeam(null);
        setTeamError(e?.response?.data?.message || "Баг олдсонгүй");
      })
      .finally(() => {
        if (!active) return;
        setLoadingTeam(false);
      });
    return () => {
      active = false;
    };
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    editorGetTeamManhuas(teamId).then((data) => setManhuas(Array.isArray(data) ? data : [])).catch(() => setManhuas([]));
  }, [teamId]);

  const myRole = team?.members?.find((m) => memberUserId(m) === user?._id)?.role;
  const canManage = user?.role === "admin" || myRole === "owner" || myRole === "admin";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createRecruitmentListing({
        title,
        teamId,
        manhuaId: manhuaId || undefined,
        workRole,
        description,
        languages,
        skills: [workRole],
        weeklyHoursNote: weeklyHoursNote || undefined,
        compensation,
        compensationNote: compensation === "paid" || compensationNote ? compensationNote : undefined,
        expiresInDays,
        status: "open",
      });
      toast.success("Зар нийтлэлээ");
      router.push(`/editor/teams/${teamId}/recruitment`);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      toast.error(ax?.response?.data?.message || "Үүсгэж чадсангүй");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || loadingTeam) {
    return <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Ачааллаж байна...</p>;
  }

  if (teamError || !team) {
    return (
      <div className="space-y-3">
        <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>{teamError || "Баггүй тул зар үүсгэхгүй. Зар үүсгэхэд автоматаар баг үүсэхгүй. Баг үүсгэх нь зөвхөн сайт admin-ийн эрх."}</p>
        <Link href="/editor/teams" className="text-[12px]" style={{ color: "var(--arc-cyan)" }}>Багийн хуудас</Link>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-3">
        <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>Зар үүсгэхийн тулд багийн owner/admin эрх хэрэгтэй.</p>
        <Link href="/editor/teams" className="text-[12px]" style={{ color: "var(--arc-cyan)" }}>Багууд руу очих</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-xl">
      <h1 className="text-xl font-bold" style={{ color: "var(--arc-text)" }}>Хүн хайх зар</h1>
      <input required minLength={5} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Гарчиг" style={field} />
      <select value={teamId} disabled style={field}>
        <option>{team.name || teamId}</option>
      </select>
      <select value={manhuaId} onChange={(e) => setManhuaId(e.target.value)} style={field}>
        <option value="">Манхва (сонголт)</option>
        {manhuas.map((m) => (
          <option key={m._id} value={m._id}>{m.title}</option>
        ))}
      </select>
      <select value={workRole} onChange={(e) => setWorkRole(e.target.value)} style={field}>
        {Object.entries(SKILL_LABELS).map(([id, label]) => (
          <option key={id} value={id}>{label}</option>
        ))}
      </select>
      <textarea required minLength={50} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Тайлбар 50–2000" style={{ ...field, minHeight: 120 }} />
      <div className="flex flex-wrap gap-2">
        {Object.entries(LANGUAGE_LABELS).map(([id, label]) => (
          <label key={id} className="text-[12px]" style={{ color: "var(--arc-dim)" }}>
            <input type="checkbox" checked={languages.includes(id)} onChange={(e) => setLanguages((prev) => e.target.checked ? [...prev, id] : prev.filter((x) => x !== id))} /> {label}
          </label>
        ))}
      </div>
      <input maxLength={80} value={weeklyHoursNote} onChange={(e) => setWeeklyHoursNote(e.target.value)} placeholder="Долоо хоногийн цаг (сонголт)" style={field} />
      <select value={compensation} onChange={(e) => setCompensation(e.target.value)} style={field}>
        <option value="volunteer">Сайн дурын</option>
        <option value="paid">Төлбөртэй</option>
        <option value="negotiable">Тохиролцоно</option>
      </select>
      {(compensation === "paid" || compensation === "negotiable") && (
        <input value={compensationNote} onChange={(e) => setCompensationNote(e.target.value)} placeholder="Нөхцөлийн тайлбар" style={field} />
      )}
      <input type="number" min={1} max={90} value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} style={field} />
      <p className="text-[11px]" style={{ color: "var(--arc-muted)" }}>Нөхцөлийг баг нийтэлнэ. Төлбөр шилжүүлэлт энэ сайтаар хийгдэхгүй.</p>
      <button type="submit" disabled={submitting} className="rounded-[9px] px-4 py-2 text-[12px] font-semibold" style={{ background: "oklch(0.75 0.17 145)", color: "#07070e" }}>
        {submitting ? "Нийтэлж байна..." : "Нийтлэх"}
      </button>
    </form>
  );
}
