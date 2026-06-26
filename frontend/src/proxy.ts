import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getQuizDomains(): string[] {
  const raw =
    process.env.QUIZ_DOMAINS ||
    process.env.NEXT_PUBLIC_QUIZ_DOMAINS ||
    'mebel-na-zakaz-51.ru,remont-kvartir-51.ru';
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase().split(':')[0])
    .filter(Boolean);
}

function isQuizHost(host: string, quizDomains: string[]): boolean {
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';
  return quizDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}

/** Статика из public/ — не переписывать на /quiz (фавикон, фон, картинки квиза). */
function isPublicAssetPath(pathname: string): boolean {
  return (
    pathname === '/favicon.ico' ||
    pathname === '/favicon.svg' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/quiz/') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads')
  );
}

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const quizDomains = getQuizDomains();
  const pathname = request.nextUrl.pathname;

  if (isQuizHost(host, quizDomains)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-quiz-host', host.split(':')[0]);

    if (isPublicAssetPath(pathname)) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (pathname === '/' || (!pathname.startsWith('/quiz') && !pathname.startsWith('/quiz/'))) {
      const url = request.nextUrl.clone();
      url.pathname = '/quiz';
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|manifest.webmanifest).*)'],
};
