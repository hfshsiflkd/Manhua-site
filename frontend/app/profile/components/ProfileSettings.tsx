"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateProfile, updateEmail, updatePassword } from "@/lib/api";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 9,
  border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)",
  padding: "9px 14px",
  fontSize: 13,
  color: "var(--arc-text)",
  outline: "none",
};

export function ProfileSettings() {
  const { user, setUser } = useAuth();
  const [activeSection, setActiveSection] = useState<"username" | "email" | "password" | null>(null);

  if (!user) return null;

  return (
    <div
      className="rounded-[14px] p-4"
      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-cyan)", boxShadow: "0 0 8px var(--arc-cyan-glow)" }} />
          <h3 className="text-[13px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Профайл тохиргоо</h3>
        </div>
        <span className="text-[10px]" style={{ color: "var(--arc-muted)" }}>Тохиргоогоо шинэчил</span>
      </div>

      <div className="space-y-2">
        <UsernameForm
          currentUsername={user.username}
          isActive={activeSection === "username"}
          onToggle={() => setActiveSection(activeSection === "username" ? null : "username")}
          onSuccess={(updatedUser) => { setUser(updatedUser); setActiveSection(null); }}
        />
        <EmailForm
          currentEmail={user.email}
          isActive={activeSection === "email"}
          onToggle={() => setActiveSection(activeSection === "email" ? null : "email")}
          onSuccess={(updatedUser) => { setUser(updatedUser); setActiveSection(null); }}
        />
        <PasswordForm
          isActive={activeSection === "password"}
          onToggle={() => setActiveSection(activeSection === "password" ? null : "password")}
          onSuccess={() => setActiveSection(null)}
        />
      </div>
    </div>
  );
}

function RowDisplay({ label, value, onEdit, editLabel = "Засах" }: { label: string; value: string; onEdit: () => void; editLabel?: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-[9px] px-3 py-2.5 transition-all hover:-translate-y-0.5"
      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
    >
      <div>
        <p className="text-[11px] mb-0.5" style={{ color: "var(--arc-muted)" }}>{label}</p>
        <p className="text-[13px]" style={{ color: "var(--arc-text)" }}>{value}</p>
      </div>
      <button
        onClick={onEdit}
        className="rounded-[7px] px-3 py-1 text-[11px] font-semibold"
        style={{ background: "var(--arc-cyan-dim)", color: "var(--arc-cyan)", border: "1px solid oklch(0.72 0.17 195/.2)", cursor: "pointer" }}
      >
        {editLabel}
      </button>
    </div>
  );
}

function FormShell({ onSubmit, children }: { onSubmit: (e: React.FormEvent) => void; children: React.ReactNode }) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[9px] px-3 py-3 space-y-2"
      style={{ border: "1px solid var(--arc-border-h)", background: "var(--arc-elevated)" }}
    >
      {children}
    </form>
  );
}

function FormActions({ isSubmitting, onCancel }: { isSubmitting: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-2 mt-1">
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-[7px] px-4 py-1.5 text-[12px] font-semibold disabled:opacity-50"
        style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}
      >
        {isSubmitting ? "Хадгалж байна..." : "Хадгалах"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="rounded-[7px] px-4 py-1.5 text-[12px] font-medium disabled:opacity-50"
        style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}
      >
        Цуцлах
      </button>
    </div>
  );
}

function UsernameForm({ currentUsername, isActive, onToggle, onSuccess }: {
  currentUsername: string; isActive: boolean; onToggle: () => void; onSuccess: (user: any) => void;
}) {
  const [username, setUsername] = useState(currentUsername);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username === currentUsername) { onToggle(); return; }
    setIsSubmitting(true); setError(null); setSuccess(false);
    try {
      const result = await updateProfile(username);
      if (result.success) {
        setSuccess(true);
        onSuccess(result.user);
        setTimeout(() => { setSuccess(false); onToggle(); }, 1500);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Хэрэглэгчийн нэр шинэчлэхэд алдаа гарлаа.");
    } finally { setIsSubmitting(false); }
  };

  if (!isActive) return <RowDisplay label="Хэрэглэгчийн нэр" value={currentUsername} onEdit={onToggle} />;

  return (
    <FormShell onSubmit={handleSubmit}>
      <label>
        <span className="text-[11px] mb-1 block" style={{ color: "var(--arc-muted)" }}>Хэрэглэгчийн нэр</span>
        <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={isSubmitting}
          style={fieldStyle} placeholder="Хэрэглэгчийн нэр" minLength={3} maxLength={30} pattern="[a-zA-Z0-9_-]+" required />
      </label>
      {error && <p className="text-[11px]" style={{ color: "oklch(0.75 0.18 15)" }}>{error}</p>}
      {success && <p className="text-[11px]" style={{ color: "oklch(0.75 0.16 145)" }}>Амжилттай шинэчлэгдлээ</p>}
      <FormActions isSubmitting={isSubmitting} onCancel={() => { setUsername(currentUsername); setError(null); onToggle(); }} />
    </FormShell>
  );
}

function EmailForm({ currentEmail, isActive, onToggle, onSuccess }: {
  currentEmail: string; isActive: boolean; onToggle: () => void; onSuccess: (user: any) => void;
}) {
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email === currentEmail) { onToggle(); return; }
    if (!password) { setError("Нууц үг шаардлагатай"); return; }
    setIsSubmitting(true); setError(null); setSuccess(false);
    try {
      const result = await updateEmail(email, password);
      if (result.success) {
        setSuccess(true); setPassword("");
        onSuccess(result.user);
        setTimeout(() => { setSuccess(false); onToggle(); }, 1500);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Имэйл шинэчлэхэд алдаа гарлаа.");
    } finally { setIsSubmitting(false); }
  };

  if (!isActive) return <RowDisplay label="Имэйл" value={currentEmail} onEdit={onToggle} />;

  return (
    <FormShell onSubmit={handleSubmit}>
      <label>
        <span className="text-[11px] mb-1 block" style={{ color: "var(--arc-muted)" }}>Имэйл</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting}
          style={fieldStyle} placeholder="Имэйл хаяг" required />
      </label>
      <label>
        <span className="text-[11px] mb-1 block" style={{ color: "var(--arc-muted)" }}>Нууц үг (баталгаажуулах)</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting}
          style={fieldStyle} placeholder="Одоогийн нууц үг" required />
      </label>
      {error && <p className="text-[11px]" style={{ color: "oklch(0.75 0.18 15)" }}>{error}</p>}
      {success && <p className="text-[11px]" style={{ color: "oklch(0.75 0.16 145)" }}>Амжилттай шинэчлэгдлээ</p>}
      <FormActions isSubmitting={isSubmitting} onCancel={() => { setEmail(currentEmail); setPassword(""); setError(null); onToggle(); }} />
    </FormShell>
  );
}

function PasswordForm({ isActive, onToggle, onSuccess }: {
  isActive: boolean; onToggle: () => void; onSuccess: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError("Шинэ нууц үг таарахгүй байна"); return; }
    if (newPassword.length < 8) { setError("Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байна"); return; }
    setIsSubmitting(true); setError(null); setSuccess(false);
    try {
      const result = await updatePassword(currentPassword, newPassword);
      if (result.success) {
        setSuccess(true);
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        setTimeout(() => { setSuccess(false); onToggle(); }, 1500);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Нууц үг шинэчлэхэд алдаа гарлаа.");
    } finally { setIsSubmitting(false); }
  };

  if (!isActive) return <RowDisplay label="Нууц үг" value="••••••••" onEdit={onToggle} editLabel="Солих" />;

  return (
    <FormShell onSubmit={handleSubmit}>
      <label>
        <span className="text-[11px] mb-1 block" style={{ color: "var(--arc-muted)" }}>Одоогийн нууц үг</span>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isSubmitting}
          style={fieldStyle} placeholder="Одоогийн нууц үг" required />
      </label>
      <label>
        <span className="text-[11px] mb-1 block" style={{ color: "var(--arc-muted)" }}>Шинэ нууц үг</span>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isSubmitting}
          style={fieldStyle} placeholder="Шинэ нууц үг (хамгийн багадаа 8 тэмдэгт)" minLength={8} required />
      </label>
      <label>
        <span className="text-[11px] mb-1 block" style={{ color: "var(--arc-muted)" }}>Шинэ нууц үг давтах</span>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isSubmitting}
          style={fieldStyle} placeholder="Шинэ нууц үг давтах" minLength={8} required />
      </label>
      {error && <p className="text-[11px]" style={{ color: "oklch(0.75 0.18 15)" }}>{error}</p>}
      {success && <p className="text-[11px]" style={{ color: "oklch(0.75 0.16 145)" }}>Амжилттай шинэчлэгдлээ</p>}
      <FormActions isSubmitting={isSubmitting} onCancel={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setError(null); onToggle(); }} />
    </FormShell>
  );
}
