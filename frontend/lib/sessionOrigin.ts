export function sameOriginRequest(req: Request): boolean {
  const origin = String(req.headers.get("origin") || "").trim();
  const host = String(req.headers.get("host") || "").trim();
  const site = String(req.headers.get("sec-fetch-site") || "").toLowerCase();
  if (site === "cross-site") return false;
  if (!origin) return site === "same-origin" || site === "same-site" || site === "none" || !site;
  try {
    const url = new URL(origin);
    return Boolean(host) && url.host === host;
  } catch {
    return false;
  }
}
