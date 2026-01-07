import { api } from "@/lib/api";

export type UserSpenderRow = {
  rank: number;
  user: { _id: string; username: string };
  totalSpent: number;
};

export type UserLeaderboardResponse = {
  scope: "all_time" | "month";
  monthKey: string | null;
  currency: string;
  users: UserSpenderRow[];
};

export async function getUserSpenderLeaderboard(params?: {
  limit?: number;
  month?: string;
}) {
  const res = await api.get<UserLeaderboardResponse>("/leaderboard/users", {
    params,
  });
  return res.data;
}

