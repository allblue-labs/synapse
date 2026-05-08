import {NextResponse, type NextRequest} from 'next/server';

/**
 * Edge-level route guard.
 *
 *   • Public routes (`PUBLIC_PATHS` below) pass through untouched.
 *   • Everything else requires the `synapse_session` cookie. We only
 *     check *presence* — the API validates the JWT itself; an expired
 *     cookie still makes it to /workspace/* and the layout's
 *     `/users/me` 401 path bounces the user to /login from there.
 *
 * Static assets and Next internals are skipped via the `matcher`
 * config below — the middleware function never runs for them.
 */

const SESSION_COOKIE = 'synapse_session';

/**
 * Paths that don't require an authenticated session.
 *
 *   '/'         landing
 *   '/login'    auth surface
 *   '/register' future self-serve onboarding
 *   '/pricing'  public marketing pricing page
 *   '/modules'  public module catalog (read-only marketing view)
 */
const PUBLIC_PATHS: ReadonlyArray<string> = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/modules',
];

function isPublic(pathname: string): boolean {
  for (const p of PUBLIC_PATHS) {
    // `/` is the only path where exact-match is required — otherwise
    // it would match every route.
    if (p === '/') {
      if (pathname === '/') return true;
      continue;
    }
    if (pathname === p || pathname.startsWith(`${p}/`)) return true;
  }
  return false;
}

export function middleware(req: NextRequest) {
  const {pathname, search} = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Skip:
  //   - Next internals (_next/static, _next/image)
  //   - /api routes (none today, reserved)
  //   - root metadata files (favicon, robots, sitemap)
  //   - Any URL containing a file extension (.css, .js, .png, .woff2,
  //     .map, …) — covers /public assets and next/font output
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)',
  ],
};
