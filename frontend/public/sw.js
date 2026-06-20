/**
 * Service Worker для PWA
 * - StaleWhileRevalidate для API товаров и каталога
 * - Поддержка обновления приложения (skipWaiting)
 *
 * VERSION: mmyu8il3
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

self.addEventListener('push', (event) => {
  let payload = { title: 'Уведомление', body: '', url: '/admin', tag: 'admin-notification' };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    /* ignore malformed payload */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      data: { url: payload.url },
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin';
  const absoluteUrl = targetUrl.startsWith('http')
    ? targetUrl
    : `${self.location.origin}${targetUrl}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then(() => {
            if ('navigate' in client && typeof client.navigate === 'function') {
              return client.navigate(absoluteUrl);
            }
            return undefined;
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }
      return undefined;
    })
  );
});
