import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const AUTH_PAGES = ["/login", "/signup"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = Boolean(getSessionCookie(request))
  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  )

  if (!hasSession && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL("/tickets", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next|static|.*\\..*).*)"],
}
