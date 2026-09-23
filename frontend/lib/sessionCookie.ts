export const SESSION_COOKIE_NAME = "arc_session";
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export type SealedSession = {
  token: string;
  deviceId: string;
};

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) throw new Error("bad hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function b64urlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toHex(sig);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const left = fromHex(a);
  const right = fromHex(b);
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export function sessionSecret(): string {
  return String(process.env.SESSION_BRIDGE_SECRET || "").trim();
}

export async function sealSession(payload: SealedSession, secret = sessionSecret()): Promise<string | null> {
  if (!secret || !payload?.token) return null;
  const body = b64urlEncode(
    JSON.stringify({
      v: 1,
      token: payload.token,
      deviceId: String(payload.deviceId || ""),
      iat: Date.now(),
    })
  );
  const sig = await hmacHex(secret, body);
  return `v1.${body}.${sig}`;
}

export async function unsealSession(value: string, secret = sessionSecret()): Promise<SealedSession | null> {
  if (!secret || !value) return null;
  const parts = String(value).split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, body, sig] = parts;
  const expected = await hmacHex(secret, body);
  if (!timingSafeEqualHex(sig.toLowerCase(), expected.toLowerCase())) return null;
  try {
    const parsed = JSON.parse(b64urlDecode(body)) as { v?: number; token?: string; deviceId?: string };
    if (parsed.v !== 1 || !parsed.token) return null;
    return { token: parsed.token, deviceId: String(parsed.deviceId || "") };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(isProd: boolean) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}
