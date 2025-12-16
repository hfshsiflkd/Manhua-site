"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { VipPaymentModal } from "./components/VipPaymentModal";
import {
  getVipSettings,
  type VipPlanSetting,
  type VipPaymentSetting,
} from "@/lib/api";

export default function VipPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<VipPlanSetting[]>([]);
  const [payment, setPayment] = useState<VipPaymentSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<VipPlanSetting | null>(
    null
  );
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);
        const data = await getVipSettings();
        setPlans(data.plans || []);
        setPayment(data.payment || null);
      } catch (err: unknown) {
        console.error("Failed to load VIP settings:", err);
        setError("VIP тохиргоо ачаалж чадсангүй.");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handlePurchase = (pkg: VipPlanSetting) => {
    setSelectedPackage(pkg);
    setShowPayment(true);
  };

  const isVip = user?.isVIP && user.vipExpiresAt;
  const vipExpiresAt = user?.vipExpiresAt ? new Date(user.vipExpiresAt) : null;
  const now = new Date();
  const daysRemaining =
    vipExpiresAt && vipExpiresAt > now
      ? Math.ceil(
          (vipExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 border-b border-purple-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 md:py-24 text-center">
          {/* Crown Icon */}
          <div className="mb-6 flex justify-center">
            <div className="text-6xl md:text-7xl">👑</div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
            VIP гишүүнчлэл
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Илүү чөлөөтэй, илүү хурдан унш
          </p>

          {/* VIP Status (if already VIP) */}
          {isVip && vipExpiresAt && vipExpiresAt > now && (
            <div className="inline-block px-6 py-3 rounded-full bg-yellow-500/20 border border-yellow-500/40">
              <p className="text-yellow-300 font-semibold text-base mb-1">
                VIP идэвхтэй ✨
              </p>
              <p className="text-yellow-400/80 text-sm">
                {daysRemaining} өдөр үлдсэн • Дуусах:{" "}
                {vipExpiresAt.toLocaleDateString("mn-MN")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Section */}
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16 pb-24">
        {loading ? (
          <div className="py-16 text-center">
            <p className="text-slate-400">VIP төлөвлөгөө ачаалж байна...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400">VIP төлөвлөгөө олдсонгүй.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {plans.map((pkg, index) => {
              const isPopular = pkg.isHighlighted;
              const badge = pkg.badgeLabel;

              return (
                <div
                  key={pkg.key || index}
                  className={`relative rounded-2xl border-2 ${
                    isPopular
                      ? "border-cyan-500/50 bg-slate-900/70 shadow-lg shadow-cyan-500/20"
                      : "border-slate-800 bg-slate-950/90"
                  } p-6 shadow-lg shadow-black/40`}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 text-[10px] font-bold shadow-lg">
                      Most popular
                    </div>
                  )}

                  {/* Package badge */}
                  {badge && (
                    <div className="mb-3 inline-block rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                      {badge}
                    </div>
                  )}

                  {/* Package name */}
                  <h3 className="text-xl font-bold text-slate-100 mb-2">
                    {pkg.title}
                  </h3>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-slate-50 mb-1">
                      {pkg.priceMnt.toLocaleString()}₮
                    </div>
                    <div className="text-sm text-slate-400">
                      / {pkg.durationDays} хоног
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mb-6 space-y-2 text-[13px] text-slate-300">
                    {pkg.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handlePurchase(pkg)}
                    className="w-full rounded-full border border-slate-700/80 bg-slate-950/80 px-4 py-2.5 text-[11px] font-medium text-slate-100 hover:bg-slate-900 transition-colors"
                  >
                    Авах
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedPackage && user && payment && (
        <VipPaymentModal
          packageName={selectedPackage.title}
          price={selectedPackage.priceMnt}
          days={selectedPackage.durationDays}
          planCode={selectedPackage.key}
          username={user.username || user.email || ""}
          payment={payment}
          isOpen={showPayment}
          onClose={() => {
            setShowPayment(false);
            setSelectedPackage(null);
          }}
        />
      )}
    </div>
  );
}
