"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

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

function userFromToken(token: string): User | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const json = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as {
      id?: string;
      username?: string | null;
      email?: string | null;
      isVIP?: boolean;
      vipExpiresAt?: string | null;
      avatar?: string | null;
      role?: string;
    };
    if (!payload.id) return null;
    return {
      _id: payload.id,
      username: payload.username || "",
      email: payload.email || "",
      isVIP: Boolean(payload.isVIP),
      vipExpiresAt: payload.vipExpiresAt || null,
      avatar: payload.avatar || null,
      role: payload.role || "user",
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const login = async (token: string) => {
    localStorage.setItem("token", token);
    const preview = userFromToken(token);
    if (preview) setUser(preview);

    try {
      const res = await api.get("/auth/me");
      const userData = res.data?.user || res.data;
      try {
        const ws = await api.get("/user/workspace");
        setUser({
          ...userData,
          teamMember: Boolean(ws.data?.teamMember),
          canPublishManhua: Boolean(ws.data?.canPublishManhua),
          canCreateTeam: Boolean(ws.data?.canCreateTeam),
        });
      } catch {
        setUser(userData);
      }
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem("token");
        setUser(null);
      }
    } finally {
      setReady(true);
    }
  };

  const applySession = async (token: string, nextUser?: User | null) => {
    localStorage.setItem("token", token);
    if (nextUser) {
      setUser(nextUser);
      setReady(true);
      return;
    }
    await login(token);
  };

  // server-side token-ыг invalidate хийгээд дараа нь local-аас цэвэрлэнэ.
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Network/401 алдаа гарсан ч local cleanup үргэлжилнэ.
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      setReady(true);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setReady(true);
      return;
    }
    const preview = userFromToken(token);
    if (preview) setUser(preview);
    api
      .get("/auth/me")
      .then(async (res) => {
        const userData = res.data?.user || res.data;
        try {
          const ws = await api.get("/user/workspace");
          setUser({
            ...userData,
            teamMember: Boolean(ws.data?.teamMember),
            canPublishManhua: Boolean(ws.data?.canPublishManhua),
          canCreateTeam: Boolean(ws.data?.canCreateTeam),
          });
        } catch {
          setUser(userData);
        }
      })
      .catch((err: any) => {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          localStorage.removeItem("token");
          setUser(null);
        }
      })
      .finally(() => setReady(true));
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, applySession, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
