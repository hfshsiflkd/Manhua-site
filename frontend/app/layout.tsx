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
      <html lang="mn" suppressHydrationWarning={true}>
        <body className="bg-slate-950 text-slate-100 min-h-screen">
          <AuthProvider>
            <div className="relative min-h-screen">
              {/* background gradient */}
              <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_#38bdf833,_transparent_60%),radial-gradient(circle_at_bottom,_#6366f133,_transparent_55%)] opacity-80" />
              <div className="relative z-10 flex min-h-screen flex-col">
                <Header />
                <main className="flex-1 px-4 pb-10 pt-6 sm:px-8 lg:px-16">
                  <div className="mx-auto max-w-6xl">{children}</div>
                </main>
                <footer className="border-t border-slate-800 bg-slate-950/70 py-4 text-center text-xs text-slate-500">
                  Manhua.mn • MVP build 🚀
                </footer>
              </div>
            </div>
          </AuthProvider>
        </body>
      </html>
    );
  }






    
