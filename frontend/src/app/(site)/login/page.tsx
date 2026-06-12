'use client';

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

import React, { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { apiFetch } from '@/shared/lib/api-fetch';
import { getApiBaseUrl } from '@/shared/lib/auth-session';

import styles from './page.module.css';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useUserAuth();
  const router = useRouter();
  const [yandexLoading, setYandexLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleYandexLogin = async () => {
    setYandexLoading(true);
    try {
      const res = await apiFetch(`${getApiBaseUrl()}/auth/yandex`);
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
        else setError('Вход через Яндекс временно недоступен');
      } else {
        setError('Вход через Яндекс временно недоступен');
      }
    } catch {
      setError('Ошибка подключения к серверу');
    } finally {
      setYandexLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          router.push('/profile');
        } else {
          setError(result.error || 'Ошибка входа');
        }
      } else {
        if (password !== confirmPassword) {
          setError('Пароли не совпадают');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Пароль должен содержать минимум 6 символов');
          setIsLoading(false);
          return;
        }
        const result = await register(
          email,
          password,
          firstName || undefined,
          lastName || undefined
        );
        if (result.success) {
          router.push('/profile');
        } else {
          setError(result.error || 'Ошибка регистрации');
        }
      }
    } catch {
      setError('Произошла ошибка. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{isLogin ? 'Вход в личный кабинет' : 'Регистрация'}</h1>
          <button
            type="button"
            onClick={handleCancel}
            className={styles.closeButton}
            aria-label="Закрыть, передумал входить"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} autoComplete={isLogin ? 'off' : 'on'}>
          {!isLogin && (
            <>
              <div className={styles.field}>
                <label htmlFor="firstName" className={styles.label}>
                  Имя
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={styles.input}
                  placeholder="Введите имя"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="lastName" className={styles.label}>
                  Фамилия
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={styles.input}
                  placeholder="Введите фамилию"
                />
              </div>
            </>
          )}

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Введите email"
              required
              autoComplete={isLogin ? 'off' : 'email'}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Пароль
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${styles.input} ${styles.inputWithToggle}`}
                placeholder={isLogin ? 'Введите пароль' : 'Придумайте пароль'}
                required
                minLength={6}
                aria-describedby={!isLogin ? 'password-hint' : undefined}
                autoComplete={isLogin ? 'off' : 'new-password'}
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
            {!isLogin && (
              <div id="password-hint" className={styles.passwordHintBlock}>
                <p className={styles.passwordHint}>Пароль должен содержать:</p>
                <ul className={styles.passwordRules}>
                  <li className={password.length >= 6 ? styles.ruleMet : undefined}>
                    минимум 6 символов
                  </li>
                  <li className={password.length >= 8 ? styles.ruleMet : undefined}>
                    от 8 символов — надёжнее
                  </li>
                  <li
                    className={
                      /[a-zA-Zа-яА-ЯёЁ]/.test(password) && /\d/.test(password)
                        ? styles.ruleMet
                        : undefined
                    }
                  >
                    буквы и цифры — рекомендуется
                  </li>
                </ul>
              </div>
            )}
          </div>

          {!isLogin && (
            <div className={styles.field}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Подтвердите пароль
              </label>
              <div className={styles.passwordWrap}>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${styles.input} ${styles.inputWithToggle}`}
                  placeholder="Повторите пароль"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword ? 'Скрыть подтверждение' : 'Показать подтверждение'
                  }
                  title={showConfirmPassword ? 'Скрыть' : 'Показать'}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className={styles.passwordToggleIcon} aria-hidden />
                  ) : (
                    <EyeIcon className={styles.passwordToggleIcon} aria-hidden />
                  )}
                </button>
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          {isLogin && (
            <>
              <div className={styles.oauthBlock}>
                <button
                  type="button"
                  onClick={handleYandexLogin}
                  className={styles.yandexButton}
                  disabled={yandexLoading}
                >
                  {yandexLoading ? (
                    'Загрузка...'
                  ) : (
                    <>
                      <span className={styles.yandexIcon}>Я</span>
                      Войти через Яндекс ID
                    </>
                  )}
                </button>
              </div>
              <div className={styles.oauthDivider}>
                <span>или по email</span>
              </div>
            </>
          )}

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className={styles.switch}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setPassword('');
              setConfirmPassword('');
              setShowPassword(false);
              setShowConfirmPassword(false);
            }}
            className={styles.switchButton}
          >
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
          {isLogin && (
            <p className={styles.forgotPassword}>
              <Link href="/forgot-password" className={styles.forgotPasswordLink}>
                Забыли пароль?
              </Link>
            </p>
          )}
          {isLogin && (
            <p className={styles.hint}>
              Сайт не хранит пароль в поле: автозаполнение делает браузер, если вы сохраняли вход.
            </p>
          )}
        </div>

        <div className={styles.cancelBlock}>
          <button type="button" onClick={handleCancel} className={styles.cancelButton}>
            Передумал — вернуться на сайт
          </button>
        </div>
      </div>
    </div>
  );
}
