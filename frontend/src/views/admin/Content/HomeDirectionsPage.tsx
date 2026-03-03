'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { categories } from '@/widgets/home/lib/constants';

import styles from './HomeDirectionsPage.module.css';
import { SectionVisibilityCheckbox } from './SectionVisibilityCheckbox';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

export function HomeDirectionsPage() {
  const { getAuthHeaders } = useAuth();
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/home/directions/images`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setImages(data || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const imageUrl = (slug: string, url: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleFileChange = async (slug: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setUploading(slug);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/admin/home/directions/upload/${slug}`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Ошибка загрузки');
        return;
      }
      const data = await res.json();
      setImages((prev) => ({ ...prev, [slug]: data.imageUrl }));
      setSuccess(`Картинка для «${categories.find((c) => c.slug === slug)?.name}» обновлена`);
    } catch (e) {
      setError('Ошибка подключения к серверу');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Наши направления — картинки</h1>
        <p className={styles.subtitle}>
          Загрузите или замените изображения для раздела «Наши направления» на главной странице.
          Допустимые форматы: JPG, PNG, WebP, GIF. Размер до 5 МБ.
        </p>
      </header>

      <SectionVisibilityCheckbox sectionKey="directionsVisible" sectionLabel="Наши направления" />

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className={styles.grid}>
          {categories.map((cat) => {
            const url = imageUrl(cat.slug, images[cat.slug] ?? '');
            return (
              <div key={cat.slug} className={styles.card}>
                <h3 className={styles.cardTitle}>{cat.name}</h3>
                {url ? (
                  <img src={url} alt={cat.name} className={styles.preview} />
                ) : (
                  <div className={styles.placeholder}>Картинка по умолчанию</div>
                )}
                <div className={styles.actions}>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[cat.slug] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className={styles.fileInput}
                    onChange={(e) => handleFileChange(cat.slug, e)}
                  />
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    disabled={uploading !== null}
                    onClick={() => fileInputRefs.current[cat.slug]?.click()}
                  >
                    {uploading === cat.slug ? 'Загрузка...' : 'Загрузить изображение'}
                  </button>
                </div>
                {error && uploading === cat.slug && <p className={styles.error}>{error}</p>}
                {success && uploading !== cat.slug && <p className={styles.success}>{success}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
