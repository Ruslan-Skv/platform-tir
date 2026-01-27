'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';

import styles from './profile.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const MAX_AVATAR_SIZE_BYTES = 500 * 1024; // 500 KB

export default function AdminProfilePage() {
  const { user, getAuthHeaders, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(user?.avatar ?? null);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setAvatarDataUrl(user?.avatar ?? null);
  }, [user?.avatar]);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setProfileError('Выберите изображение (JPG, PNG или GIF)');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setProfileError(`Размер файла не более ${MAX_AVATAR_SIZE_BYTES / 1024} КБ`);
      return;
    }
    setProfileError('');
    const reader = new FileReader();
    reader.onload = () => setAvatarDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarDataUrl(null);
    setProfileError('');
  };

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
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          avatar: avatarDataUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка обновления профиля');
      }

      const updatedUser = await response.json();
      setProfileMessage('Профиль успешно обновлён');

      // Update localStorage with full user (including avatar)
      const savedUser = localStorage.getItem('admin_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        Object.assign(parsed, {
          firstName: updatedUser.firstName ?? firstName,
          lastName: updatedUser.lastName ?? lastName,
          email: updatedUser.email ?? email,
          avatar: updatedUser.avatar ?? avatarDataUrl,
        });
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
              <label>Аватар</label>
              <div className={styles.avatarRow}>
                <div className={styles.avatarPreview}>
                  {avatarDataUrl ? (
                    <img src={avatarDataUrl} alt="Аватар" className={styles.avatarImage} />
                  ) : (
                    <span className={styles.avatarPlaceholder}>
                      {user?.firstName?.charAt(0) || user?.email?.charAt(0) || '?'}
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
                  >
                    Выбрать файл
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className={styles.avatarButtonSecondary}
                  >
                    Удалить
                  </button>
                </div>
              </div>
              <span className={styles.avatarHint}>JPG, PNG или GIF, не более 500 КБ</span>
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
