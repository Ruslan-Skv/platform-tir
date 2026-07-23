'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { getRoleLabel } from '@/shared/config/admin-roles';
import { apiFetch } from '@/shared/lib/api-fetch';
import { getAvatarUrl } from '@/shared/lib/avatar';

import styles from './AdminProfileModal.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB (как в публичке)
const USER_DATA_KEY = 'user_data';
const ADMIN_USER_KEY = 'admin_user';

type ProfileFormSnapshot = {
  firstName: string;
  lastName: string;
  jobTitle: string;
};

function syncUserToStorage(updatedUser: Record<string, unknown>) {
  const userJson = JSON.stringify(updatedUser);
  localStorage.setItem(ADMIN_USER_KEY, userJson);
  localStorage.setItem(USER_DATA_KEY, userJson);
  window.dispatchEvent(new Event('auth-token-changed'));
}

function snapshotFromUser(
  user: {
    firstName?: string | null;
    lastName?: string | null;
    jobTitle?: string | null;
  } | null
): ProfileFormSnapshot {
  return {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    jobTitle: user?.jobTitle || '',
  };
}

function normalizeProfileForm(form: ProfileFormSnapshot): ProfileFormSnapshot {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    jobTitle: form.jobTitle.trim(),
  };
}

function profileFormsEqual(a: ProfileFormSnapshot, b: ProfileFormSnapshot): boolean {
  const left = normalizeProfileForm(a);
  const right = normalizeProfileForm(b);
  return (
    left.firstName === right.firstName &&
    left.lastName === right.lastName &&
    left.jobTitle === right.jobTitle
  );
}

type AdminProfileFormProps = {
  onClose: () => void;
  onSaved: () => void;
  clearSaveSuccess: () => void;
  saveSuccessVisible: boolean;
};

export function AdminProfileForm({
  onClose,
  onSaved,
  clearSaveSuccess,
  saveSuccessVisible,
}: AdminProfileFormProps) {
  const { user, getAuthHeaders, logout, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialSnapshot = snapshotFromUser(user);
  const [firstName, setFirstName] = useState(initialSnapshot.firstName);
  const [lastName, setLastName] = useState(initialSnapshot.lastName);
  const [jobTitle, setJobTitle] = useState(initialSnapshot.jobTitle);
  const [savedSnapshot, setSavedSnapshot] = useState<ProfileFormSnapshot>(initialSnapshot);
  const [avatarPath, setAvatarPath] = useState<string | null>(user?.avatar ?? null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const currentForm: ProfileFormSnapshot = { firstName, lastName, jobTitle };
  const hasProfileChanges = !profileFormsEqual(currentForm, savedSnapshot);
  const canSubmitPassword = Boolean(currentPassword && newPassword.length >= 6 && confirmPassword);
  const busy = savingProfile || uploadingAvatar || savingPassword;

  useEffect(() => {
    if (hasProfileChanges && saveSuccessVisible) {
      clearSaveSuccess();
    }
  }, [clearSaveSuccess, hasProfileChanges, saveSuccessVisible]);

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
    clearSaveSuccess();
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
      onSaved();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Ошибка загрузки');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setProfileError('');
    clearSaveSuccess();
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
      onSaved();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Ошибка');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProfile || !hasProfileChanges) return;

    const nextSnapshot = normalizeProfileForm(currentForm);
    setProfileError('');
    clearSaveSuccess();
    setSavingProfile(true);

    try {
      const response = await apiFetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          firstName: nextSnapshot.firstName,
          lastName: nextSnapshot.lastName,
          jobTitle: nextSnapshot.jobTitle || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка обновления профиля');
      }

      const updatedUser = await response.json();
      const { password: _p, ...userWithoutPassword } = updatedUser;
      setFirstName(nextSnapshot.firstName);
      setLastName(nextSnapshot.lastName);
      setJobTitle(nextSnapshot.jobTitle);
      setSavedSnapshot(nextSnapshot);
      syncUserToStorage(userWithoutPassword);
      await refreshUser();
      onSaved();
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

    clearSaveSuccess();
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
      onSaved();

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
    <div className={styles.formsStack}>
      <form
        className={styles.formShell}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleUpdateProfile(e)}
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Личные данные отображаются в шапке админки. Email и роль в системе меняются отдельно.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
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
                  onChange={(e) => void handleAvatarFileChange(e)}
                  className={styles.avatarInput}
                  aria-label="Выбрать файл"
                />
                <button
                  type="button"
                  data-modal-btn="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  {uploadingAvatar ? 'Загрузка…' : 'Выбрать файл'}
                </button>
                <button
                  data-admin-allow-readonly
                  type="button"
                  data-modal-btn="secondary"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={busy || !avatarPath}
                >
                  Удалить
                </button>
              </div>
            </div>
            <span className={styles.fieldHint}>JPG, PNG, WebP или GIF, не более 2 МБ</span>
          </div>

          <div data-modal-form-group>
            <label htmlFor="profile-firstName">Имя</label>
            <input
              type="text"
              id="profile-firstName"
              value={firstName}
              disabled={busy}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="profile-lastName">Фамилия</label>
            <input
              type="text"
              id="profile-lastName"
              value={lastName}
              disabled={busy}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div data-modal-form-group data-modal-span>
            <label htmlFor="profile-jobTitle">Должность в компании</label>
            <input
              type="text"
              id="profile-jobTitle"
              value={jobTitle}
              disabled={busy}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Например: Менеджер по продажам"
              maxLength={120}
            />
            <span className={styles.fieldHint}>
              Показывается в шапке рядом с именем. Если не указана — отображается роль в системе.
            </span>
          </div>

          <div data-modal-form-group>
            <label htmlFor="profile-email">Email</label>
            <input type="text" id="profile-email" value={user?.email ?? ''} disabled />
          </div>

          <div data-modal-form-group>
            <label htmlFor="profile-role">Роль</label>
            <input type="text" id="profile-role" value={getRoleLabel(user?.role)} disabled />
          </div>
        </div>

        {profileError ? <p data-modal-form-error>{profileError}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={busy}>
            {hasProfileChanges ? 'Отмена' : 'Закрыть'}
          </button>
          <button
            data-admin-allow-readonly
            data-admin-mutation
            type="submit"
            data-modal-btn="primary"
            disabled={busy || !hasProfileChanges}
          >
            {savingProfile ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>

      <form
        className={styles.formShell}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleChangePassword(e)}
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          После смены пароля потребуется войти заново.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="profile-currentPassword">Текущий пароль</label>
            <input
              type="password"
              id="profile-currentPassword"
              value={currentPassword}
              disabled={busy}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="profile-newPassword">Новый пароль</label>
            <input
              type="password"
              id="profile-newPassword"
              value={newPassword}
              disabled={busy}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="profile-confirmPassword">Подтвердите пароль</label>
            <input
              type="password"
              id="profile-confirmPassword"
              value={confirmPassword}
              disabled={busy}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        {passwordError ? <p data-modal-form-error>{passwordError}</p> : null}
        {passwordMessage ? (
          <div data-modal-footer-info data-modal-tone="success" role="status">
            <span data-modal-footer-info-icon aria-hidden="true" />
            <span data-modal-footer-info-text>{passwordMessage}</span>
          </div>
        ) : null}

        <div data-modal-form-actions>
          <button
            data-admin-allow-readonly
            data-admin-mutation
            type="submit"
            data-modal-btn="primary"
            disabled={busy || !canSubmitPassword}
          >
            {savingPassword ? 'Сохранение…' : 'Сменить пароль'}
          </button>
        </div>
      </form>
    </div>
  );
}
