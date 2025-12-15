import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  seeAllHref?: string;
  seeAllText?: string;
  gradientFrom?: string;
  gradientTo?: string;
  accentColor?: string;
};

export function SectionHeader({
  title,
  seeAllHref,
  seeAllText = "Бүгдийг харах →",
  gradientFrom = "from-cyan-400",
  gradientTo = "to-fuchsia-400",
  accentColor = "bg-fuchsia-500",
}: SectionHeaderProps) {
  return (
    <div className="mb-4 md:mb-5 lg:mb-6 flex items-center justify-between">
      <div className="flex items-center gap-2 md:gap-3">
        <div
          className={`h-6 md:h-7 lg:h-8 w-0.5 md:w-1 rounded-full bg-gradient-to-b ${gradientFrom} ${gradientTo}`}
        />
        <h2
          className={`text-xl md:text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r ${gradientFrom} ${gradientTo} bg-clip-text text-transparent`}
        >
          {title}
        </h2>
      </div>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="text-xs md:text-sm text-gray-400 hover:text-cyan-400 transition-colors hidden md:block"
        >
          {seeAllText}
        </Link>
      )}
    </div>
  );
}
