import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-[12px] font-semibold tracking-[0.2em]" style={{ color: "var(--arc-muted)" }}>
          404
        </p>
        <h1
          className="mt-2 text-[28px] font-bold"
          style={{ color: "var(--arc-text)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}
        >
          Хуудас олдсонгүй
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--arc-muted)" }}>
          Таны хайсан хуудас байхгүй эсвэл нэвтрэх эрхгүй байна.
        </p>
        <Link
          href="/"
          prefetch={false}
          className="mt-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold no-underline"
          style={{ background: "var(--arc-cyan)", color: "#07070e" }}
        >
          Нүүр хуудас
        </Link>
      </div>
    </main>
  );
}
