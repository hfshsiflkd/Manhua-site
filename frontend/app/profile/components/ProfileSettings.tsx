"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  updateProfile,
  updateEmail,
  updatePassword,
} from "@/lib/api";

export function ProfileSettings() {
  const { user, setUser } = useAuth();
  const [activeSection, setActiveSection] = useState<
    "username" | "email" | "password" | null
  >(null);

  if (!user) return null;

  return (
    <div className="rounded-3xl bg-gradient-to-r from-cyan-500/25 via-fuchsia-500/20 to-slate-800/10 p-[1px] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-4 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Профайл тохиргоо</h3>
          <span className="text-[10px] text-slate-500">Тохиргоогоо шинэчил</span>
        </div>

        <div className="space-y-3">
        {/* Username */}
        <UsernameForm
          currentUsername={user.username}
          isActive={activeSection === "username"}
          onToggle={() =>
            setActiveSection(activeSection === "username" ? null : "username")
          }
          onSuccess={(updatedUser) => {
            setUser(updatedUser);
            setActiveSection(null);
          }}
        />

        {/* Email */}
        <EmailForm
          currentEmail={user.email}
          isActive={activeSection === "email"}
          onToggle={() =>
            setActiveSection(activeSection === "email" ? null : "email")
          }
          onSuccess={(updatedUser) => {
            setUser(updatedUser);
            setActiveSection(null);
          }}
        />

        {/* Password */}
        <PasswordForm
          isActive={activeSection === "password"}
          onToggle={() =>
            setActiveSection(activeSection === "password" ? null : "password")
          }
          onSuccess={() => setActiveSection(null)}
        />
        </div>
      </div>
    </div>
  );
}

function UsernameForm({
  currentUsername,
  isActive,
  onToggle,
  onSuccess,
}: {
  currentUsername: string;
  isActive: boolean;
  onToggle: () => void;
  onSuccess: (user: any) => void;
}) {
  const [username, setUsername] = useState(currentUsername);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username === currentUsername) {
      onToggle();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateProfile(username);
      if (result.success) {
        setSuccess(true);
        onSuccess(result.user);
        setTimeout(() => {
          setSuccess(false);
          onToggle();
        }, 1500);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Хэрэглэгчийн нэр шинэчлэхэд алдаа гарлаа."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isActive) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-cyan-500/20">
        <div>
          <p className="mb-0.5 text-xs text-slate-500">Хэрэглэгчийн нэр</p>
          <p className="text-sm text-slate-200">{currentUsername}</p>
        </div>
        <button
          onClick={onToggle}
          className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25"
        >
          Засах
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3 shadow-inner shadow-black/20"
    >
      <label className="block mb-2">
        <span className="text-xs text-slate-500 mb-1 block">
          Хэрэглэгчийн нэр
        </span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
          placeholder="Хэрэглэгчийн нэр"
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_-]+"
          required
        />
      </label>
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
      {success && (
        <p className="mt-1 text-xs text-green-400">Амжилттай шинэчлэгдлээ</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || username === currentUsername}
          className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Хадгалж байна..." : "Хадгалах"}
        </button>
        <button
          type="button"
          onClick={() => {
            setUsername(currentUsername);
            setError(null);
            onToggle();
          }}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/50 disabled:opacity-50"
        >
          Цуцлах
        </button>
      </div>
    </form>
  );
}

function EmailForm({
  currentEmail,
  isActive,
  onToggle,
  onSuccess,
}: {
  currentEmail: string;
  isActive: boolean;
  onToggle: () => void;
  onSuccess: (user: any) => void;
}) {
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email === currentEmail) {
      onToggle();
      return;
    }

    if (!password) {
      setError("Нууц үг шаардлагатай");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateEmail(email, password);
      if (result.success) {
        setSuccess(true);
        setPassword("");
        onSuccess(result.user);
        setTimeout(() => {
          setSuccess(false);
          onToggle();
        }, 1500);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Имэйл шинэчлэхэд алдаа гарлаа."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isActive) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-cyan-500/20">
        <div>
          <p className="mb-0.5 text-xs text-slate-500">Имэйл</p>
          <p className="text-sm text-slate-200">{currentEmail}</p>
        </div>
        <button
          onClick={onToggle}
          className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25"
        >
          Засах
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3 shadow-inner shadow-black/20"
    >
      <label className="block mb-2">
        <span className="text-xs text-slate-500 mb-1 block">Имэйл</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
          placeholder="Имэйл хаяг"
          required
        />
      </label>
      <label className="block mb-2">
        <span className="text-xs text-slate-500 mb-1 block">
          Нууц үг (баталгаажуулах)
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
          placeholder="Одоогийн нууц үг"
          required
        />
      </label>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {success && (
        <p className="mt-1 text-xs text-green-400">Амжилттай шинэчлэгдлээ</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || email === currentEmail}
          className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Хадгалж байна..." : "Хадгалах"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEmail(currentEmail);
            setPassword("");
            setError(null);
            onToggle();
          }}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/50 disabled:opacity-50"
        >
          Цуцлах
        </button>
      </div>
    </form>
  );
}

function PasswordForm({
  isActive,
  onToggle,
  onSuccess,
}: {
  isActive: boolean;
  onToggle: () => void;
  onSuccess: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Шинэ нууц үг таарахгүй байна");
      return;
    }

    if (newPassword.length < 8) {
      setError("Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байна");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updatePassword(currentPassword, newPassword);
      if (result.success) {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setSuccess(false);
          onToggle();
        }, 1500);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Нууц үг шинэчлэхэд алдаа гарлаа."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isActive) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-cyan-500/20">
        <div>
          <p className="mb-0.5 text-xs text-slate-500">Нууц үг</p>
          <p className="text-sm text-slate-400">••••••••</p>
        </div>
        <button
          onClick={onToggle}
          className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25"
        >
          Солих
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3 shadow-inner shadow-black/20"
    >
      <label className="block mb-2">
        <span className="text-xs text-slate-500 mb-1 block">
          Одоогийн нууц үг
        </span>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
          placeholder="Одоогийн нууц үг"
          required
        />
      </label>
      <label className="block mb-2">
        <span className="text-xs text-slate-500 mb-1 block">Шинэ нууц үг</span>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
          placeholder="Шинэ нууц үг (хамгийн багадаа 8 тэмдэгт)"
          minLength={8}
          required
        />
      </label>
      <label className="block mb-2">
        <span className="text-xs text-slate-500 mb-1 block">
          Шинэ нууц үг давтах
        </span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
          placeholder="Шинэ нууц үг давтах"
          minLength={8}
          required
        />
      </label>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {success && (
        <p className="mt-1 text-xs text-green-400">Амжилттай шинэчлэгдлээ</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Хадгалж байна..." : "Хадгалах"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setError(null);
            onToggle();
          }}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/50 disabled:opacity-50"
        >
          Цуцлах
        </button>
      </div>
    </form>
  );
}

