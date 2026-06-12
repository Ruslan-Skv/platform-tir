'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

import type {
  PhotoProjectFormPageMessage,
  PhotoProjectFormPhoto,
} from '../photo-project-form-page.types';
import { fromDatetimeLocalToIso, toDatetimeLocalValue } from '../photo-project-form-page.utils';

export type UsePhotoProjectFormPageOptions = {
  projectId?: string;
};

export function usePhotoProjectFormPage({ projectId }: UsePhotoProjectFormPageOptions) {
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
  const [photos, setPhotos] = useState<PhotoProjectFormPhoto[]>([]);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<PhotoProjectFormPageMessage | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getAdminPhotoCategories();
      setCategories(data);
      if (data.length > 0) {
        setCategoryId((prev) => prev || data[0].id);
      }
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, [showMessage]);

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
  }, [projectId, showMessage]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadProject();
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

  const handleRemovePhoto = async (photoId: string) => {
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

  return {
    projectId,
    project,
    categories,
    categoryId,
    setCategoryId,
    title,
    setTitle,
    description,
    setDescription,
    displayMode,
    setDisplayMode,
    displayModeMobile,
    setDisplayModeMobile,
    publishedAtLocal,
    setPublishedAtLocal,
    photos,
    loading,
    saving,
    uploading,
    message,
    fileInputRef,
    handleSave,
    handleFileSelect,
    handleRemovePhoto,
  };
}

export type PhotoProjectFormPageModel = ReturnType<typeof usePhotoProjectFormPage>;
