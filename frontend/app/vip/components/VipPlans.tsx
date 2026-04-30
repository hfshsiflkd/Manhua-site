"use client";

import type { VipPlan } from "@/lib/api";

interface VipPlansProps {
  plans: VipPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (planId: string) => void;
}

export function VipPlans({ plans, selectedPlanId, onSelectPlan }: VipPlansProps) {
  const displayPlans = plans.filter((p) => [1, 3, 6].includes(p.months));

  if (displayPlans.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>VIP төлөвлөгөө олдсонгүй.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {[1, 3, 6].map((months) =>
        displayPlans
          .filter((p) => p.months === months)
          .map((plan) => (
            <VipPlanCard
              key={plan.id}
              plan={plan}
              label={`${months} сар`}
              helperText={months === 3 ? "Сараар арай хямд" : months === 6 ? "Илүү хэмнэлттэй" : undefined}
              isSelected={selectedPlanId === plan.id}
              onSelect={() => onSelectPlan(plan.id)}
              highlight={months === 6}
            />
          ))
      )}
    </div>
  );
}

function VipPlanCard({ plan, label, helperText, isSelected, onSelect, highlight }: {
  plan: VipPlan; label: string; helperText?: string;
  isSelected: boolean; onSelect: () => void; highlight: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className="relative rounded-[14px] p-6 text-left transition-all duration-200"
      style={{
        border: `2px solid ${isSelected ? "oklch(0.82 0.16 85/.7)" : highlight ? "oklch(0.72 0.17 195/.4)" : "var(--arc-border)"}`,
        background: isSelected ? "oklch(0.82 0.16 85/.08)" : "var(--arc-elevated)",
        transform: isSelected ? "scale(1.03)" : "scale(1)",
        boxShadow: isSelected ? "0 8px 24px oklch(0.82 0.16 85/.2)" : "none",
        cursor: "pointer",
      }}
    >
      {plan.discount && (
        <div
          className="absolute -top-3 -right-3 px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{ background: "linear-gradient(135deg,var(--arc-amber),oklch(0.7 0.18 60))", color: "#07070e" }}
        >
          -{plan.discount}%
        </div>
      )}

      <div className="mb-4">
        <div className="text-[22px] font-bold mb-1" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>{label}</div>
        {helperText && <div className="text-[12px]" style={{ color: "var(--arc-muted)" }}>{helperText}</div>}
      </div>

      <div>
        <div className="text-[28px] font-bold mb-1" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: isSelected ? "var(--arc-amber)" : "var(--arc-text)" }}>
          {plan.priceTotal.toLocaleString()}₮
        </div>
        <div className="text-[12px]" style={{ color: "var(--arc-muted)" }}>{plan.pricePerMonth.toLocaleString()}₮/сар</div>
      </div>
    </button>
  );
}
