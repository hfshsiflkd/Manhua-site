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
    <div className="rounded-3xl bg-gradient-to-r from-yellow-400/30 via-amber-500/25 to-cyan-500/10 p-[1px] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-4 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">VIP</h3>
          <span className="text-[10px] text-slate-500">Онцгой эрх</span>
        </div>

        {isVip && vipExpiresAt && vipExpiresAt > now ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-400/10 px-4 py-3 shadow-inner shadow-yellow-500/20">
              <p className="mb-1 text-xs font-semibold text-yellow-200">
                VIP идэвхтэй ✨
              </p>
              <p className="text-[10px] text-yellow-300/70">
                Дуусах: {vipExpiresAt.toLocaleDateString("mn-MN")} ({daysRemaining} өдөр үлдсэн)
              </p>
            </div>
            <button
              onClick={handleNavigateToVip}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              Сунгах
            </button>
          </div>
        ) : (
          <button
            onClick={handleNavigateToVip}
            className="w-full rounded-lg bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-yellow-500/30 transition-all hover:brightness-110"
          >
            VIP авах
          </button>
        )}
      </div>
    </div>
  );
}

