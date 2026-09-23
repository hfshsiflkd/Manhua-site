import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { readServerGate } from "@/lib/serverPageAccess";
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
  const pathname = (await headers()).get("x-arc-pathname") || "/editor";
  const gate = await readServerGate();
  if (gate.status === "unavailable") return <UnavailableScreen />;
  if (gate.status !== "allow" || !pathAllowed(pathname, gate.access.pages)) notFound();
  return <EditorLayout>{children}</EditorLayout>;
}
