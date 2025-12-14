// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "device_id";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const has = req.cookies.get(COOKIE)?.value;
  if (!has) {
    const id = `dev_${Date.now().toString(16)}_${Math.random()
      .toString(16)
      .slice(2)}`;

    res.cookies.set(COOKIE, id, {
      path: "/",
      httpOnly: false, // client JS уншиж болно
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}

// бүх route дээр ажиллуулъя (хүсвэл нарийсгаж болно)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
