'use client';

import React, { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';

import styles from './page.module.css';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout, updateProfile } = useUserAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const result = await updateProfile({
        email: formData.email,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
      });

      if (result.success) {
        setSuccess('Профиль успешно обновлен');
        setIsEditing(false);
      } else {
        setError(result.error || 'Ошибка при обновлении профиля');
      }
    } catch (err) {
      setError('Произошла ошибка. Попробуйте еще раз.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Личный кабинет</h1>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className={styles.editButton}>
              Редактировать
            </button>
          )}
        </div>

        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={styles.input}
                disabled
              />
            ) : (
              <div className={styles.value}>{user.email}</div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Имя</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={styles.input}
                placeholder="Введите имя"
              />
            ) : (
              <div className={styles.value}>{user.firstName || 'Не указано'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Фамилия</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={styles.input}
                placeholder="Введите фамилию"
              />
            ) : (
              <div className={styles.value}>{user.lastName || 'Не указано'}</div>
            )}
          </div>

          {isEditing && (
            <div className={styles.actions}>
              <button onClick={handleSave} className={styles.saveButton} disabled={isSaving}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setError('');
                  setSuccess('');
                  if (user) {
                    setFormData({
                      email: user.email || '',
                      firstName: user.firstName || '',
                      lastName: user.lastName || '',
                    });
                  }
                }}
                className={styles.cancelButton}
                disabled={isSaving}
              >
                Отмена
              </button>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
