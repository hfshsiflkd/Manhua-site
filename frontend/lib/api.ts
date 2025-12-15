/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/api.ts
import axios from "axios";
import type { Chapter } from "@/types/manhua";
import { getOrCreateDeviceId } from "@/lib/deviceId";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL!;

export const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  // Axios v1: headers нь AxiosHeaders байж болно
  const headers: any = config.headers ?? (config.headers = {} as any);

  if (typeof window !== "undefined") {
    // device id
    const key = "device_id";
    let deviceId = localStorage.getItem(key);
    if (!deviceId) {
      deviceId =
        (crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(16).slice(2)}`) + "";
      localStorage.setItem(key, deviceId);
    }

    // ✅ хамгийн найдвартай setter
    if (headers.set) headers.set("x-device-id", deviceId);
    else headers["x-device-id"] = deviceId;

    const token = localStorage.getItem("token");
    if (token) {
      if (headers.set) headers.set("Authorization", `Bearer ${token}`);
      else headers.Authorization = `Bearer ${token}`;
    }
  }

  // login дээр auth-г хүчээр авч хаяна
  const url = config.url || "";
  if (url.includes("/auth/login") || url.includes("/auth/register")) {
    if (headers.set) headers.set("Authorization", "");
    delete headers.Authorization;
    delete headers.authorization;
  }

  return config;
});

// Response interceptor to handle 401/403/423 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 423 Locked - emit custom event for lock modal
    if (error?.response?.status === 423) {
      if (typeof window !== "undefined") {
        const lockData = error?.response?.data;
        window.dispatchEvent(
          new CustomEvent("user-locked", {
            detail: {
              code: lockData?.code || "LOCKED",
              lockUntil: lockData?.lockUntil,
              remainingSeconds: lockData?.remainingSeconds,
              reason: lockData?.reason,
              devicePolicy: lockData?.devicePolicy,
            },
          })
        );
      }
    }

    // Handle 401/403 - token expired or invalid
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      // Only clear token and redirect if we're in browser
      if (typeof window !== "undefined") {
        const isAuthEndpoint = error?.config?.url?.includes("/auth/");
        
        // Don't clear token on login/register endpoints (they return 401 for invalid credentials)
        if (!isAuthEndpoint) {
          console.warn("Authentication failed, clearing token");
          localStorage.removeItem("token");
          
          // Only redirect if not already on login page
          if (!window.location.pathname.includes("/login")) {
            // Use setTimeout to avoid navigation during render
            setTimeout(() => {
              window.location.href = "/login";
            }, 100);
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export type UserRole = "user" | "translator" | "admin";

export type TrialSettings = {
  enabled: boolean;
  days: number;
};

export async function adminGetTrialSettings() {
  const res = await api.get<TrialSettings>("/admin/trial");
  return res.data;
}

export async function adminUpdateTrialSettings(
  payload: Partial<TrialSettings>
) {
  const res = await api.put<TrialSettings>("/admin/trial", payload);
  return res.data;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  vipExpiresAt?: string; // VIP дуусах огноо
  hasUsedTrial?: boolean;
  trialGrantedAt?: string;
}

export interface ActionLog {
  _id: string;
  user: {
    _id: string;
    username: string;
    email: string;
    role: UserRole;
  };
  action: string;
  targetType: string;
  targetId?: string;
  description?: string;
  createdAt: string;
}

// 🔥 Manhua type – admin-д эзэнтэй нь харуулахын тулд createdBy нэмлээ
export interface Manhua {
  _id: string;
  title: string;
  slug?: string;
  description?: string;
  coverImage?: string;
  coverImageUrl?: string;
  status?: string;
  genres?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    _id: string;
    username: string;
    email?: string;
    role?: string;
  };
  rating: number;
}

// Auth
export async function loginApi(identifier: string, password: string) {
  const deviceId = getOrCreateDeviceId();
  const res = await api.post("/auth/login", {
    emailOrUsername: identifier,
    password,
    deviceId, // ✅ body дээр явууллаа
  });
  return res.data;
}

// Admin API
export async function adminGetUsers(q?: string, role?: UserRole) {
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (role) params.role = role;

  const res = await api.get<User[]>("/admin/users", { params });
  return res.data;
}

export async function adminCreateUser(payload: {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  const res = await api.post<User>("/admin/users", payload);
  return res.data;
}

export async function adminUpdateUser(
  id: string,
  payload: Partial<Pick<User, "username" | "email" | "role" | "isActive">>
) {
  const res = await api.patch<User>(`/admin/users/${id}`, payload);
  return res.data;
}

export async function adminExtendVip(id: string, months = 1) {
  const res = await api.patch<User>(`/admin/users/${id}/vip`, { months });
  return res.data;
}

export async function adminGetLogs(params?: {
  userId?: string;
  action?: string;
  targetType?: string;
  limit?: number;
}) {
  const res = await api.get<ActionLog[]>("/admin/logs", { params });
  return res.data;
}

// ✨ Admin – бүх manhua + эзэнтэй нь
export async function adminGetManhuas(limit?: number) {
  const params: Record<string, any> = {};
  if (limit) params.limit = limit;

  const res = await api.get<Manhua[]>("/admin/manhuas", { params });
  return res.data;
}



// ✅ Editor – өөрийн манхуа лист
export async function editorGetMyManhuas() {
  const res = await api.get<Manhua[]>("/editor/manhuas/mine");
  return res.data;
}

// ✅ Editor – шинэ манхуа үүсгэх
export async function editorCreateManhua(payload: {
  title: string;
  description?: string;
  slug?: string;
  status?: string;
  coverImage?: string;
  coverImageUrl?: string;
  genres?: string[];
}) {
  const res = await api.post<Manhua>("/editor/manhuas", payload);
  return res.data;
}

// ✅ Editor – өөрийн манхуа update
export async function editorUpdateManhua(
  id: string,
  payload: Partial<{
    title: string;
    description: string;
    slug: string;
    status: string;
    coverImage: string;
    coverImageUrl: string;
    genres: string[];
  }>
) {
  const res = await api.patch<Manhua>(`/editor/manhuas/${id}`, payload);
  return res.data;
}

// Public list
export async function getManhuas(params?: { page?: number; limit?: number }) {
  const res = await api.get<any>("/manhuas", { params });
  const data = res.data;

  // 1) Хэрвээ backend шууд массив өгдөг бол:
  if (Array.isArray(data)) {
    return data as Manhua[];
  }

  // 2) Хэрвээ { items: [...] } structure-тэй бол:
  if (data && Array.isArray(data.items)) {
    return data.items as Manhua[];
  }

  // 3) Бусад тохиолдолд хоосон массив
  return [] as Manhua[];
}

// 🔥 Admin – manhua update
export async function adminUpdateManhua(id: string, payload: Partial<Manhua>) {
  const res = await api.patch<Manhua>(`/admin/manhuas/${id}`, payload);
  return res.data;
}

// 🔥 Admin – ганц manhua detail
export async function adminGetManhua(id: string) {
  const res = await api.get<Manhua>(`/admin/manhuas/${id}`);
  return res.data;
}

// 🔥 Admin – manhua delete
export async function adminDeleteManhua(id: string) {
  const res = await api.delete<{ message: string }>(`/admin/manhuas/${id}`);
  return res.data;
}

export async function uploadImage(file: File) {
  const formData = new FormData();

  formData.append("file", file);

  const res = await api.post<{ url: string }>("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data; // { url }
}





// ✅ USER – Public chapters
export async function getPublicChapters(slug: string) {
  const res = await api.get<Chapter[]>(`/manhuas/${slug}/chapters`);
  return res.data;
}

export async function adminGetChapters(slug: string) {
  const res = await api.get<Chapter[]>(`/admin/manhuas/${slug}/chapters`);
  return res.data;
}

// EDITOR – list chapters for my manhua
export async function editorGetChapters(slug: string) {
  const res = await api.get<Chapter[]>(`/editor/manhuas/${slug}/chapters`);
  return res.data;
}

// EDITOR – get chapter by id
export async function editorGetChapterById(id: string) {
  const res = await api.get<Chapter>(`/editor/chapters/${id}`);
  return res.data;
}

// EDITOR – update chapter
export async function editorUpdateChapter(
  id: string,
  payload: Partial<Chapter>
) {
  const res = await api.put<Chapter>(`/editor/chapters/${id}`, payload);
  return res.data;
}
export async function adminUnlockUser(id: string) {
  const res = await api.patch<User>(`/admin/users/${id}/unlock`);
  return res.data;
}