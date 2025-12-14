// src/lib/deviceCookie.ts
export const DEVICE_COOKIE = "device_id";

// ✅ Client: cookie-с уншина
export function getDeviceIdFromCookieClient(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${DEVICE_COOKIE}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
}

// ✅ Client: байхгүй бол үүсгээд cookie-д хадгална
export function ensureDeviceIdCookieClient(): string {
  if (typeof document === "undefined") return "";
  let id = getDeviceIdFromCookieClient();
  if (!id) {
    id =
      (crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(16).slice(2)}`) + "";
    // SameSite=Lax нь Vercel дээр OK, Secure нь https дээр OK
    document.cookie = `${DEVICE_COOKIE}=${encodeURIComponent(
      id
    )}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
  }
  return id;
}
