import { api } from "@/lib/api";

export type FinanceManhuaRow = {
  _id: string;
  title: string;
  slug?: string;
  monthlyViews: number;
  lifetimeViews: number;
};

export type FinanceEditorRow = {
  editor: { _id: string; username: string; email?: string };
  chaptersUploaded: number;
  manhuasUploaded: number;
  chapterMonthlyViews: number;
  manhuas: FinanceManhuaRow[];
  score: number;
  payout: number;
};

export type FinanceMonthResponse = {
  monthKey: string;
  currency: string;
  totalRevenue: number;
  siteShare: number;
  editorsPool: number;
  totals: {
    chaptersUploaded: number;
    manhuasUploaded: number;
    chapterMonthlyViews: number;
  };
  editors: FinanceEditorRow[];
};

export async function adminGetFinanceMonth(params?: { month?: string }) {
  const res = await api.get<FinanceMonthResponse>("/admin/finance", { params });
  return res.data;
}

