'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import styles from '../../../login/page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const USER_TOKEN_KEY = 'user_token';
const USER_DATA_KEY = 'user_data';
const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_USER_KEY = 'admin_user';

const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'MODERATOR',
  'SUPPORT',
  'PARTNER',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
];

export default function YandexCallbackPage() {
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
      const res = await fetch(`${API_URL}/auth/yandex/callback`, {
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

      const isAdmin = data.user && ADMIN_ROLES.includes(data.user.role);

      localStorage.setItem(USER_TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
      if (isAdmin) {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.user));
      } else {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_USER_KEY);
      }
      window.dispatchEvent(new Event('auth-token-changed'));

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
