// src/lib/device.ts
export const DEVICE_KEY = "mh_device_id";

 function getDeviceId(): string {
  // Next SSR дээр window байхгүй тул хамгаална
  if (typeof window === "undefined") return "server";

  let id = localStorage.getItem(DEVICE_KEY);
  if (id) return id;

  // Simple unique id (хангалттай)
  const rand = Math.random().toString(16).slice(2);
  id = `dev_${Date.now().toString(16)}_${rand}`;

  localStorage.setItem(DEVICE_KEY, id);
  return id;
}
export default getDeviceId;
