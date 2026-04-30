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

export default function EmptyState({ title, description, action, icon = "📭" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] px-6 py-12 text-center"
      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="mb-4 text-5xl">{icon}</div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--arc-text)" }}>{title}</h3>
      <p className="text-sm mb-6 max-w-md" style={{ color: "var(--arc-muted)" }}>{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "var(--arc-cyan)", color: "#07070e" }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
