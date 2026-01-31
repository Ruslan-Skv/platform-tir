'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  createPromotion,
  getAdminPromotion,
  updatePromotion,
  uploadPromotionImage,
} from '@/shared/api/admin-promotions';

import styles from './PromotionFormPage.module.css';

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'e',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'y',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'ts',
        ч: 'ch',
        ш: 'sh',
        щ: 'sch',
        ъ: '',
        ы: 'y',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',
      };
      return map[c] || c;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

interface PromotionFormPageProps {
  promotionId?: string;
}

export function PromotionFormPage({ promotionId }: PromotionFormPageProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(!!promotionId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadPromotion = useCallback(async () => {
    if (!promotionId) return;
    setLoading(true);
    try {
      const data = await getAdminPromotion(promotionId);
      setTitle(data.title);
      setSlug(data.slug);
      setImageUrl(data.imageUrl);
      setDescription(data.description ?? '');
      setIsActive(data.isActive);
    } catch {
      showMessage('error', 'Ошибка загрузки акции');
    } finally {
      setLoading(false);
    }
  }, [promotionId]);

  useEffect(() => {
    loadPromotion();
  }, [loadPromotion]);

  const handleSave = async () => {
    if (!title.trim()) {
      showMessage('error', 'Введите название');
      return;
    }
    if (!slug.trim()) {
      showMessage('error', 'Введите slug');
      return;
    }
    if (!imageUrl.trim()) {
      showMessage('error', 'Загрузите изображение');
      return;
    }
    setSaving(true);
    try {
      if (promotionId) {
        await updatePromotion(promotionId, {
          title: title.trim(),
          slug: slug.trim(),
          imageUrl: imageUrl.trim(),
          description: description.trim() || undefined,
          isActive,
        });
        showMessage('success', 'Акция обновлена');
      } else {
        const created = await createPromotion({
          title: title.trim(),
          slug: slug.trim(),
          imageUrl: imageUrl.trim(),
          description: description.trim() || undefined,
          isActive,
        });
        showMessage('success', 'Акция создана');
        router.push(`/admin/content/promotions/${created.id}/edit`);
      }
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { imageUrl: url } = await uploadPromotionImage(file);
      setImageUrl(url);
      showMessage('success', 'Изображение загружено');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      return `${apiUrl.replace(/\/$/, '')}${url}`;
    }
    return url;
  };

  if (loading) {
    return <div className={styles.page}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/content/promotions" className={styles.backLink}>
          ← К списку акций
        </Link>
        <h1 className={styles.title}>{promotionId ? 'Редактировать акцию' : 'Новая акция'}</h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Название *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!promotionId) setSlug(slugify(e.target.value));
            }}
            placeholder="Скидка 15% на входные двери"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Slug *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="discount-entrance-doors"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Изображение *</label>
          <div className={styles.imageBlock}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className={styles.fileInput}
            />
            {imageUrl ? (
              <div className={styles.imagePreview}>
                <img src={getImageUrl(imageUrl)} alt={title || 'Превью'} />
                <button
                  type="button"
                  className={styles.changeImageBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Загрузка...' : 'Заменить'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Загрузка...' : '+ Загрузить изображение'}
              </button>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Описание (необязательно)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание акции..."
            className={styles.textarea}
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className={styles.checkbox}
            />
            Акция активна (отображается на сайте)
          </label>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <Link href="/admin/content/promotions" className={styles.cancelLink}>
            Отмена
          </Link>
        </div>
      </div>
    </div>
  );
}
