'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  createBlindsCategory,
  getAdminBlindsCategory,
  updateBlindsCategory,
  uploadBlindsImage,
} from '@/shared/api/blinds';

import { slugifyBlindsName } from '../blinds-form.utils';

export function useBlindsCategoryFormPage(categoryId?: string) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(!!categoryId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadCategory = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const data = await getAdminBlindsCategory(categoryId);
      setName(data.name);
      setSlug(data.slug);
      setImageUrl(data.imageUrl ?? '');
      setDescription(data.description ?? '');
      setSortOrder(data.sortOrder);
      setIsActive(data.isActive);
    } catch {
      showMessage('error', 'Ошибка загрузки категории');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadCategory();
  }, [loadCategory]);

  const handleSave = async () => {
    if (!name.trim()) {
      showMessage('error', 'Введите название категории');
      return;
    }
    if (!slug.trim()) {
      showMessage('error', 'Введите slug');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        // Пустые строки отправляем как есть: бэкенд превращает их в null (очистка поля)
        imageUrl: imageUrl.trim(),
        description: description.trim(),
        sortOrder,
        isActive,
      };
      if (categoryId) {
        await updateBlindsCategory(categoryId, payload);
        showMessage('success', 'Категория обновлена');
      } else {
        const created = await createBlindsCategory(payload);
        showMessage('success', 'Категория создана');
        router.push(`/admin/content/blinds/categories/${created.id}/edit`);
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
      const { imageUrl: url } = await uploadBlindsImage(file);
      setImageUrl(url);
      showMessage('success', 'Изображение загружено');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!categoryId) setSlug(slugifyBlindsName(value));
  };

  return {
    categoryId,
    fileInputRef,
    name,
    setName: handleNameChange,
    slug,
    setSlug,
    imageUrl,
    setImageUrl,
    description,
    setDescription,
    sortOrder,
    setSortOrder,
    isActive,
    setIsActive,
    loading,
    saving,
    uploading,
    message,
    handleSave,
    handleFileSelect,
  };
}

export type BlindsCategoryFormPageModel = ReturnType<typeof useBlindsCategoryFormPage>;
