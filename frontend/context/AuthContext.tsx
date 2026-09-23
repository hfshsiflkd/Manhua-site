"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import { isProtectedAppPath, sessionBridgeMarker, shouldReloadAfterBridge, type PageFlags } from "@/lib/pageAccess";

interface User {
  _id: string;
  username: string;
  email: string;
  isVIP: boolean;
  vipExpiresAt?: string | null;
  avatar?: string | null;
  role?: string;
  teamMember?: boolean;
  canPublishManhua?: boolean;
  canCreateTeam?: boolean;
}

interface AuthContextType {
  user: User | null;
  ready: boolean;
  login: (token: string) => Promise<void>;
  applySession: (token: string, nextUser?: User | null) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  ready: false,
  login: async () => {},
  applySession: async () => {},
  logout: async () => {},
  setUser: () => {},
});

async function establishSessionCookie(token: string): Promise<{ ok: boolean; pages?: PageFlags; unavailable?: boolean }> {
  try {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ token, deviceId: getOrCreateDeviceId() }),
    });
    if (res.status === 503) return { ok: false, unavailable: true };
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { pages?: PageFlags };
    return { ok: true, pages: data.pages };
  } catch {
    return { ok: false, unavailable: true };
  }
}

async function clearSessionCookie() {
  try {
    await fetch("/api/session", { method: "DELETE", credentials: "same-origin" });
  } catch {
    // local cleanup continues
  }
}

function mergeWorkspace(userData: User, ws?: { role?: string; teamMember?: boolean; canPublishManhua?: boolean; canCreateTeam?: boolean } | null): User {
  return {
    ...userData,
    role: ws?.role || userData.role,
    teamMember: Boolean(ws?.teamMember),
    canPublishManhua: Boolean(ws?.canPublishManhua),
    canCreateTeam: Boolean(ws?.canCreateTeam),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const hydrate = async (token: string) => {
    const bridged = await establishSessionCookie(token);
    if (!bridged.ok && !bridged.unavailable) {
      localStorage.removeItem("token");
      await clearSessionCookie();
      if (typeof window !== "undefined") sessionStorage.removeItem("arc_session_bridged");
      setUser(null);
      return;
    }

    try {
      const res = await api.get("/auth/me");
      const userData = (res.data?.user || res.data) as User;
      try {
        const ws = await api.get("/user/workspace");
        setUser(mergeWorkspace(userData, ws.data));
      } catch {
        setUser(mergeWorkspace(userData, null));
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403 || status === 423) {
        localStorage.removeItem("token");
        await clearSessionCookie();
        if (typeof window !== "undefined") sessionStorage.removeItem("arc_session_bridged");
        setUser(null);
        return;
      }
    }

    if (typeof window !== "undefined" && bridged.ok && bridged.pages) {
      const marker = sessionBridgeMarker(token);
      const alreadyBridged = sessionStorage.getItem("arc_session_bridged") === marker;
      sessionStorage.setItem("arc_session_bridged", marker);
      const path = window.location.pathname;
      if (shouldReloadAfterBridge({ alreadyBridged, pathname: path, pages: bridged.pages })) {
        window.location.replace(path + window.location.search);
        return;
      }
    }
  };

  const login = async (token: string) => {
    localStorage.setItem("token", token);
    try {
      await hydrate(token);
    } finally {
      setReady(true);
    }
  };

  const applySession = async (token: string, _nextUser?: User | null) => {
    await login(token);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Network/401 алдаа гарсан ч local cleanup үргэлжилнэ.
    } finally {
      localStorage.removeItem("token");
      await clearSessionCookie();
      setUser(null);
      setReady(true);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("arc_session_bridged");
        if (isProtectedAppPath(window.location.pathname)) {
          window.location.replace("/");
        }
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setReady(true);
      return;
    }
    hydrate(token).finally(() => setReady(true));
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, applySession, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
