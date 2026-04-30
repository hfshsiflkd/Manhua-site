import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  seeAllHref?: string;
  seeAllText?: string;
};

export function SectionHeader({
  title,
  seeAllHref,
  seeAllText = "Бүгдийг харах →",
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div
          className="rounded-sm"
          style={{
            width: 3,
            height: 20,
            background: "var(--arc-cyan)",
            boxShadow: "0 0 10px var(--arc-cyan-glow)",
          }}
        />
        <h2
          className="text-[17px] font-bold tracking-tight text-white"
          style={{ fontFamily: "var(--font-head, 'Space Grotesk', sans-serif)" }}
        >
          {title}
        </h2>
      </div>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="hidden md:flex items-center gap-1 text-[12px] font-medium transition-colors"
          style={{ color: "var(--arc-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--arc-cyan)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--arc-muted)")}
        >
          {seeAllText}
        </Link>
      )}
    </div>
  );
}
