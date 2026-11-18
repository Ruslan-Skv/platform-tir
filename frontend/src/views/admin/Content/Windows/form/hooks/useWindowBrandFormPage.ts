'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  createWindowBrand,
  getAdminWindowBrand,
  updateWindowBrand,
  uploadWindowsImage,
} from '@/shared/api/windows';

import { slugifyWindowsName } from '../windows-form.utils';

export function useWindowBrandFormPage(brandId?: string) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(!!brandId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadBrand = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const data = await getAdminWindowBrand(brandId);
      setName(data.name);
      setSlug(data.slug);
      setLogoUrl(data.logoUrl ?? '');
      setCountry(data.country ?? '');
      setDescription(data.description ?? '');
      setSortOrder(data.sortOrder);
      setIsActive(data.isActive);
    } catch {
      showMessage('error', 'Ошибка загрузки бренда');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  const handleSave = async () => {
    if (!name.trim()) {
      showMessage('error', 'Введите название бренда');
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
        logoUrl: logoUrl.trim(),
        country: country.trim(),
        description: description.trim(),
        sortOrder,
        isActive,
      };
      if (brandId) {
        await updateWindowBrand(brandId, payload);
        showMessage('success', 'Бренд обновлён');
      } else {
        const created = await createWindowBrand(payload);
        showMessage('success', 'Бренд создан');
        router.push(`/admin/content/windows/brands/${created.id}/edit`);
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
      const { imageUrl } = await uploadWindowsImage(file);
      setLogoUrl(imageUrl);
      showMessage('success', 'Логотип загружен');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!brandId) setSlug(slugifyWindowsName(value));
  };

  return {
    brandId,
    fileInputRef,
    name,
    setName: handleNameChange,
    slug,
    setSlug,
    logoUrl,
    setLogoUrl,
    country,
    setCountry,
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

export type WindowBrandFormPageModel = ReturnType<typeof useWindowBrandFormPage>;
