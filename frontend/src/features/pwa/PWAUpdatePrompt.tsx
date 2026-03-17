'use client';

import React, { useCallback, useEffect, useState } from 'react';

import styles from './PWAUpdatePrompt.module.css';

export const PWAUpdatePrompt: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let reg: ServiceWorkerRegistration | undefined;

    const registerSW = async () => {
      try {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        setRegistration(reg);

        // Проверяем, есть ли ожидающая версия (обновление уже загружено)
        if (reg.waiting) {
          setUpdateAvailable(true);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg!.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      } catch {
        // SW не зарегистрирован (например, не HTTPS в dev)
      }
    };

    registerSW();

    // Слушаем смену контроллера (после skipWaiting) — страница перезагрузится
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return () => {
      reg?.removeEventListener('updatefound', () => {});
    };
  }, []);

  const handleUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }, [registration]);

  const handleDismiss = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className={styles.banner} role="alert" aria-live="polite">
      <p className={styles.text}>Доступна новая версия. Обновить?</p>
      <div className={styles.actions}>
        <button type="button" className={styles.buttonUpdate} onClick={handleUpdate}>
          Обновить
        </button>
        <button
          type="button"
          className={styles.buttonDismiss}
          onClick={handleDismiss}
          aria-label="Закрыть"
        >
          Позже
        </button>
      </div>
    </div>
  );
};
