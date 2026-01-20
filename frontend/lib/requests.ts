import { api } from "@/lib/api";

export type RequestItem = {
  id: string;
  title: string;
  imageUrl?: string;
  createdAt: string;
  votes: number;
  votesThisMonth: number;
  createdBy?: {
    _id: string;
    username?: string;
    email?: string;
  } | null;
};

export type RequestsResponse = {
  monthKey: string;
  items: RequestItem[];
};

export async function getRequests(month?: string) {
  const res = await api.get<RequestsResponse>("/requests", {
    params: month ? { month } : undefined,
  });
  return res.data;
}

export async function createRequest(payload: { title: string; imageUrl?: string }) {
  const res = await api.post<RequestItem>("/requests", payload);
  return res.data;
}

export async function voteRequest(id: string) {
  const res = await api.post<RequestItem>(`/requests/${id}/vote`);
  return res.data;
}

export async function adminGetRequests(month?: string) {
  const res = await api.get<RequestsResponse>("/admin/requests", {
    params: month ? { month } : undefined,
  });
  return res.data;
}
