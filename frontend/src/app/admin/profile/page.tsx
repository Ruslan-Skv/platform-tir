'use client';

import { useState } from 'react';

import { useAuth } from '@/features/auth';

import styles from './profile.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function AdminProfilePage() {
  const { user, getAuthHeaders, logout } = useAuth();

  // Profile form
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    setProfileError('');
    setSavingProfile(true);

    try {
      const response = await fetch(`${API_URL}/users/${user?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ firstName, lastName, email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка обновления профиля');
      }

      setProfileMessage('Профиль успешно обновлён');

      // Update localStorage
      const savedUser = localStorage.getItem('admin_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.firstName = firstName;
        parsed.lastName = lastName;
        parsed.email = email;
        localStorage.setItem('admin_user', JSON.stringify(parsed));
      }

      // Reload page to update header
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Ошибка');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Пароль должен быть не менее 6 символов');
      return;
    }

    setSavingPassword(true);

    try {
      const response = await fetch(`${API_URL}/users/${user?.id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка смены пароля');
      }

      setPasswordMessage('Пароль успешно изменён. Войдите заново.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Logout after password change
      setTimeout(() => {
        logout();
        window.location.href = '/admin/login';
      }, 2000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Ошибка');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Профиль</h1>

      <div className={styles.grid}>
        {/* Profile Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Личные данные</h2>

          <form onSubmit={handleUpdateProfile} className={styles.form}>
            {profileMessage && <div className={styles.success}>{profileMessage}</div>}
            {profileError && <div className={styles.error}>{profileError}</div>}

            <div className={styles.formGroup}>
              <label htmlFor="firstName">Имя</label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastName">Фамилия</label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Роль</label>
              <input
                type="text"
                value={user?.role === 'ADMIN' ? 'Администратор' : user?.role || ''}
                disabled
                className={`${styles.input} ${styles.disabled}`}
              />
            </div>

            <button type="submit" disabled={savingProfile} className={styles.button}>
              {savingProfile ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Смена пароля</h2>

          <form onSubmit={handleChangePassword} className={styles.form}>
            {passwordMessage && <div className={styles.success}>{passwordMessage}</div>}
            {passwordError && <div className={styles.error}>{passwordError}</div>}

            <div className={styles.formGroup}>
              <label htmlFor="currentPassword">Текущий пароль</label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="newPassword">Новый пароль</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Подтвердите пароль</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={styles.input}
              />
            </div>

            <button type="submit" disabled={savingPassword} className={styles.button}>
              {savingPassword ? 'Сохранение...' : 'Сменить пароль'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
