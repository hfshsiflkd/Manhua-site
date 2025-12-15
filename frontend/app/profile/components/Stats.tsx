"use client";

interface StatsProps {
  totalChaptersRead: number;
  readingStreak: number;
  todayReadCount: number;
}

export function Stats({
  totalChaptersRead,
  readingStreak,
  todayReadCount,
}: StatsProps) {
  return (
    <div className="pt-6 pb-4 border-b border-slate-800/50">
      <h3 className="mb-4 text-sm font-medium text-slate-400">Статистик</h3>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-lg font-bold text-cyan-400">{totalChaptersRead}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Уншсан бүлэг</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-fuchsia-400">{readingStreak}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Өдрийн цуваа</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-yellow-400">{todayReadCount}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Өнөөдөр</p>
        </div>
      </div>
    </div>
  );
}

