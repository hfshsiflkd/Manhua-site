import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  icon?: string;
}

export default function EmptyState({
  title,
  description,
  action,
  icon = "📭",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-12 text-center">
      <div className="mb-4 text-5xl">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 mb-6 max-w-md">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110 transition"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

