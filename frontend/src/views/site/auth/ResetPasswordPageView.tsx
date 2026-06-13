'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { apiFetch } from '@/shared/lib/api-fetch';

import styles from './LoginPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const _router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (password.length < 6) {
        setError('Пароль должен содержать минимум 6 символов');
        return;
      }
      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
      if (!token) {
        setError('Отсутствует ссылка для сброса пароля. Запросите восстановление заново.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await apiFetch(`${API_URL}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: password }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(data.message || 'Не удалось сбросить пароль. Ссылка могла истечь.');
          setIsLoading(false);
          return;
        }

        setSuccess(true);
      } catch {
        setError('Не удалось отправить запрос. Проверьте подключение к интернету.');
      } finally {
        setIsLoading(false);
      }
    },
    [token, password, confirmPassword]
  );

  useEffect(() => {
    if (!token) {
      setError('Отсутствует ссылка для сброса пароля. Запросите восстановление пароля заново.');
    }
  }, [token]);

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Пароль изменён</h1>
          </div>
          <p className={styles.successText}>
            Ваш пароль успешно изменён. Теперь вы можете войти с новым паролем.
          </p>
          <div className={styles.cancelBlock}>
            <Link href="/login" className={styles.cancelButton}>
              Войти в личный кабинет
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
          <h1 className={styles.title}>Новый пароль</h1>
        </div>

        {!token ? (
          <div className={styles.form}>
            <div className={styles.error}>
              Отсутствует ссылка для сброса пароля. Перейдите по ссылке из письма или{' '}
              <Link href="/forgot-password" className={styles.forgotPasswordLink}>
                запросите восстановление заново
              </Link>
              .
            </div>
            <div className={styles.cancelBlock}>
              <Link href="/login" className={styles.cancelButton}>
                Вернуться к входу
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className={styles.hint}>Придумайте новый пароль для входа в личный кабинет.</p>

            <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>
                  Новый пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Минимум 6 символов"
                  required
                  minLength={6}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Подтвердите пароль
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Повторите пароль"
                  required
                  minLength={6}
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <button type="submit" className={styles.submitButton} disabled={isLoading}>
                {isLoading ? 'Сохранение...' : 'Сохранить пароль'}
              </button>
            </form>

            <div className={styles.cancelBlock}>
              <Link href="/login" className={styles.cancelButton}>
                Вернуться к входу
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ResetPasswordPageView() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.header}>
              <h1 className={styles.title}>Новый пароль</h1>
            </div>
            <p className={styles.hint}>Загрузка...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
