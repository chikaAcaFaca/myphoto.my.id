import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Redirect alternate domains to canonical myphotomy.space
  if (
    host === 'myphoto-my.space' ||
    host === 'www.myphoto-my.space' ||
    host === 'www.myphotomy.space' ||
    host === 'mycamerabackup.com' ||
    host === 'www.mycamerabackup.com'
  ) {
    const pathname = request.nextUrl.pathname;
    const search = request.nextUrl.search;
    return NextResponse.redirect(
      new URL(`https://myphotomy.space${pathname}${search}`),
      301
    );
  }

  // Redirect old /mydisk route to /myspace
  if (request.nextUrl.pathname.startsWith('/mydisk')) {
    const url = request.nextUrl.clone();
    url.pathname = url.pathname.replace('/mydisk', '/myspace');
    return NextResponse.redirect(url, 301);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|logo|manifest.json|sw.js|og-image).*)',
  ],
};
