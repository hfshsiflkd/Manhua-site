import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { readServerGate } from "@/lib/serverPageAccess";
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
  const pathname = (await headers()).get("x-arc-pathname") || "/admin";
  const gate = await readServerGate();
  if (gate.status === "unavailable") return <UnavailableScreen />;
  if (gate.status !== "allow" || !pathAllowed(pathname, gate.access.pages)) notFound();
  return <AdminChrome>{children}</AdminChrome>;
}
