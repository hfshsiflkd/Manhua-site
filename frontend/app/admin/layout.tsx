// src/app/admin/layout.tsx
import "../globals.css";
import Header from "../components/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950">
      <Header/>{children}
    </div>
  );
}
