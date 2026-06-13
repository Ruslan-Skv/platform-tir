'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { apiFetch } from '@/shared/lib/api-fetch';
import {
  type TokenLoginPayload,
  getApiBaseUrl,
  persistTokenResponse,
} from '@/shared/lib/auth-session';

import styles from './LoginPage.module.css';

function YandexCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const processCallback = useCallback(async () => {
    if (errorParam) {
      setStatus('error');
      setErrorMessage(
        errorParam === 'access_denied'
          ? 'Вы отменили вход через Яндекс'
          : 'Ошибка авторизации Яндекс'
      );
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('Отсутствует код авторизации');
      return;
    }

    try {
      const res = await apiFetch(`${getApiBaseUrl()}/auth/yandex/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus('error');
        setErrorMessage(data.message || 'Не удалось войти через Яндекс');
        return;
      }

      if (!data.access_token || !data.user) {
        setStatus('error');
        setErrorMessage('Некорректный ответ сервера');
        return;
      }

      persistTokenResponse(data as TokenLoginPayload);

      setStatus('success');
      router.replace('/profile');
    } catch {
      setStatus('error');
      setErrorMessage('Ошибка подключения к серверу');
    }
  }, [code, errorParam, router]);

  useEffect(() => {
    processCallback();
  }, [processCallback]);

  if (status === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Вход через Яндекс</h1>
          </div>
          <p className={styles.error}>{errorMessage}</p>
          <div className={styles.cancelBlock}>
            <Link href="/login" className={styles.cancelButton}>
              Вернуться к входу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Вход через Яндекс</h1>
        </div>
        <p className={styles.hint}>Выполняется вход...</p>
      </div>
    </div>
  );
}

export function YandexCallbackPageView() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.header}>
              <h1 className={styles.title}>Вход через Яндекс</h1>
            </div>
            <p className={styles.hint}>Выполняется вход...</p>
          </div>
        </div>
      }
    >
      <YandexCallbackContent />
    </Suspense>
  );
}
