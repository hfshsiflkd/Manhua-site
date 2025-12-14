// src/lib/deviceCookie.ts
export function getDeviceIdFromCookie(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)device_id=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}
