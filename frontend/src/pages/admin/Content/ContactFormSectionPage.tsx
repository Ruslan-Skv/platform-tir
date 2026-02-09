'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import type { ContactFormBlock } from '@/shared/api/contact-form';
import { getAdminContactFormBlock, updateAdminContactFormBlock } from '@/shared/api/contact-form';

import styles from './FeaturedProductsSectionPage.module.css';
import { SectionVisibilityCheckbox } from './SectionVisibilityCheckbox';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function ContactFormSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<ContactFormBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const d = await getAdminContactFormBlock();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          showMessage('error', 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await updateAdminContactFormBlock(data);
      showMessage('success', 'Изменения успешно сохранены');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ContactFormBlock, value: string) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  const handleOpacityChange = (value: number) => {
    if (!data) return;
    setData({ ...data, backgroundOpacity: value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data) return;
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/admin/home/contact-form/upload`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showMessage('error', err.message || 'Ошибка загрузки');
        return;
      }
      const { imageUrl } = (await res.json()) as { imageUrl: string };
      setData({ ...data, backgroundImage: imageUrl });
      showMessage('success', 'Картинка загружена. Нажмите «Сохранить».');
    } catch {
      showMessage('error', 'Ошибка подключения к серверу');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Контактная форма</h1>
        <p className={styles.subtitle}>
          Настройки блока «Контактная форма» на главной странице. Заголовок и подзаголовок
          отображаются над кнопками «Заказать звонок» и «Вызвать замерщика».
        </p>
      </header>

      <SectionVisibilityCheckbox sectionKey="contactFormVisible" sectionLabel="Контактная форма" />

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Настройки блока</h2>
        <div className={styles.formGroup}>
          <label>Заголовок</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className={styles.input}
            placeholder="Готовы начать проект?"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Подзаголовок</label>
          <input
            type="text"
            value={data.subtitle}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            className={styles.input}
            placeholder="Оставьте заявку и получите бесплатную консультацию специалиста"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Фоновая картинка</label>
          <p className={styles.hint}>
            URL картинки или загрузите файл (JPG, PNG, WebP, GIF, до 5 МБ). Картинка отображается
            полупрозрачно под текстом блока.
          </p>
          <div className={styles.inputRow}>
            <input
              type="text"
              value={data.backgroundImage ?? ''}
              onChange={(e) => {
                if (!data) return;
                const v = e.target.value.trim();
                setData({ ...data, backgroundImage: v || null });
              }}
              className={styles.input}
              placeholder="https://… или оставьте пустым"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={styles.fileInput}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className={styles.uploadBtn}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Загрузка…' : 'Загрузить файл'}
            </button>
          </div>
          {(data.backgroundImage ?? '').trim() ? (
            <p className={styles.previewHint}>Текущее изображение будет использовано как фон.</p>
          ) : null}
        </div>
        <div className={styles.formGroup}>
          <label>Прозрачность фона</label>
          <p className={styles.hint}>
            От 0 (невидимый) до 100% (полностью видимый). Рекомендуется 30–60%.
          </p>
          <div className={styles.sliderRow}>
            <input
              type="range"
              min={0}
              max={100}
              value={data.backgroundOpacity != null ? Math.round(data.backgroundOpacity * 100) : 50}
              onChange={(e) => handleOpacityChange(Number(e.target.value) / 100)}
              className={styles.range}
            />
            <span className={styles.rangeValue}>
              {data.backgroundOpacity != null
                ? `${Math.round(data.backgroundOpacity * 100)}%`
                : '50%'}
            </span>
          </div>
        </div>
        <div className={styles.saveBlock}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </section>
    </div>
  );
}
