'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type {
  AdminPhotoCategory,
  AdminPhotoProject,
  PhotoDisplayMode,
} from '@/shared/api/admin-photo';
import {
  createPhotoProject,
  createPhotos,
  deletePhoto,
  getAdminPhotoCategories,
  getAdminProject,
  updatePhotoProject,
  uploadPhoto,
} from '@/shared/api/admin-photo';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from './PhotoProjectFormPage.module.css';

const DISPLAY_MODES = [
  { value: 'grid', label: 'Сетка' },
  { value: 'masonry', label: 'Кирпичная кладка' },
  { value: 'slider', label: 'Слайдер' },
] as const;

/** Значение для input[type=datetime-local] в локальном часовом поясе */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return toDatetimeLocalValue(new Date().toISOString());
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function fromDatetimeLocalToIso(local: string): string {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Некорректная дата и время на сайте');
  }
  return d.toISOString();
}

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
  const [displayMode, setDisplayMode] = useState<PhotoDisplayMode>('grid');
  const [displayModeMobile, setDisplayModeMobile] = useState<PhotoDisplayMode>('grid');
  const [publishedAtLocal, setPublishedAtLocal] = useState(() =>
    toDatetimeLocalValue(new Date().toISOString())
  );
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
      setDisplayMode(data.displayMode);
      setDisplayModeMobile(data.displayModeMobile ?? data.displayMode);
      setPublishedAtLocal(toDatetimeLocalValue(data.publishedAt ?? data.createdAt));
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
      let publishedAtIso: string;
      try {
        publishedAtIso = fromDatetimeLocalToIso(publishedAtLocal);
      } catch (err) {
        showMessage('error', err instanceof Error ? err.message : 'Некорректная дата публикации');
        setSaving(false);
        return;
      }
      if (projectId) {
        await updatePhotoProject(projectId, {
          categoryId,
          title: title.trim(),
          description: description.trim() || undefined,
          displayMode,
          displayModeMobile,
          publishedAt: publishedAtIso,
        });
        showMessage('success', 'Объект обновлён');
      } else {
        const created = await createPhotoProject({
          categoryId,
          title: title.trim(),
          description: description.trim() || undefined,
          displayMode,
          displayModeMobile,
          publishedAt: publishedAtIso,
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

  const getImageUrl = (url: string) => publicUploadUrl(url);

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
          <label className={styles.label}>Дата и время на сайте</label>
          <p className={styles.fieldHint}>
            Показывается в разделе «Наши работы» у посетителей. Не привязана к моменту сохранения
            записи в админке.
          </p>
          <input
            type="datetime-local"
            value={publishedAtLocal}
            onChange={(e) => setPublishedAtLocal(e.target.value)}
            className={styles.input}
            step={60}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Описание выполненных работ</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите выполненные работы..."
            className={styles.textarea}
            rows={14}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Отображение на компьютере и планшете</label>
          <p className={styles.fieldHint}>Ширина экрана больше 768 px</p>
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as PhotoDisplayMode)}
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
          <label className={styles.label}>Отображение на телефоне</label>
          <p className={styles.fieldHint}>Ширина экрана до 768 px включительно</p>
          <select
            value={displayModeMobile}
            onChange={(e) => setDisplayModeMobile(e.target.value as PhotoDisplayMode)}
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
