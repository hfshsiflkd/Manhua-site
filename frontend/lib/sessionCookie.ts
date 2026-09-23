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

function b64urlEncodeBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecodeBytes(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlDecode(text: string): string {
  return new TextDecoder().decode(b64urlDecodeBytes(text));
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

async function aesKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function sessionSecret(): string {
  return String(process.env.SESSION_BRIDGE_SECRET || "").trim();
}

function parsePayload(parsed: { v?: number; token?: string; deviceId?: string }): SealedSession | null {
  if (!parsed?.token) return null;
  return { token: parsed.token, deviceId: String(parsed.deviceId || "") };
}

async function unsealV1(body: string, sig: string, secret: string): Promise<SealedSession | null> {
  const expected = await hmacHex(secret, body);
  if (!timingSafeEqualHex(sig.toLowerCase(), expected.toLowerCase())) return null;
  try {
    return parsePayload(JSON.parse(b64urlDecode(body)) as { v?: number; token?: string; deviceId?: string });
  } catch {
    return null;
  }
}

export async function sealSession(payload: SealedSession, secret = sessionSecret()): Promise<string | null> {
  if (!secret || !payload?.token) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(secret);
  const plain = new TextEncoder().encode(
    JSON.stringify({
      v: 2,
      token: payload.token,
      deviceId: String(payload.deviceId || ""),
      iat: Date.now(),
    })
  );
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  return `v2.${b64urlEncodeBytes(iv)}.${b64urlEncodeBytes(cipher)}`;
}

export async function unsealSession(value: string, secret = sessionSecret()): Promise<SealedSession | null> {
  if (!secret || !value) return null;
  const parts = String(value).split(".");
  if (parts[0] === "v2" && parts.length === 3) {
    try {
      const ivBytes = b64urlDecodeBytes(parts[1]);
      const cipherBytes = b64urlDecodeBytes(parts[2]);
      const iv = new Uint8Array(ivBytes.byteLength);
      iv.set(ivBytes);
      const cipher = new Uint8Array(cipherBytes.byteLength);
      cipher.set(cipherBytes);
      const key = await aesKey(secret);
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
      return parsePayload(JSON.parse(new TextDecoder().decode(plain)) as { token?: string; deviceId?: string });
    } catch {
      return null;
    }
  }
  if (parts[0] === "v1" && parts.length === 3) {
    return unsealV1(parts[1], parts[2], secret);
  }
  return null;
}

export function requestIsHttps(req: Request): boolean {
  const xf = String(req.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  if (xf) return xf === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
    expires: new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000),
  };
}
