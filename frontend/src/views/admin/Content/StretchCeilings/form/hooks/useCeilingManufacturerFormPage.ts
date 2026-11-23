'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  createCeilingManufacturer,
  getAdminCeilingManufacturer,
  updateCeilingManufacturer,
  uploadStretchCeilingsImage,
} from '@/shared/api/stretch-ceilings';

import { slugifyStretchCeilingsName } from '../stretch-ceilings-form.utils';

export function useCeilingManufacturerFormPage(manufacturerId?: string) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(!!manufacturerId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadManufacturer = useCallback(async () => {
    if (!manufacturerId) return;
    setLoading(true);
    try {
      const data = await getAdminCeilingManufacturer(manufacturerId);
      setName(data.name);
      setSlug(data.slug);
      setLogoUrl(data.logoUrl ?? '');
      setCountry(data.country ?? '');
      setDescription(data.description ?? '');
      setSortOrder(data.sortOrder);
      setIsActive(data.isActive);
    } catch {
      showMessage('error', 'Ошибка загрузки производителя');
    } finally {
      setLoading(false);
    }
  }, [manufacturerId]);

  useEffect(() => {
    loadManufacturer();
  }, [loadManufacturer]);

  const handleSave = async () => {
    if (!name.trim()) {
      showMessage('error', 'Введите название производителя');
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
      if (manufacturerId) {
        await updateCeilingManufacturer(manufacturerId, payload);
        showMessage('success', 'Производитель обновлён');
      } else {
        const created = await createCeilingManufacturer(payload);
        showMessage('success', 'Производитель создан');
        router.push(`/admin/content/stretch-ceilings/manufacturers/${created.id}/edit`);
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
      const { imageUrl } = await uploadStretchCeilingsImage(file);
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
    if (!manufacturerId) setSlug(slugifyStretchCeilingsName(value));
  };

  return {
    manufacturerId,
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

export type CeilingManufacturerFormPageModel = ReturnType<typeof useCeilingManufacturerFormPage>;
