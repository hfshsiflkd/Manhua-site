export const CANONICAL_SITE_ORIGIN = "https://www.arc-read.com";

export function canonicalSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_SITE_ORIGIN;
  try {
    const u = new URL(raw);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      return CANONICAL_SITE_ORIGIN;
    }
    return `${u.protocol}//${u.host}`.replace(/\/$/, "");
  } catch {
    return CANONICAL_SITE_ORIGIN;
  }
}

export function creatorPublicUrl(id: string): string {
  return `${canonicalSiteOrigin()}/creators/${id}`;
}

export function creatorPublicPath(id: string): string {
  return `/creators/${id}`;
}
