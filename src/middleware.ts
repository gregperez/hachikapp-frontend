import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has("base_access") || request.cookies.has("base_refresh");
  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
