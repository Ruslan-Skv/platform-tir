'use client';

import { EyeIcon, EyeSlashIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { useTheme } from '@/features/theme';
import { AdminPlatformBrand } from '@/shared/ui/AdminPlatformBrand';
import { Modal } from '@/shared/ui/Modal';

import styles from './login.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { isDarkTheme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);

    if (result.success) {
      router.push('/admin');
    } else {
      setError(result.error || 'Ошибка входа');
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${styles.adminThemeScope}`}>
      <button
        type="button"
        onClick={toggleTheme}
        className={styles.themeToggle}
        title={isDarkTheme ? 'Светлая тема' : 'Тёмная тема'}
        aria-label={isDarkTheme ? 'Светлая тема' : 'Тёмная тема'}
      >
        {isDarkTheme ? (
          <SunIcon className={styles.themeIcon} />
        ) : (
          <MoonIcon className={styles.themeIcon} />
        )}
      </button>
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Вход в цифровую платформу"
        size="sm"
        showCloseButton={false}
        className={styles.loginModalPanel}
        titleClassName={styles.loginModalTitle}
      >
        <div className={styles.loginCard}>
          <div className={styles.logo}>
            <AdminPlatformBrand size="login" />
          </div>

          <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoComplete="off"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Пароль</label>
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="off"
                  className={`${styles.input} ${styles.inputWithToggle}`}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  title={showPassword ? 'Скрыть' : 'Показать'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className={styles.passwordToggleIcon} aria-hidden />
                  ) : (
                    <EyeIcon className={styles.passwordToggleIcon} aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
              {isSubmitting ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className={styles.footer}>
            <p className={styles.hint}>
              Пароль в приложении не хранится: если поля заполняются сами — это браузер (сохранённые
              логины). На чужом ПК отключите автозаполнение для этого сайта в настройках браузера.
            </p>
            <p className={styles.hint}>
              Регистрировались через Яндекс? Задайте пароль через{' '}
              <Link href="/forgot-password" className={styles.inlineLink}>
                восстановление пароля
              </Link>{' '}
              на сайте, затем войдите сюда с email и новым паролем.
            </p>
            <Link href="/" className={styles.backLink}>
              ← Вернуться на сайт
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}
