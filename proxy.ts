import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admins";

/**
 * Gates pages: the deck at / needs an Elastio Google sign-in, and /admin
 * additionally needs admin. /api/admin routes check for themselves (see
 * currentAdminEmail in lib/admins.ts) — keeping them out of the matcher also
 * stops proxy from buffering local deck uploads, which exceed its 10 MB
 * request-body cap.
 */
export const proxy = auth(async (req) => {
  const email = req.auth?.user?.email;

  if (!email) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    const callbackUrl = req.nextUrl.pathname + req.nextUrl.search;
    if (callbackUrl !== "/") loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (req.nextUrl.pathname.startsWith("/admin") && !(await isAdmin(email))) {
    return NextResponse.rewrite(new URL("/no-access", req.nextUrl.origin), { status: 403 });
  }
});

export const config = {
  matcher: ["/", "/admin/:path*"],
};
