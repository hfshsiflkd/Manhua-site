import type { PageAccess } from "./pageAccess";

export function pageAccessUrl(rawBase: string): string | null {
  const base = String(rawBase || "").trim().replace(/\/+$/, "");
  if (!base) return null;
  if (/\/auth\/page-access$/i.test(base)) return base;
  if (/\/api$/i.test(base)) return `${base}/auth/page-access`;
  return `${base}/api/auth/page-access`;
}

function apiBase(): string | null {
  return pageAccessUrl(process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "");
}

export async function fetchPageAccess(
  token: string,
  deviceId: string
): Promise<{ access: PageAccess | null; failed: boolean }> {
  const url = apiBase();
  if (!url) return { access: null, failed: true };
  try {
    const res = await fetch(url, {
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
