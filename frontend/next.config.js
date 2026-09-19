/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  devIndicators: false,
  sassOptions: {
    includePaths: ['./src/shared/styles'],
  },
  async redirects() {
    return [
      // «ДП» перенесён из CRM на верхний уровень — старые закладки ведём на новый адрес
      { source: '/admin/crm/dp', destination: '/admin/dp', permanent: true },
    ];
  },
  async rewrites() {
    const apiTarget = process.env.API_INTERNAL_URL || 'http://localhost:3001';
    return [
      // Браузер по умолчанию запрашивает /favicon.ico — отдаём favicon.svg
      { source: '/favicon.ico', destination: '/favicon.svg' },
      // Проксирование API: в Docker бэкенд доступен как backend:3001
      { source: '/api/v1/:path*', destination: `${apiTarget}/api/v1/:path*` },
      // Загрузки (бэйджи карточки и др.) — те же относительные URL, что и в проде за nginx
      { source: '/uploads/:path*', destination: `${apiTarget}/uploads/:path*` },
    ];
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'psk-pobeda.ru',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '436830.ru',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.436830.ru',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    // connect-src собираем из фактических origin'ов окружения, а не из разрешительного https:
    const connectOrigins = new Set(['self']);
    for (const raw of [
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
      'http://localhost:3001',
    ]) {
      if (!raw) continue;
      try {
        const u = new URL(raw);
        connectOrigins.add(u.origin);
        if (u.protocol === 'https:') connectOrigins.add(`wss://${u.host}`);
        if (u.protocol === 'http:') connectOrigins.add(`ws://${u.host}`);
      } catch {
        // невалидный URL окружения — пропускаем
      }
    }
    const connectSrc = [...connectOrigins].map((o) => (o === 'self' ? "'self'" : o));
    // в dev Next.js использует eval (React Refresh); в проде — запрещаем
    const scriptSrc = isProd ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'";
    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${connectSrc.join(' ')} http://localhost:* ws://localhost:*`,
      "media-src 'self' blob: https:",
      "frame-src 'self' https://oauth.yandex.ru https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://rutube.ru https://vk.com https://vkvideo.ru",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
