"use client";

export default function ChapterNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-red-400">
      <p>Chapter олдсонгүй эсвэл устгагдсан байна.</p>
      <button
        onClick={onBack}
        className="mt-2 rounded-full border border-slate-700 px-3 py-1 text-[12px] hover:border-cyan-400 hover:text-cyan-300"
      >
        Буцах
      </button>
    </div>
  );
}
