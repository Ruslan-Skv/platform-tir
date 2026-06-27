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
    ],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
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
