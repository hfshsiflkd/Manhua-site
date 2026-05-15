"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface User {
  _id: string;
  username: string;
  email: string;
  isVIP: boolean;
  vipExpiresAt?: string;
  avatar?: string | null;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (token: string) => {
    localStorage.setItem("token", token);

    try {
      const res = await api.get("/auth/me");
      const userData = res.data?.user || res.data;
      setUser(userData);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem("token");
      }
      setUser(null);
    }
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
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    api
      .get("/auth/me")
      .then((res) => {
        const userData = res.data?.user || res.data;
        setUser(userData);
      })
      .catch((err: any) => {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          localStorage.removeItem("token");
        }
        setUser(null);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
