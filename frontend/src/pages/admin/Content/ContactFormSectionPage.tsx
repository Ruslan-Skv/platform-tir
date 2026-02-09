'use client';

import { useEffect, useState } from 'react';

import type { ContactFormBlock } from '@/shared/api/contact-form';
import { getAdminContactFormBlock, updateAdminContactFormBlock } from '@/shared/api/contact-form';

import styles from './FeaturedProductsSectionPage.module.css';
import { SectionVisibilityCheckbox } from './SectionVisibilityCheckbox';

export function ContactFormSectionPage() {
  const [data, setData] = useState<ContactFormBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
