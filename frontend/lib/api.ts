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

// Audit Logs (new comprehensive system)
export interface AuditLog {
  _id: string;
  time: string; // Canonical ISO timestamp field
  ts?: string; // Backward compatibility
  level: "INFO" | "WARN" | "ERROR";
  category: "auth" | "device" | "payment" | "content" | "reader" | "comment" | "admin" | "system";
  action: string;
  message: string;
  user: {
    id: string;
    username?: string;
    role?: string;
  } | null;
  ip: string | null;
  deviceIdHash: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  durationMs: number | null;
  requestId: string | null;
  meta: any;
}

export interface AuditLogsResponse {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function adminGetAuditLogs(params?: {
  q?: string;
  level?: string;
  category?: string;
  action?: string;
  userId?: string;
  ip?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  const res = await api.get<AuditLogsResponse>("/admin/audit-logs", { params });
  return res.data;
}

export async function adminGetAuditLogById(id: string) {
  const res = await api.get<AuditLog>(`/admin/audit-logs/${id}`);
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

export async function uploadImage(
  file: File,
  onProgress?: (percent: number) => void
) {
  const formData = new FormData();

  formData.append("file", file);

  const res = await api.post<{ url: string }>("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (event) => {
      if (!onProgress) return;
      const total = event.total ?? 0;
      if (!total) {
        onProgress(0);
        return;
      }
      const percent = Math.round((event.loaded * 100) / total);
      onProgress(percent);
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

// User Profile APIs
export interface Favorite {
  _id: string;
  user: string;
  manhua: {
    _id: string;
    title: string;
    slug: string;
    coverImageUrl?: string;
    coverImage?: string;
  };
  createdAt: string;
}

export interface Bookmark {
  _id: string;
  user: string;
  manhua: {
    _id: string;
    title: string;
    slug: string;
    coverImageUrl?: string;
    coverImage?: string;
  };
  chapterNumber: number;
  pageNumber: number;
  updatedAt: string;
}

export async function getMyFavorites() {
  const res = await api.get<Favorite[]>("/me/favorites");
  return res.data;
}

export async function getMyBookmarks() {
  const res = await api.get<Bookmark[]>("/me/bookmarks");
  return res.data;
}

// Toggle favorite/bookmark
export async function toggleFavorite(manhuaId: string) {
  const res = await api.post<{ isFavorited: boolean }>(
    `/me/favorites/${manhuaId}/toggle`
  );
  return res.data;
}

export async function toggleBookmark(manhuaId: string) {
  const res = await api.post<{ isBookmarked: boolean }>(
    `/me/bookmarks/${manhuaId}/toggle`
  );
  return res.data;
}

// Get favorite/bookmark status for a manhua
export async function getManhuaStatus(manhuaId: string) {
  const res = await api.get<{ isFavorited: boolean; isBookmarked: boolean }>(
    `/user/me/status/${manhuaId}`
  );
  return res.data;
}

// Avatar upload
export async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("avatar", file);

  const res = await api.post<{ success: boolean; avatar: string }>(
    "/user/avatar",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data;
}

// Profile updates
export interface UpdateProfileResponse {
  success: boolean;
  user: {
    _id: string;
    username: string;
    email: string;
    role: string;
    isVIP: boolean;
    vipExpiresAt?: string | null;
    avatar?: string | null;
  };
  message: string;
}

export async function updateProfile(username: string) {
  const res = await api.patch<UpdateProfileResponse>("/user/profile", {
    username,
  });
  return res.data;
}

export async function updateEmail(email: string, password: string) {
  const res = await api.patch<UpdateProfileResponse>("/user/email", {
    email,
    password,
  });
  return res.data;
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
) {
  const res = await api.patch<UpdateProfileResponse>("/user/password", {
    currentPassword,
    newPassword,
  });
  return res.data;
}

// VIP Plans
export interface VipPlan {
  id: string;
  months: number;
  priceTotal: number;
  pricePerMonth: number;
  discount: number | null;
  active: boolean;
}

export interface VipPlansResponse {
  plans: VipPlan[];
}

export interface VipPurchaseResponse {
  success: boolean;
  user: {
    _id: string;
    username: string;
    email: string;
    role: string;
    isVIP: boolean;
    vipExpiresAt?: string | null;
    avatar?: string | null;
  };
  message: string;
}

export async function getVipPlans() {
  const res = await api.get<VipPlansResponse>("/vip/plans");
  return res.data;
}

export async function purchaseVip(planId: string) {
  const res = await api.post<VipPurchaseResponse>("/vip/purchase", {
    planId,
  });
  return res.data;
}

// Settings API
export interface VipPlanSetting {
  key: string;
  title: string;
  priceMnt: number;
  durationDays: number;
  badgeLabel: string | null;
  isHighlighted: boolean;
  features: string[];
}

export interface VipPaymentSetting {
  bankName: string;
  accountName: string;
  accountNumber: string;
  note: string;
}

export interface VipSettingsResponse {
  success: boolean;
  plans: VipPlanSetting[];
  payment: VipPaymentSetting;
}

export async function getVipSettings() {
  const res = await api.get<VipSettingsResponse>("/settings/vip");
  return res.data;
}

// Admin Settings API
export async function adminGetVipSettings() {
  const res = await api.get<VipSettingsResponse>("/admin/settings/vip");
  return res.data;
}

export async function adminUpdateVipSettings(payload: {
  plans: VipPlanSetting[];
  payment: VipPaymentSetting;
}) {
  const res = await api.put<VipSettingsResponse>("/admin/settings/vip", payload);
  return res.data;
}

// Comments API
export interface Comment {
  _id: string;
  user: string;
  username: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentsResponse {
  success: boolean;
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateCommentResponse {
  success: boolean;
  comment: Comment;
  message: string;
}

export async function getManhuaComments(
  manhuaId: string,
  page = 1,
  limit = 20
) {
  const res = await api.get<CommentsResponse>(
    `/comments/manhua/${manhuaId}`,
    {
      params: { page, limit },
    }
  );
  return res.data;
}

export async function createManhuaComment(manhuaId: string, text: string) {
  const res = await api.post<CreateCommentResponse>(
    `/comments/manhua/${manhuaId}`,
    { text }
  );
  return res.data;
}

export async function deleteComment(commentId: string) {
  const res = await api.delete<{ success: boolean; message: string }>(
    `/comments/${commentId}`
  );
  return res.data;
}