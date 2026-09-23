export default function CreatorNotFound() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center space-y-2">
      <h1 className="text-[22px] font-bold" style={{ color: "var(--arc-text)" }}>
        Профайл олдсонгүй
      </h1>
      <p className="text-[13px]" style={{ color: "var(--arc-muted)" }}>
        Энэ нийтлэгчийн public профайл байхгүй эсвэл харагдахгүй байна.
      </p>
    </div>
  );
}
