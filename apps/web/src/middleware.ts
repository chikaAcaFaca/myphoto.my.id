import { NextRequest, NextResponse } from 'next/server';
import { isLocale, localeFromAcceptLanguage, LOCALE_COOKIE } from '@/i18n/config';

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

  // Language: an explicit ?lang=en|sr (shareable links) wins and is
  // remembered; otherwise the first visit is detected from Accept-Language
  // and pinned in a cookie so later requests don't flip.
  const queryLang = request.nextUrl.searchParams.get('lang');
  const cookieLang = request.cookies.get(LOCALE_COOKIE)?.value;
  const chosen = isLocale(queryLang)
    ? queryLang
    : isLocale(cookieLang)
      ? null
      : localeFromAcceptLanguage(request.headers.get('accept-language'));
  if (chosen) {
    // Make the choice visible to this very request's server components too.
    request.cookies.set(LOCALE_COOKIE, chosen);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(LOCALE_COOKIE, chosen, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|logo|manifest.json|sw.js|og-image).*)',
  ],
};
