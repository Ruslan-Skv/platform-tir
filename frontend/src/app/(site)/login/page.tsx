'use client';

import React, { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';

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
    } catch (err) {
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

        <form onSubmit={handleSubmit} className={styles.form}>
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
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Введите email"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Введите пароль"
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
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
          )}

          {error && <div className={styles.error}>{error}</div>}

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
            }}
            className={styles.switchButton}
          >
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
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
