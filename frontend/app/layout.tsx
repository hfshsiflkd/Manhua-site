import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import Header from "./components/Header";
import "./globals.css";
import AppProviders from "./components/AppProviders";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import LockModal from "./components/LockModal";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-head",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ARC•READ",
  description: "Монгол хэл дээр манхуа унших платформ",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
      <body className="arc-body min-h-screen">
        <AppProviders>
          <Header />
          {children}
          <Footer />
          <ScrollToTop />
          <LockModal />
        </AppProviders>
      </body>
    </html>
  );
}
