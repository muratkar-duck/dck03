import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Basit cookie tabanlı kontrol: dt_role = 'producer' | 'writer'
// Cookie yoksa engelleme (AuthGuard/yönlendirme zaten sayfalarda var).

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auth ve statik yolları es geç
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // Dashboard root'u engelleme (kendi yönlendirmesi var)
  if (pathname === '/dashboard') return NextResponse.next();

  const role = req.cookies.get('dt_role')?.value;

  // Producer alanı
  if (pathname.startsWith('/dashboard/producer')) {
    if (role && role !== 'producer') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Writer alanı
  if (pathname.startsWith('/dashboard/writer')) {
    if (role && role !== 'writer') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)'], // tüm sayfa istekleri (statikleri hariç)
};
