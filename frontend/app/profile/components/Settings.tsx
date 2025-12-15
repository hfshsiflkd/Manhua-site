"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function Settings() {
  const router = useRouter();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!user) return null;

  return (
    <div className="pt-6 pb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-sm font-medium text-slate-400">Тохиргоо</h3>
        <span className="text-slate-500">
          {isExpanded ? "▼" : "▶"}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Security */}
          <div>
            <h4 className="mb-2 text-xs font-medium text-slate-300">
              Аюулгүй байдал
            </h4>
            <button
              onClick={() => router.push("/login/reset-password")}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs text-slate-200 transition-colors hover:bg-slate-800"
            >
              Нууц үг солих
            </button>
          </div>

          {/* Subscription */}
          <div>
            <h4 className="mb-2 text-xs font-medium text-slate-300">
              Захиалга
            </h4>
            {user.isVIP ? (
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <p className="text-xs font-medium text-yellow-200">
                  VIP идэвхтэй ✨
                </p>
                {user.vipExpiresAt && (
                  <p className="mt-1 text-[10px] text-yellow-300/70">
                    Дуусах: {new Date(user.vipExpiresAt).toLocaleDateString("mn-MN")}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push("/vip")}
                className="w-full rounded-lg bg-yellow-300 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-yellow-200"
              >
                VIP эрх авах
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

