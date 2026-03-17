/**
 * Service Worker для PWA
 * - StaleWhileRevalidate для API товаров и каталога
 * - Поддержка обновления приложения (skipWaiting)
 *
 * VERSION: __BUILD_ID__
 * Обновляется при каждой сборке для триггера проверки новой версии
 */
'use strict';

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.setConfig({ debug: false });

// Кэш для API товаров и каталога — StaleWhileRevalidate: сразу отдаём из кэша, обновляем в фоне
workbox.routing.registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/v1/products') || url.pathname.startsWith('/api/v1/home/'),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'tir-api-products',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 часа
      }),
    ],
  }),
  'GET'
);

// При получении команды — немедленно активировать новую версию (для попапа «Обновить»)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
