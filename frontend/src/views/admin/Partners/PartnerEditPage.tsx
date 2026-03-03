'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';

import styles from './PartnerEditPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

interface PartnerEditPageProps {
  partnerId?: string;
}

export function PartnerEditPage({ partnerId }: PartnerEditPageProps) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();

  const isEditMode = !!partnerId;
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    showLogoOnCards: true,
    tooltipText: '',
    showTooltip: true,
    website: '',
    email: '',
    phones: [] as string[],
    description: '',
    isActive: true,
  });

  const fetchPartner = useCallback(async () => {
    if (!partnerId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/partners/${partnerId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Партнёр не найден');
        } else {
          setError('Ошибка загрузки партнёра');
        }
        return;
      }

      const data = await response.json();

      let phones: string[] = [];
      if (Array.isArray(data.phone)) {
        phones = data.phone.filter((p: string) => p && p.trim());
      } else if (data.phone && typeof data.phone === 'string') {
        phones = [data.phone];
      }

      setFormData({
        name: data.name || '',
        logoUrl: data.logoUrl || '',
        showLogoOnCards: data.showLogoOnCards ?? true,
        tooltipText: data.tooltipText || '',
        showTooltip: data.showTooltip ?? true,
        website: data.website || '',
        email: data.email || '',
        phones,
        description: data.description || '',
        isActive: data.isActive ?? true,
      });
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [partnerId, getAuthHeaders]);

  useEffect(() => {
    if (isEditMode && partnerId) {
      fetchPartner();
    }
  }, [isEditMode, partnerId, fetchPartner]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const logoPreviewUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
    if (!allowed) {
      setMessage({ type: 'error', text: 'Допустимы только изображения: jpg, png, webp, gif, svg' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Размер файла не должен превышать 2 МБ' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setUploadingLogo(true);
    setMessage(null);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    try {
      const res = await fetch(`${API_URL}/admin/partners/upload/logo`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formDataUpload,
      });
      if (res.ok) {
        const { logoUrl } = await res.json();
        setFormData((prev) => ({ ...prev, logoUrl }));
        setMessage({ type: 'success', text: 'Логотип загружен' });
        setTimeout(() => setMessage(null), 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({
          type: 'error',
          text: err.message || 'Ошибка загрузки логотипа',
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage({ type: 'error', text: 'Ошибка сети' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    if (!formData.name.trim()) {
      setError('Название обязательно для заполнения');
      setSaving(false);
      return;
    }

    try {
      const partnerData: Record<string, unknown> = {
        name: formData.name.trim(),
        isActive: formData.isActive,
      };

      if (formData.logoUrl.trim()) partnerData.logoUrl = formData.logoUrl.trim();
      partnerData.showLogoOnCards = formData.showLogoOnCards;
      if (formData.tooltipText.trim()) partnerData.tooltipText = formData.tooltipText.trim();
      partnerData.showTooltip = formData.showTooltip;
      if (formData.website.trim()) partnerData.website = formData.website.trim();
      if (formData.email.trim()) partnerData.email = formData.email.trim();
      if (formData.description.trim()) partnerData.description = formData.description.trim();
      if (formData.phones.length > 0) {
        partnerData.phone = formData.phones.filter((p) => p.trim()).map((p) => p.trim());
      }

      const url = isEditMode
        ? `${API_URL}/admin/partners/${partnerId}`
        : `${API_URL}/admin/partners`;

      const response = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(partnerData),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: isEditMode ? 'Партнёр обновлён' : 'Партнёр создан',
        });
        setTimeout(() => {
          router.push('/admin/partners');
        }, 1500);
      } else {
        let errorData;
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        const errorMessage =
          errorData.message ||
          (Array.isArray(errorData)
            ? errorData.map((e: { message?: string }) => e.message).join(', ')
            : '') ||
          errorData.error ||
          `Ошибка ${isEditMode ? 'обновления' : 'создания'} партнёра (${response.status})`;

        setError(errorMessage);
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Загрузка данных партнёра...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isEditMode ? 'Редактирование партнёра' : 'Создание партнёра'}
        </h1>
        <button className={styles.backButton} onClick={() => router.push('/admin/partners')}>
          ← Назад к списку
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {message && (
        <div className={`${styles.messageBox} ${styles[message.type]}`}>{message.text}</div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Основная информация</h2>

            <div className={styles.formGroup}>
              <label htmlFor="name">
                Название <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="Название партнёра"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Логотип</label>
              <div className={styles.logoRow}>
                <input
                  type="file"
                  ref={logoFileInputRef}
                  accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                  onChange={handleLogoUpload}
                  className={styles.fileInput}
                  disabled={uploadingLogo}
                />
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className={styles.uploadButton}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? 'Загрузка...' : 'Загрузить изображение'}
                </button>
                <span className={styles.logoOr}>или</span>
                <input
                  type="url"
                  id="logoUrl"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              {formData.logoUrl && (
                <div className={styles.logoPreview}>
                  <img
                    src={logoPreviewUrl(formData.logoUrl)}
                    alt="Логотип"
                    className={styles.logoPreviewImg}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <p className={styles.hint}>
                Логотип отображается на карточках товаров партнёра (если включено ниже). До 2 МБ,
                форматы: jpg, png, webp, gif, svg
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.showLogoOnCards}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, showLogoOnCards: e.target.checked }))
                  }
                  className={styles.checkbox}
                />
                <span>Показывать логотип на карточках товаров</span>
              </label>
              <p className={styles.hint}>
                Включите, чтобы логотип этого партнёра отображался на карточках его товаров
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.showTooltip}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, showTooltip: e.target.checked }))
                  }
                  className={styles.checkbox}
                />
                <span>Показывать всплывающую подсказку при наведении на логотип</span>
              </label>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tooltipText">Текст подсказки</label>
              <input
                type="text"
                id="tooltipText"
                name="tooltipText"
                value={formData.tooltipText}
                onChange={handleChange}
                className={styles.input}
                placeholder={`Товар Партнёра : ${formData.name || 'название партнёра'}`}
              />
              <p className={styles.hint}>
                Если пусто — будет использоваться «Товар Партнёра : {formData.name || 'название'}»
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="website">Адрес сайта</label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://example.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Описание</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Краткое описание партнёра"
                rows={3}
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Контактная информация</h2>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="info@example.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Телефоны</label>
              {formData.phones.map((phone, index) => (
                <div key={index} className={styles.phoneRow}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const newPhones = [...formData.phones];
                      newPhones[index] = e.target.value;
                      setFormData({ ...formData, phones: newPhones });
                    }}
                    className={styles.input}
                    placeholder="+7 (999) 123-45-67"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newPhones = formData.phones.filter((_, i) => i !== index);
                      setFormData({ ...formData, phones: newPhones });
                    }}
                    className={styles.removeButton}
                    title="Удалить телефон"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, phones: [...formData.phones, ''] });
                }}
                className={styles.addPhoneButton}
              >
                + Добавить телефон
              </button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className={styles.checkbox}
                />
                <span>Активен</span>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push('/admin/partners')}
            disabled={saving}
          >
            Отмена
          </button>
          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? 'Сохранение...' : isEditMode ? 'Сохранить изменения' : 'Создать партнёра'}
          </button>
        </div>
      </form>
    </div>
  );
}
