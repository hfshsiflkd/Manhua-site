import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, sessionSecret, unsealSession } from "@/lib/sessionCookie";
import { fetchPageAccess } from "@/lib/fetchPageAccess";
import { decideDocumentGate, isProtectedAppPath } from "@/lib/pageAccess";

const UNAVAILABLE_HTML = `<!doctype html>
<html lang="mn">
  <head>
    <meta charset="utf-8"/>
    <meta name="robots" content="noindex"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Сервис түр ажиллахгүй байна</title>
  </head>
  <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#07070e;color:#f4f4f5;font-family:system-ui,sans-serif">
    <main style="max-width:28rem;padding:2rem;text-align:center">
      <h1 style="font-size:1.25rem;margin:0 0 .75rem">Сервис түр ажиллахгүй байна</h1>
      <p style="margin:0;color:#a1a1aa">Дараа дахин оролдоно уу.</p>
    </main>
  </body>
</html>`;

function withNoStore(res: NextResponse) {
  res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return res;
}

function deny(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/access-denied";
  url.search = "";
  return withNoStore(NextResponse.rewrite(url));
}

function unavailable() {
  return withNoStore(
    new NextResponse(UNAVAILABLE_HTML, {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  );
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (!isProtectedAppPath(pathname)) return NextResponse.next();

  const secret = sessionSecret();
  const raw = req.cookies.get(SESSION_COOKIE_NAME)?.value || "";
  if (!secret) {
    return raw ? unavailable() : deny(req);
  }

  const session = raw ? await unsealSession(raw, secret) : null;
  let access = null;
  let fetchFailed = false;
  if (session?.token) {
    const result = await fetchPageAccess(session.token, session.deviceId);
    access = result.access;
    fetchFailed = result.failed;
  }

  const decision = decideDocumentGate({
    pathname,
    cookieValid: Boolean(session?.token),
    fetchFailed,
    access,
  });
  if (decision === "unavailable") return unavailable();
  if (decision === "notfound") return deny(req);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-arc-pathname", pathname);
  return withNoStore(
    NextResponse.next({
      request: { headers: requestHeaders },
    })
  );
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/editor", "/editor/:path*"],
};
