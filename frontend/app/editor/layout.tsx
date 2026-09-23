import { notFound } from "next/navigation";
import { readServerGate, requestPathname } from "@/lib/serverPageAccess";
import { pathAllowed } from "@/lib/pageAccess";
import UnavailableScreen from "@/app/components/UnavailableScreen";
import EditorLayout from "./components/EditorLayout";
import "../globals.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function EditorLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = await requestPathname(null);
  const gate = await readServerGate();
  if (gate.status === "unavailable") return <UnavailableScreen />;
  if (!pathname || gate.status !== "allow" || !pathAllowed(pathname, gate.access.pages)) notFound();
  return <EditorLayout>{children}</EditorLayout>;
}
