import { api } from "@/lib/api";

export type LeaderboardRow = {
  rank: number;
  editor: { _id: string; username: string; email?: string; role?: string };
  chaptersUploaded: number;
  chapterMonthlyViews: number;
  share: number;
  payout: number;
};

export type EditorLeaderboardResponse = {
  monthKey: string;
  currency: string;
  totalRevenue: number;
  siteShare: number;
  editorsPool: number;
  totalChapterViews: number;
  editors: LeaderboardRow[];
};

export async function editorGetLeaderboard(params?: { month?: string }) {
  const res = await api.get<EditorLeaderboardResponse>("/editor/leaderboard", { params });
  return res.data;
}

