import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  getDashboardGuardForPath,
  resolveRedirectPath,
  type DashboardRole,
} from '@/lib/auth/roleGuard';

const PUBLIC_PATH_PREFIXES = ['/auth', '/_next', '/api', '/favicon', '/public'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const dashboardGuard = getDashboardGuardForPath(pathname);
  if (!dashboardGuard) {
    return NextResponse.next();
  }

  const role = req.cookies.get('dt_role')?.value as DashboardRole | undefined;

  if (role && dashboardGuard.allowedRoles.includes(role)) {
    return NextResponse.next();
  }

  const redirectPath = resolveRedirectPath(role, pathname);
  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

  return new NextResponse(null, { status: 403 });
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)'],
};
