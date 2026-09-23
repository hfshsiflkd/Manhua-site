import { NextResponse } from "next/server";
import { sameOriginRequest } from "@/lib/sessionOrigin";
import { fetchPageAccess } from "@/lib/fetchPageAccess";
import {
  SESSION_COOKIE_NAME,
  sealSession,
  sessionCookieOptions,
  sessionMaxAgeSec,
  sessionSecret,
  requestIsHttps,
} from "@/lib/sessionCookie";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function POST(req: Request) {
  if (!sameOriginRequest(req)) return json({ ok: false, code: "BAD_ORIGIN" }, 403);
  if (!sessionSecret()) return json({ ok: false, code: "SESSION_UNAVAILABLE" }, 503);
  let body: { token?: string; deviceId?: string } = {};
  try {
    body = (await req.json()) as { token?: string; deviceId?: string };
  } catch {
    return json({ ok: false, code: "BAD_BODY" }, 400);
  }
  const token = String(body.token || "").trim();
  const deviceId = String(body.deviceId || "").trim();
  if (!token) return json({ ok: false, code: "MISSING_TOKEN" }, 400);

  const { access, failed } = await fetchPageAccess(token, deviceId);
  if (failed) return json({ ok: false, code: "SESSION_UNAVAILABLE" }, 503);
  if (!access) return json({ ok: false, code: "INVALID_SESSION" }, 401);

  const maxAge = sessionMaxAgeSec(token);
  if (maxAge <= 0) return json({ ok: false, code: "INVALID_SESSION" }, 401);

  const sealed = await sealSession({ token, deviceId });
  if (!sealed) return json({ ok: false, code: "SESSION_UNAVAILABLE" }, 503);

  const res = json({
    ok: true,
    role: access.role,
    pages: access.pages,
    teamMember: access.teamMember,
    canPublishManhua: access.canPublishManhua,
    canCreateTeam: access.canCreateTeam,
  });
  res.cookies.set(SESSION_COOKIE_NAME, sealed, sessionCookieOptions(requestIsHttps(req), maxAge));
  return res;
}

export async function DELETE(req: Request) {
  if (!sameOriginRequest(req)) return json({ ok: false, code: "BAD_ORIGIN" }, 403);
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(requestIsHttps(req)),
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}
