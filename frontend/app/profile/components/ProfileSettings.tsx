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
    <div className="pt-6 pb-4">
      <h3 className="mb-4 text-sm font-medium text-slate-400">Профайл тохиргоо</h3>

      <div className="space-y-4">
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
      <div className="flex items-center justify-between py-2 border-b border-slate-800/30">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Хэрэглэгчийн нэр</p>
          <p className="text-sm text-slate-200">{currentUsername}</p>
        </div>
        <button
          onClick={onToggle}
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          Засах
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="py-2 border-b border-slate-800/30">
      <label className="block mb-2">
        <span className="text-xs text-slate-500 mb-1 block">
          Хэрэглэгчийн нэр
        </span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
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
      <div className="flex gap-2 mt-3">
        <button
          type="submit"
          disabled={isSubmitting || username === currentUsername}
          className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="flex items-center justify-between py-2 border-b border-slate-800/30">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Имэйл</p>
          <p className="text-sm text-slate-200">{currentEmail}</p>
        </div>
        <button
          onClick={onToggle}
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          Засах
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="py-2 border-b border-slate-800/30">
      <label className="block mb-2">
        <span className="text-xs text-slate-500 mb-1 block">Имэйл</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
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
          className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          placeholder="Одоогийн нууц үг"
          required
        />
      </label>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {success && (
        <p className="mt-1 text-xs text-green-400">Амжилттай шинэчлэгдлээ</p>
      )}
      <div className="flex gap-2 mt-3">
        <button
          type="submit"
          disabled={isSubmitting || email === currentEmail}
          className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="flex items-center justify-between py-2 border-b border-slate-800/30">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Нууц үг</p>
          <p className="text-sm text-slate-400">••••••••</p>
        </div>
        <button
          onClick={onToggle}
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          Солих
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="py-2 border-b border-slate-800/30">
      <label className="block mb-2">
        <span className="text-xs text-slate-500 mb-1 block">
          Одоогийн нууц үг
        </span>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
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
          className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
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
          className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          placeholder="Шинэ нууц үг давтах"
          minLength={8}
          required
        />
      </label>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {success && (
        <p className="mt-1 text-xs text-green-400">Амжилттай шинэчлэгдлээ</p>
      )}
      <div className="flex gap-2 mt-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
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

