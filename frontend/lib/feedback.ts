import { api } from "@/lib/api";

export type FeedbackType = "suggestion_request" | "complaint";

export async function submitFeedback(payload: {
  name: string;
  type: FeedbackType;
  description: string;
  image?: File | null;
}) {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("type", payload.type);
  form.append("description", payload.description);
  if (payload.image) form.append("image", payload.image);

  const res = await api.post<{ success: boolean; id: string }>(
    "/feedback",
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
}

export type AdminFeedback = {
  _id: string;
  type: FeedbackType;
  status: "new" | "reviewed" | "resolved";
  name: string;
  description: string;
  imageUrl?: string;
  createdAt: string;
};

export type AdminFeedbackListResponse = {
  items: AdminFeedback[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function adminListFeedback(params?: {
  page?: number;
  limit?: number;
  type?: FeedbackType;
  status?: "new" | "reviewed" | "resolved";
}) {
  const res = await api.get<AdminFeedbackListResponse>("/admin/feedback", { params });
  return res.data;
}

export async function adminGetFeedback(id: string) {
  const res = await api.get<AdminFeedback>(`/admin/feedback/${id}`);
  return res.data;
}

export async function adminUpdateFeedbackStatus(
  id: string,
  status: "new" | "reviewed" | "resolved"
) {
  const res = await api.patch<AdminFeedback>(`/admin/feedback/${id}`, { status });
  return res.data;
}

