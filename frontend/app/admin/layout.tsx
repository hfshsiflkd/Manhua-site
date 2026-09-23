import { notFound } from "next/navigation";
import { readServerGate, requestPathname } from "@/lib/serverPageAccess";
import { pathAllowed } from "@/lib/pageAccess";
import UnavailableScreen from "@/app/components/UnavailableScreen";
import AdminChrome from "./AdminChrome";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = await requestPathname(null);
  const gate = await readServerGate();
  if (gate.status === "unavailable") return <UnavailableScreen />;
  if (gate.status !== "allow") notFound();
  if (pathname) {
    if (!pathAllowed(pathname, gate.access.pages)) notFound();
  } else if (!gate.access.pages.admin) {
    notFound();
  }
  return <AdminChrome>{children}</AdminChrome>;
}
