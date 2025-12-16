"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function VipPurchase() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) return null;

  const isVip = user.isVIP && user.vipExpiresAt;
  const vipExpiresAt = user.vipExpiresAt
    ? new Date(user.vipExpiresAt)
    : null;
  const now = new Date();
  const daysRemaining =
    vipExpiresAt && vipExpiresAt > now
      ? Math.ceil((vipExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  const handleNavigateToVip = () => {
    router.push("/vip");
  };

  return (
    <div className="pt-6 pb-4 border-b border-slate-800/50">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-400 mb-1">VIP</h3>
      </div>

      {isVip && vipExpiresAt && vipExpiresAt > now ? (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-xs font-medium text-yellow-200 mb-1">
              VIP идэвхтэй ✨
            </p>
            <p className="text-[10px] text-yellow-300/70">
              Дуусах: {vipExpiresAt.toLocaleDateString("mn-MN")} ({daysRemaining} өдөр үлдсэн)
            </p>
          </div>
          <button
            onClick={handleNavigateToVip}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Сунгах
          </button>
        </div>
      ) : (
        <button
          onClick={handleNavigateToVip}
          className="w-full rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:from-yellow-300 hover:to-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
        >
          VIP авах
        </button>
      )}
    </div>
  );
}

