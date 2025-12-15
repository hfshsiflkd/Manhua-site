import { api } from "@/lib/api";

export type AdminUserRole = "user" | "translator" | "admin" | "editor";

export type AdminUser = {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  role: AdminUserRole;
  blocked: boolean;
  isActive: boolean;
  vipExpiresAt?: string | null;
  vipLevel?: number;
  createdAt: string;
  lockUntil?: string | null;
  lockReason?: string;
  isLocked?: boolean; // Virtual field from backend
  deviceSwitchCount?: number;
  preferredActivities?: string[];
  workValues?: string[];
  energyBoosts?: string[];
  goingOut?: string[];
  weekend?: string[];
  hobby?: string[];
};

export type AdminUserListResponse = {
  items: AdminUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function adminListUsers(params?: {
  page?: number;
  limit?: number;
  q?: string;
  role?: AdminUserRole;
  vip?: boolean;
  blocked?: boolean;
  locked?: boolean;
  sort?: string;
}) {
  const res = await api.get<AdminUserListResponse>("/admin/users", { params });
  return res.data;
}

export async function adminGetUser(id: string) {
  const res = await api.get<AdminUser>(`/admin/users/${id}`);
  return res.data;
}

export async function adminUpdateUser(id: string, payload: Partial<AdminUser>) {
  const res = await api.patch<AdminUser>(`/admin/users/${id}`, payload);
  return res.data;
}

export async function adminResetPassword(
  id: string,
  payload: { newPassword?: string; generateRandom?: boolean }
) {
  const res = await api.post<{ message: string; temporaryPassword?: string }>(
    `/admin/users/${id}/reset-password`,
    payload
  );
  return res.data;
}

export async function adminForceLogout(id: string) {
  const res = await api.post<{ message: string }>(
    `/admin/users/${id}/force-logout`
  );
  return res.data;
}

export async function adminBlockUser(id: string) {
  const res = await api.post<AdminUser>(`/admin/users/${id}/block`);
  return res.data;
}

export async function adminUnblockUser(id: string) {
  const res = await api.post<AdminUser>(`/admin/users/${id}/unblock`);
  return res.data;
}

export async function adminLockUser(
  id: string,
  payload: { reason: string; minutes: number }
) {
  const res = await api.post<AdminUser>(`/admin/users/${id}/lock`, payload);
  return res.data;
}

export async function adminUnlockUser(id: string) {
  const res = await api.post<AdminUser>(`/admin/users/${id}/unlock`);
  return res.data;
}
