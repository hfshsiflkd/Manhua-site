import { notFound } from "next/navigation";
import { requirePageFlag } from "@/lib/serverPageAccess";
import UnavailableScreen from "@/app/components/UnavailableScreen";

export const dynamic = "force-dynamic";

export default async function EditorLeaderboardLayout({ children }: { children: React.ReactNode }) {
  const gate = await requirePageFlag("editorLeaderboard");
  if (gate.status === "unavailable") return <UnavailableScreen />;
  if (gate.status !== "allow") notFound();
  return children;
}
