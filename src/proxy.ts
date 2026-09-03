import { NextRequest, NextResponse } from "next/server";

const publicPaths = new Set(["/login", "/tv/login"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/") || pathname.startsWith("/uploads/")) return NextResponse.next();
  if (publicPaths.has(pathname)) return request.cookies.has("vavive_session") ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  if (request.cookies.has("vavive_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
