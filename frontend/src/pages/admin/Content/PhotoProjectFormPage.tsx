'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { AdminPhotoCategory, AdminPhotoProject } from '@/shared/api/admin-photo';
import {
  createPhotoProject,
  createPhotos,
  deletePhoto,
  getAdminPhotoCategories,
  getAdminProject,
  updatePhotoProject,
  uploadPhoto,
} from '@/shared/api/admin-photo';

import styles from './PhotoProjectFormPage.module.css';

const DISPLAY_MODES = [
  { value: 'grid', label: 'Сетка' },
  { value: 'masonry', label: 'Кирпичная кладка' },
  { value: 'slider', label: 'Слайдер' },
] as const;

interface PhotoProjectFormPageProps {
  projectId?: string;
}

export function PhotoProjectFormPage({ projectId }: PhotoProjectFormPageProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<AdminPhotoCategory[]>([]);
  const [project, setProject] = useState<AdminPhotoProject | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [displayMode, setDisplayMode] = useState<'grid' | 'masonry' | 'slider'>('grid');
  const [photos, setPhotos] = useState<{ id: string; imageUrl: string }[]>([]);
  const [loading, setLoading] = useState(!!projectId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadCategories = useCallback(async () => {
    try {
      const data = await getAdminPhotoCategories();
      setCategories(data);
      if (data.length > 0 && !categoryId) {
        setCategoryId(data[0].id);
      }
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, []);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getAdminProject(projectId);
      setProject(data);
      setCategoryId(data.categoryId);
      setTitle(data.title);
      setDescription(data.description ?? '');
      setDisplayMode(data.displayMode as 'grid' | 'masonry' | 'slider');
      setPhotos(data.photos.map((p) => ({ id: p.id, imageUrl: p.imageUrl })));
    } catch {
      showMessage('error', 'Ошибка загрузки объекта');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleSave = async () => {
    if (!title.trim()) {
      showMessage('error', 'Введите название объекта');
      return;
    }
    if (!categoryId) {
      showMessage('error', 'Выберите категорию');
      return;
    }
    setSaving(true);
    try {
      if (projectId) {
        await updatePhotoProject(projectId, {
          categoryId,
          title: title.trim(),
          description: description.trim() || undefined,
          displayMode,
        });
        showMessage('success', 'Объект обновлён');
      } else {
        const created = await createPhotoProject({
          categoryId,
          title: title.trim(),
          description: description.trim() || undefined,
          displayMode,
        });
        showMessage('success', 'Объект создан');
        if (photos.length > 0) {
          await createPhotos(
            created.id,
            photos.map((p) => p.imageUrl)
          );
        }
        router.push(`/admin/content/photo/projects/${created.id}/edit`);
        return;
      }
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (!projectId) {
      setUploading(true);
      try {
        const urls: string[] = [];
        for (const file of files) {
          const { imageUrl } = await uploadPhoto(file);
          urls.push(imageUrl);
        }
        setPhotos((prev) => [
          ...prev,
          ...urls.map((url) => ({ id: `temp-${Date.now()}-${url}`, imageUrl: url })),
        ]);
        showMessage('success', `Загружено ${files.length} фото`);
      } catch (err) {
        showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setUploading(false);
        e.target.value = '';
      }
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const { imageUrl } = await uploadPhoto(file);
        urls.push(imageUrl);
      }
      await createPhotos(projectId, urls);
      await loadProject();
      showMessage('success', `Загружено ${files.length} фото`);
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async (photoId: string, imageUrl: string) => {
    if (photoId.startsWith('temp-') || photoId.startsWith('new-')) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      return;
    }
    try {
      await deletePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      showMessage('success', 'Фото удалено');
    } catch {
      showMessage('error', 'Ошибка удаления');
    }
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return `${apiUrl}${url}`;
  };

  if (loading && projectId) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/content/photo" className={styles.backLink}>
          ← К списку
        </Link>
        <h1 className={styles.title}>{projectId ? 'Редактирование объекта' : 'Новый объект'}</h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className={styles.formGroup}>
          <label className={styles.label}>Категория *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={styles.select}
            required
          >
            <option value="">Выберите категорию</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Название объекта *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Квартира ул. Ленина 15"
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Описание выполненных работ</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите выполненные работы..."
            className={styles.textarea}
            rows={4}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Отображение фото</label>
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as 'grid' | 'masonry' | 'slider')}
            className={styles.select}
          >
            {DISPLAY_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Фотографии</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className={styles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Загрузка...' : '+ Загрузить фото (можно несколько)'}
          </button>
          {photos.length > 0 && (
            <div className={styles.photosGrid}>
              {photos.map((photo) => (
                <div key={photo.id} className={styles.photoItem}>
                  <img src={getImageUrl(photo.imageUrl)} alt="" />
                  <button
                    type="button"
                    className={styles.removePhoto}
                    onClick={() => handleRemovePhoto(photo.id, photo.imageUrl)}
                    aria-label="Удалить"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <Link href="/admin/content/photo" className={styles.cancelLink}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
