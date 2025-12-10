import type { Metadata } from "next";
import Header from "./components/Header";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Manhua.mn",
  description: "Монгол хэл дээр манхуа унших платформ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body
        className="
    min-h-screen text-slate-100
    bg-gradient-to-br
    from-[#0b0b12]
    via-[#0f1220]
    to-[#090910]
  "
      >
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
