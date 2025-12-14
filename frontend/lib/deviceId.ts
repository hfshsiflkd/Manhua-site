// src/lib/deviceId.ts
export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return "";

  const key = "device_id";
  let id = localStorage.getItem(key);

  if (!id) {
    id =
      (crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(16).slice(2)}`) + "";
    localStorage.setItem(key, id);
  }

  return id;
}
