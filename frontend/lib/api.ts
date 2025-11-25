/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/api.ts
import axios from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000/api";

export const api = axios.create({
  baseURL: BASE_URL,
});

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type UserRole = "user" | "translator" | "admin";

export interface User {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  vipExpiresAt?: string; // VIP дуусах огноо
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
  description?: string;
  coverImage?: string;
  coverImageUrl?: string;
  status?: string;
  slug?: string;
  genres?: string[];
  createdAt: string;
  createdBy?: {
    _id: string;
    username: string;
    email: string;
    role: UserRole | string;
  };
}

// Auth
export async function loginApi(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  return res.data; // { token, user }
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

// Editor + public Manhua API
export async function editorCreateManhua(payload: {
  title: string;
  description?: string;
  coverImage?: string;
  coverImageUrl?: string;
  status?: string;
  genres?: string[];
}) {
  const res = await api.post<Manhua>("/editor/manhuas", payload);
  return res.data;
}

export async function editorUpdateManhua(id: string, payload: Partial<Manhua>) {
  const res = await api.patch<Manhua>(`/editor/manhuas/${id}`, payload);
  return res.data;
}

// ✨ Editor – зөвхөн өөрийн нэмсэн manhua
export async function editorGetMyManhuas() {
  const res = await api.get<Manhua[]>("/editor/manhuas/mine");
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


// ---- Chapter types ----
export interface ChapterPage {
  pageNumber: number;
  imageUrl: string;
}

export interface Chapter {
  _id: string;
  chapterNumber: number;
  title?: string;
  pages: ChapterPage[];
  views?: number;
  status?: string;
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
