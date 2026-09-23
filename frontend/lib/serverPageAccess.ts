import { cache } from "react";
import { cookies, headers } from "next/headers";
import { unsealSession, SESSION_COOKIE_NAME, sessionSecret } from "./sessionCookie";
import { fetchPageAccess } from "./fetchPageAccess";
import type { PageAccess, PageFlags } from "./pageAccess";

export type ServerGate =
  | { status: "allow"; access: PageAccess; token: string; deviceId: string }
  | { status: "notfound" }
  | { status: "unavailable" };

export const readServerGate = cache(async (): Promise<ServerGate> => {
  if (!sessionSecret()) return { status: "unavailable" };
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  const session = raw ? await unsealSession(raw) : null;
  if (!session?.token) return { status: "notfound" };
  const { access, failed } = await fetchPageAccess(session.token, session.deviceId);
  if (failed) return { status: "unavailable" };
  if (!access) return { status: "notfound" };
  return { status: "allow", access, token: session.token, deviceId: session.deviceId };
});

export async function requestPathname(fallback: string | null = null): Promise<string | null> {
  const h = await headers();
  const fromProxy = h.get("x-arc-pathname");
  if (fromProxy) return fromProxy;
  return fallback;
}

export async function requirePageFlag(flag: keyof PageFlags) {
  const gate = await readServerGate();
  if (gate.status === "unavailable") return { status: "unavailable" as const };
  if (gate.status !== "allow" || !gate.access.pages[flag]) return { status: "notfound" as const };
  return { status: "allow" as const, access: gate.access };
}
