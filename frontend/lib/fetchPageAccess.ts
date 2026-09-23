import type { PageAccess } from "./pageAccess";

function apiBase(): string {
  return String(process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
}

export async function fetchPageAccess(
  token: string,
  deviceId: string
): Promise<{ access: PageAccess | null; failed: boolean }> {
  const base = apiBase();
  if (!base) return { access: null, failed: true };
  try {
    const res = await fetch(`${base}/auth/page-access`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        ...(deviceId ? { "x-device-id": deviceId } : {}),
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403 || res.status === 423) {
      return { access: null, failed: false };
    }
    if (!res.ok) return { access: null, failed: true };
    const json = (await res.json()) as PageAccess;
    if (!json || typeof json !== "object" || !json.pages) return { access: null, failed: true };
    return { access: json, failed: false };
  } catch {
    return { access: null, failed: true };
  }
}
