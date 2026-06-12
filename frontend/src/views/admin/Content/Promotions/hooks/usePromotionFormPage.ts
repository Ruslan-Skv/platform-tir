'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  createPromotion,
  getAdminPromotion,
  updatePromotion,
  uploadPromotionImage,
} from '@/shared/api/admin-promotions';

import { slugifyPromotionTitle } from '../promotion-form-page.utils';

export function usePromotionFormPage(promotionId?: string) {
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

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!promotionId) setSlug(slugifyPromotionTitle(value));
  };

  return {
    promotionId,
    fileInputRef,
    title,
    setTitle: handleTitleChange,
    slug,
    setSlug,
    imageUrl,
    description,
    setDescription,
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

export type PromotionFormPageModel = ReturnType<typeof usePromotionFormPage>;
