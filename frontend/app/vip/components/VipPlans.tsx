"use client";

import type { VipPlan } from "@/lib/api";

interface VipPlansProps {
  plans: VipPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (planId: string) => void;
}

export function VipPlans({ plans, selectedPlanId, onSelectPlan }: VipPlansProps) {
  // Filter to show only 1m, 3m, 6m plans
  const displayPlans = plans.filter((p) => [1, 3, 6].includes(p.months));

  if (displayPlans.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 text-sm">VIP төлөвлөгөө олдсонгүй.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Card 1: 1 month */}
      {displayPlans
        .filter((p) => p.months === 1)
        .map((plan) => (
          <VipPlanCard
            key={plan.id}
            plan={plan}
            label="1 сар"
            isSelected={selectedPlanId === plan.id}
            onSelect={() => onSelectPlan(plan.id)}
            highlight={false}
          />
        ))}

      {/* Card 2: 3 months */}
      {displayPlans
        .filter((p) => p.months === 3)
        .map((plan) => (
          <VipPlanCard
            key={plan.id}
            plan={plan}
            label="3 сар"
            helperText="Сараар арай хямд"
            isSelected={selectedPlanId === plan.id}
            onSelect={() => onSelectPlan(plan.id)}
            highlight={false}
          />
        ))}

      {/* Card 3: 6 months */}
      {displayPlans
        .filter((p) => p.months === 6)
        .map((plan) => (
          <VipPlanCard
            key={plan.id}
            plan={plan}
            label="6 сар"
            helperText="Илүү хэмнэлттэй"
            isSelected={selectedPlanId === plan.id}
            onSelect={() => onSelectPlan(plan.id)}
            highlight={true}
          />
        ))}
    </div>
  );
}

function VipPlanCard({
  plan,
  label,
  helperText,
  isSelected,
  onSelect,
  highlight,
}: {
  plan: VipPlan;
  label: string;
  helperText?: string;
  isSelected: boolean;
  onSelect: () => void;
  highlight: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${
        isSelected
          ? "border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20 scale-105"
          : highlight
          ? "border-purple-500/50 bg-slate-900/70 hover:border-purple-500/70 hover:bg-slate-900/80"
          : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/70"
      }`}
    >
      {/* Discount Badge */}
      {plan.discount && (
        <div className="absolute -top-3 -right-3 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-950 text-[10px] font-bold shadow-lg">
          -{plan.discount}%
        </div>
      )}

      {/* Duration */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-slate-100 mb-1">{label}</div>
        {helperText && (
          <div className="text-xs text-slate-400">{helperText}</div>
        )}
      </div>

      {/* Price */}
      <div>
        <div className="text-3xl font-bold text-slate-50 mb-1">
          {plan.priceTotal.toLocaleString()}₮
        </div>
        <div className="text-sm text-slate-400">
          {plan.pricePerMonth.toLocaleString()}₮/сар
        </div>
      </div>
    </button>
  );
}

