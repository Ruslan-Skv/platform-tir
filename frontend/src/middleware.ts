import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getQuizDomains(): string[] {
  const raw =
    process.env.QUIZ_DOMAINS || process.env.NEXT_PUBLIC_QUIZ_DOMAINS || 'mebel-na-zakaz-51.ru';
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase().split(':')[0])
    .filter(Boolean);
}

function isQuizHost(host: string, quizDomains: string[]): boolean {
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';
  return quizDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const quizDomains = getQuizDomains();
  const pathname = request.nextUrl.pathname;

  if (isQuizHost(host, quizDomains)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-quiz-host', host.split(':')[0]);

    if (
      pathname === '/' ||
      (pathname !== '/quiz' &&
        !pathname.startsWith('/quiz/') &&
        !pathname.startsWith('/api') &&
        !pathname.startsWith('/_next') &&
        !pathname.startsWith('/uploads'))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/quiz';
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)'],
};
