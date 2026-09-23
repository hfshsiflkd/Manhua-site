export default function UnavailableScreen() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold" style={{ color: "var(--arc-text)", fontFamily: "var(--font-head,'Space Grotesk',sans-serif)" }}>
          Сервис түр ажиллахгүй байна
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--arc-muted)" }}>
          Дараа дахин оролдоно уу.
        </p>
      </div>
    </main>
  );
}
