// src/app/admin/layout.tsx
import "../globals.css";
import Header from "../components/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // БҮХ ДЭЛГЭЦИЙГ ДЭЭРЭЭС НЬ ДАРЖ АВНА
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* ДЭЭД ТАЛ – HEADER */}
      <div className="flex-none border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <Header />
      </div>

      {/* ДООД ТАЛ – ADMIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        {/* Хэрэв padding бага байлгамаар байвал эндээс тохируул */}
        <div className="w-full ">{children}</div>
      </main>
    </div>
  );
}
