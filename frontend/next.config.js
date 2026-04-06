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
};

module.exports = nextConfig;
