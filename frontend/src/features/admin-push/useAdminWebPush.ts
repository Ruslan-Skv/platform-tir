'use client';

import { useCallback, useEffect, useRef } from 'react';

import { getAdminNotificationsSettings } from '@/shared/api/admin-notifications';
import {
  getAdminPushVapidPublicKey,
  serializePushSubscription,
  subscribeAdminPush,
  unsubscribeAdminPush,
  urlBase64ToUint8Array,
} from '@/shared/api/admin-push-notifications';

type UseAdminWebPushOptions = {
  enabled: boolean;
};

async function ensureServiceWorkerRegistration() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

export function useAdminWebPush({ enabled }: UseAdminWebPushOptions) {
  const subscriptionRef = useRef<PushSubscription | null>(null);
  const syncingRef = useRef(false);

  const unsubscribeCurrent = useCallback(async () => {
    const subscription = subscriptionRef.current;
    if (!subscription) return;
    try {
      await unsubscribeAdminPush(serializePushSubscription(subscription));
      await subscription.unsubscribe();
    } catch {
      /* ignore */
    } finally {
      subscriptionRef.current = null;
    }
  }, []);

  const syncPushSubscription = useCallback(async () => {
    if (!enabled || syncingRef.current) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    syncingRef.current = true;
    try {
      const settings = await getAdminNotificationsSettings();
      if (!settings.desktopNotifications) {
        await unsubscribeCurrent();
        return;
      }
      if (Notification.permission !== 'granted') {
        return;
      }

      const publicKey = await getAdminPushVapidPublicKey();
      if (!publicKey) return;

      const registration = await ensureServiceWorkerRegistration();
      if (!registration) return;
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      subscriptionRef.current = subscription;
      await subscribeAdminPush(serializePushSubscription(subscription));
    } catch {
      /* ignore — push optional */
    } finally {
      syncingRef.current = false;
    }
  }, [enabled, unsubscribeCurrent]);

  useEffect(() => {
    if (!enabled) {
      void unsubscribeCurrent();
      return;
    }
    void syncPushSubscription();
  }, [enabled, syncPushSubscription, unsubscribeCurrent]);

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => void syncPushSubscription();
    const onSyncRequest = () => void syncPushSubscription();
    window.addEventListener('focus', onFocus);
    window.addEventListener('admin-push-sync', onSyncRequest);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('admin-push-sync', onSyncRequest);
    };
  }, [enabled, syncPushSubscription]);

  return { syncPushSubscription, unsubscribeCurrent };
}
