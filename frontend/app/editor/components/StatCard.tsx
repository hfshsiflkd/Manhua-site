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

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-100 mb-0.5">{value}</p>
          {subtitle && (
            <p className="text-[10px] text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`text-[10px] font-medium mt-1 ${
                trend.isPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-xl">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

