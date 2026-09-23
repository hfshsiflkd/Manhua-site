export const INTERNAL_PATH_HEADER = "x-arc-pathname";

export function trustedProxyHeaders(incoming: Headers, pathname: string): Headers {
  const headers = new Headers(incoming);
  for (const key of [...headers.keys()]) {
    if (key.toLowerCase().startsWith("x-arc-")) headers.delete(key);
  }
  headers.set(INTERNAL_PATH_HEADER, pathname);
  return headers;
}
