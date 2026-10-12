import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/session";

const LOCALES = ["bg", "en"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin area: must be logged in (pages also re-check on the server)
  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith("/admin/login")) return NextResponse.next();
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Public site: make sure every URL starts with /bg or /en
  const first = pathname.split("/")[1];
  if (!LOCALES.includes(first)) {
    const accept = req.headers.get("accept-language") || "";
    const lang = /^en/i.test(accept) && !/bg/i.test(accept) ? "en" : "bg";
    const url = req.nextUrl.clone();
    url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|uploads|favicon.ico|favicon.png|apple-icon.png|logo.png|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)"],
};
