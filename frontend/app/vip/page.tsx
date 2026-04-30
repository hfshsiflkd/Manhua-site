"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { VipPaymentModal } from "./components/VipPaymentModal";
import { getVipSettings, type VipPlanSetting, type VipPaymentSetting } from "@/lib/api";

export default function VipPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<VipPlanSetting[]>([]);
  const [payment, setPayment] = useState<VipPaymentSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<VipPlanSetting | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true); setError(null);
        const data = await getVipSettings();
        setPlans(data.plans || []);
        setPayment(data.payment || null);
      } catch (err: unknown) {
        setError("VIP тохиргоо ачаалж чадсангүй.");
      } finally { setLoading(false); }
    }
    loadSettings();
  }, []);

  const handlePurchase = (pkg: VipPlanSetting) => { setSelectedPackage(pkg); setShowPayment(true); };

  const isVip = user?.isVIP && user.vipExpiresAt;
  const vipExpiresAt = user?.vipExpiresAt ? new Date(user.vipExpiresAt) : null;
  const now = new Date();
  const daysRemaining =
    vipExpiresAt && vipExpiresAt > now
      ? Math.ceil((vipExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--arc-bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ borderBottom: "1px solid var(--arc-border)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%,oklch(0.65 0.2 290/.14),transparent), radial-gradient(ellipse 50% 40% at 20% 80%,oklch(0.72 0.17 195/.08),transparent), radial-gradient(ellipse 50% 40% at 80% 80%,oklch(0.65 0.22 15/.06),transparent)" }} />
        <div className="relative mx-auto max-w-4xl px-4 py-16 md:py-24 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex items-center justify-center rounded-[22px]" style={{ width: 80, height: 80, background: "linear-gradient(135deg,oklch(0.65 0.2 290/.3),oklch(0.82 0.16 85/.2))", border: "1px solid oklch(0.65 0.2 290/.3)", boxShadow: "0 0 40px oklch(0.65 0.2 290/.2)", fontSize: 36 }}>👑</div>
          </div>
          <h1
            className="text-[40px] md:text-[52px] font-extrabold mb-4"
            style={{
              fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
              background: "linear-gradient(135deg,var(--arc-amber),oklch(0.9 0.12 80),var(--arc-amber))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.03em",
            }}
          >
            VIP гишүүнчлэл
          </h1>
          <p className="text-[16px] mb-8" style={{ color: "var(--arc-dim)", maxWidth: 400, margin: "0 auto 32px" }}>
            Илүү чөлөөтэй, илүү хурдан унш
          </p>

          {isVip && vipExpiresAt && vipExpiresAt > now && (
            <div
              className="inline-block px-6 py-3 rounded-full"
              style={{ background: "oklch(0.82 0.16 85/.1)", border: "1px solid oklch(0.82 0.16 85/.4)" }}
            >
              <p className="font-semibold text-[14px] mb-1" style={{ color: "var(--arc-amber)" }}>VIP идэвхтэй ✨</p>
              <p className="text-[12px]" style={{ color: "oklch(0.72 0.12 85)" }}>
                {daysRemaining} өдөр үлдсэн • Дуусах: {vipExpiresAt.toLocaleDateString("mn-MN")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Plans */}
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16 pb-24">
        {loading ? (
          <div className="py-16 text-center text-[14px]" style={{ color: "var(--arc-muted)" }}>VIP төлөвлөгөө ачаалж байна...</div>
        ) : error ? (
          <div className="py-16 text-center text-[14px]" style={{ color: "oklch(0.75 0.18 15)" }}>{error}</div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center text-[14px]" style={{ color: "var(--arc-muted)" }}>VIP төлөвлөгөө олдсонгүй.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {plans.map((pkg, index) => {
              const isPopular = pkg.isHighlighted;
              const badge = pkg.badgeLabel;
              return (
                <div
                  key={pkg._id || pkg.key || index}
                  className="relative rounded-[16px] p-6"
                  style={{
                    border: `1px solid ${isPopular ? "oklch(0.65 0.2 290/.5)" : "var(--arc-border)"}`,
                    background: isPopular ? "linear-gradient(160deg,oklch(0.65 0.2 290/.08),var(--arc-card))" : "var(--arc-card)",
                    boxShadow: isPopular ? "0 0 40px oklch(0.65 0.2 290/.12), 0 8px 32px rgba(0,0,0,.4)" : "none",
                  }}
                >
                  {isPopular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.06em] whitespace-nowrap"
                      style={{ background: "linear-gradient(90deg,oklch(0.65 0.2 290),oklch(0.72 0.17 195))", color: "#fff", boxShadow: "0 4px 12px oklch(0.65 0.2 290/.4)" }}
                    >
                      Most popular
                    </div>
                  )}

                  {badge && (
                    <div
                      className="mb-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}
                    >
                      {badge}
                    </div>
                  )}

                  <h3
                    className="text-[20px] font-bold mb-1"
                    style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "#fff" }}
                  >
                    {pkg.title}
                  </h3>

                  <div className="mb-5 mt-3">
                    <div className="text-[36px] font-extrabold leading-none mb-1" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "#fff", letterSpacing: "-0.03em" }}>
                      {pkg.priceMnt.toLocaleString()}<span className="text-[16px] font-normal" style={{ color: "var(--arc-muted)" }}>₮</span>
                    </div>
                    <div className="text-[12px]" style={{ color: "var(--arc-muted)" }}>/ {pkg.durationDays} хоног</div>
                  </div>

                  <div className="mb-6 space-y-2.5 flex-1">
                    {pkg.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-[13px]" style={{ color: "var(--arc-dim)" }}>
                        <div className="flex items-center justify-center rounded-[5px] shrink-0 mt-0.5" style={{ width: 16, height: 16, background: isPopular ? "oklch(0.65 0.2 290/.15)" : "oklch(0.72 0.17 195/.1)", border: `1px solid ${isPopular ? "oklch(0.65 0.2 290/.4)" : "oklch(0.72 0.17 195/.3)"}` }}>
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={isPopular ? "oklch(0.65 0.2 290)" : "var(--arc-cyan)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg)}
                    className="w-full rounded-[10px] px-4 py-3 text-[14px] font-bold transition-all hover:brightness-110"
                    style={
                      isPopular
                        ? { background: "linear-gradient(135deg,oklch(0.65 0.2 290),oklch(0.72 0.17 195))", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 0 24px oklch(0.65 0.2 290/.3)" }
                        : { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)", cursor: "pointer" }
                    }
                  >
                    Авах
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedPackage && user && payment && (
        <VipPaymentModal
          packageName={selectedPackage.title}
          price={selectedPackage.priceMnt}
          days={selectedPackage.durationDays}
          planCode={selectedPackage.key}
          username={user.username || user.email || ""}
          payment={payment}
          isOpen={showPayment}
          onClose={() => { setShowPayment(false); setSelectedPackage(null); }}
        />
      )}
    </div>
  );
}
