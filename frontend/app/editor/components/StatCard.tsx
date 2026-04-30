interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <div className="rounded-[14px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] font-medium mb-1 uppercase tracking-wide" style={{ color: "var(--arc-muted)" }}>{title}</p>
          <p className="text-[24px] font-bold mb-0.5" style={{ color: "var(--arc-text)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>{value}</p>
          {subtitle && <p className="text-[10px]" style={{ color: "var(--arc-muted)" }}>{subtitle}</p>}
          {trend && (
            <p className="text-[10px] font-medium mt-1" style={{ color: trend.isPositive ? "oklch(0.8 0.14 145)" : "oklch(0.75 0.2 15)" }}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] text-xl"
            style={{ background: "oklch(0.72 0.17 195/.1)", border: "1px solid oklch(0.72 0.17 195/.2)" }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
