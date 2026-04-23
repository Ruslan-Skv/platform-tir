'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';
import { getAvatarUrl } from '@/shared/lib/avatar';

import styles from './profile.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB (как в публичке)
const USER_DATA_KEY = 'user_data';
const ADMIN_USER_KEY = 'admin_user';

function syncUserToStorage(updatedUser: Record<string, unknown>) {
  const userJson = JSON.stringify(updatedUser);
  localStorage.setItem(ADMIN_USER_KEY, userJson);
  localStorage.setItem(USER_DATA_KEY, userJson);
  window.dispatchEvent(new Event('auth-token-changed'));
}

export default function AdminProfilePage() {
  const { user, getAuthHeaders, logout, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [avatarPath, setAvatarPath] = useState<string | null>(user?.avatar ?? null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setAvatarPath(user?.avatar ?? null);
  }, [user?.firstName, user?.lastName, user?.avatar]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) {
      setProfileError('Выберите изображение (JPG, PNG, WebP или GIF)');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setProfileError(`Размер файла не более ${MAX_AVATAR_SIZE_BYTES / 1024 / 1024} МБ`);
      return;
    }
    setProfileError('');
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiFetch(`${API_URL}/users/me/avatar`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка загрузки аватарки');
      }

      const { user: updatedUser } = await response.json();
      const { password: _p, ...userWithoutPassword } = updatedUser;
      setAvatarPath(updatedUser.avatar ?? null);
      setAvatarLoadError(false);
      syncUserToStorage(userWithoutPassword);
      await refreshUser();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Ошибка загрузки');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setProfileError('');
    setSavingProfile(true);
    try {
      const response = await apiFetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ avatar: null }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка удаления аватарки');
      }

      const updatedUser = await response.json();
      const { password: _p, ...userWithoutPassword } = updatedUser;
      setAvatarPath(null);
      setAvatarLoadError(false);
      syncUserToStorage(userWithoutPassword);
      await refreshUser();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Ошибка');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    setProfileError('');
    setSavingProfile(true);

    try {
      const response = await apiFetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ firstName, lastName }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка обновления профиля');
      }

      const updatedUser = await response.json();
      const { password: _p, ...userWithoutPassword } = updatedUser;
      setProfileMessage('Профиль успешно обновлён');
      syncUserToStorage(userWithoutPassword);
      await refreshUser();
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
      const response = await apiFetch(`${API_URL}/users/${user?.id}/password`, {
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

  const avatarUrl = avatarPath ? getAvatarUrl(avatarPath) : null;
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '?';

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Профиль</h1>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Личные данные</h2>

          <form onSubmit={handleUpdateProfile} className={styles.form}>
            {profileMessage && <div className={styles.success}>{profileMessage}</div>}
            {profileError && <div className={styles.error}>{profileError}</div>}

            <div className={styles.formGroup}>
              <label>Аватар</label>
              <div className={styles.avatarRow}>
                <div className={styles.avatarPreview}>
                  {avatarPath && !avatarLoadError && avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Аватар"
                      className={styles.avatarImage}
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    <span className={styles.avatarPlaceholder}>
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className={styles.avatarActions}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarFileChange}
                    className={styles.avatarInput}
                    aria-label="Выбрать файл"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={styles.avatarButton}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? 'Загрузка...' : 'Выбрать файл'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className={styles.avatarButtonSecondary}
                    disabled={savingProfile || !avatarPath}
                  >
                    Удалить
                  </button>
                </div>
              </div>
              <span className={styles.avatarHint}>JPG, PNG, WebP или GIF, не более 2 МБ</span>
            </div>

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
                type="text"
                id="email"
                value={user?.email ?? ''}
                disabled
                className={`${styles.input} ${styles.disabled}`}
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
