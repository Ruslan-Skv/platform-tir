'use client';

import React, { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { apiFetch } from '@/shared/lib/api-fetch';

import styles from '../login/page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await apiFetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Произошла ошибка. Попробуйте позже.');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Не удалось отправить запрос. Проверьте подключение к интернету.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/login');
  };

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Проверьте почту</h1>
          </div>
          <p className={styles.successText}>
            Если аккаунт с указанным email существует, мы отправили ссылку для восстановления
            пароля. Проверьте папку «Спам», если письмо не пришло.
          </p>
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
          <h1 className={styles.title}>Восстановление пароля</h1>
          <button
            type="button"
            onClick={handleBack}
            className={styles.closeButton}
            aria-label="Вернуться"
          >
            ×
          </button>
        </div>

        <p className={styles.hint}>
          Укажите email, привязанный к вашему аккаунту. Мы отправим ссылку для сброса пароля.
        </p>

        <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Введите email"
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Отправка...' : 'Отправить ссылку'}
          </button>
        </form>

        <div className={styles.cancelBlock}>
          <button type="button" onClick={handleBack} className={styles.cancelButton}>
            Вернуться к входу
          </button>
        </div>
      </div>
    </div>
  );
}
