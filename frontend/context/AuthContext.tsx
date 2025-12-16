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
  logout: () => void;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // LOGIN FUNCTION
  const login = async (token: string) => {
    localStorage.setItem("token", token);

    try {
      const res = await api.get("/auth/me");
      // Backend returns { success: true, user: {...} }
      const userData = res.data?.user || res.data;
      setUser(userData);
    } catch (err: any) {
      console.error("Failed to fetch user after login:", err);
      // If 401/403, token is invalid - clear it
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem("token");
      }
      setUser(null);
    }
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  // INITIAL LOAD
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    api
      .get("/auth/me")
      .then((res) => {
        // Backend returns { success: true, user: {...} }
        const userData = res.data?.user || res.data;
        setUser(userData);
      })
      .catch((err: any) => {
        console.error("Failed to fetch user on initial load:", err);
        // If 401/403, token is invalid - clear it
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
