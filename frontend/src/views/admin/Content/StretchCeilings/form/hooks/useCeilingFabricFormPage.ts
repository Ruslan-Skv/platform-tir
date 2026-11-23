'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import type {
  AdminCeilingManufacturer,
  FabricCharacteristicItem,
} from '@/shared/api/stretch-ceilings';
import {
  createCeilingFabric,
  getAdminCeilingFabric,
  getAdminCeilingManufacturers,
  updateCeilingFabric,
  uploadStretchCeilingsImage,
} from '@/shared/api/stretch-ceilings';

import { slugifyStretchCeilingsName } from '../stretch-ceilings-form.utils';

/** Строка формы для редактирования списка характеристик. */
export interface CharacteristicRow extends FabricCharacteristicItem {
  uid: string;
}

function toRows(items: FabricCharacteristicItem[] | null | undefined): CharacteristicRow[] {
  return (items ?? []).map((item, index) => ({ ...item, uid: `row-${index}-${item.label}` }));
}

let uidCounter = 0;
function nextUid(): string {
  uidCounter += 1;
  return `row-new-${uidCounter}`;
}

export function useCeilingFabricFormPage(fabricId?: string) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manufacturers, setManufacturers] = useState<AdminCeilingManufacturer[]>([]);
  const [manufacturerId, setManufacturerId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [textureType, setTextureType] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [width, setWidth] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [badge, setBadge] = useState('');
  const [advantages, setAdvantages] = useState<string[]>([]);
  const [characteristics, setCharacteristics] = useState<CharacteristicRow[]>([]);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(!!fabricId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Список производителей для селекта (+ предвыбор из ?manufacturerId= при создании)
  useEffect(() => {
    let cancelled = false;
    getAdminCeilingManufacturers()
      .then((data) => {
        if (cancelled) return;
        setManufacturers(data);
        if (!fabricId) {
          const preset =
            typeof window !== 'undefined'
              ? new URLSearchParams(window.location.search).get('manufacturerId')
              : null;
          if (preset && data.some((m) => m.id === preset)) {
            setManufacturerId(preset);
          } else if (data[0]) {
            setManufacturerId(data[0].id);
          }
        }
      })
      .catch(() => showMessage('error', 'Ошибка загрузки производителей'));
    return () => {
      cancelled = true;
    };
  }, [fabricId]);

  const loadFabric = useCallback(async () => {
    if (!fabricId) return;
    setLoading(true);
    try {
      const data = await getAdminCeilingFabric(fabricId);
      setManufacturerId(data.manufacturerId);
      setName(data.name);
      setSlug(data.slug);
      setTextureType(data.textureType ?? '');
      setTagline(data.tagline ?? '');
      setDescription(data.description);
      setImageUrl(data.imageUrl ?? '');
      setVideoUrl(data.videoUrl ?? '');
      setWidth(data.width ?? '');
      setPriceFrom(data.priceFrom != null ? String(data.priceFrom) : '');
      setBadge(data.badge ?? '');
      setAdvantages(data.advantages ?? []);
      setCharacteristics(toRows(data.characteristics));
      setSortOrder(data.sortOrder);
      setIsActive(data.isActive);
    } catch {
      showMessage('error', 'Ошибка загрузки фактуры');
    } finally {
      setLoading(false);
    }
  }, [fabricId]);

  useEffect(() => {
    loadFabric();
  }, [loadFabric]);

  // ===== Преимущества =====
  const addAdvantage = () => setAdvantages((prev) => [...prev, '']);
  const updateAdvantage = (index: number, value: string) =>
    setAdvantages((prev) => prev.map((item, i) => (i === index ? value : item)));
  const removeAdvantage = (index: number) =>
    setAdvantages((prev) => prev.filter((_, i) => i !== index));

  // ===== Характеристики =====
  const addCharacteristic = () =>
    setCharacteristics((prev) => [...prev, { uid: nextUid(), label: '', value: '' }]);
  const updateCharacteristic = (uid: string, field: 'label' | 'value', value: string) =>
    setCharacteristics((prev) =>
      prev.map((row) => (row.uid === uid ? { ...row, [field]: value } : row))
    );
  const removeCharacteristic = (uid: string) =>
    setCharacteristics((prev) => prev.filter((row) => row.uid !== uid));

  const handleSave = async () => {
    if (!manufacturerId) {
      showMessage('error', 'Выберите производителя');
      return;
    }
    if (!name.trim()) {
      showMessage('error', 'Введите название фактуры');
      return;
    }
    if (!slug.trim()) {
      showMessage('error', 'Введите slug');
      return;
    }
    if (!description.trim()) {
      showMessage('error', 'Введите описание');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        manufacturerId,
        name: name.trim(),
        slug: slug.trim(),
        // Пустые строки отправляем как есть: бэкенд превращает их в null (очистка поля)
        textureType: textureType.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        videoUrl: videoUrl.trim(),
        width: width.trim(),
        priceFrom: priceFrom.trim() ? Number(priceFrom) : undefined,
        badge: badge.trim(),
        advantages: advantages.map((a) => a.trim()).filter(Boolean),
        characteristics: characteristics
          .map(({ label, value }) => ({ label: label.trim(), value: value.trim() }))
          .filter((row) => row.label && row.value),
        sortOrder,
        isActive,
      };
      if (fabricId) {
        await updateCeilingFabric(fabricId, payload);
        showMessage('success', 'Фактура обновлена');
      } else {
        const created = await createCeilingFabric(payload);
        showMessage('success', 'Фактура создана');
        router.push(`/admin/content/stretch-ceilings/fabrics/${created.id}/edit`);
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
      const { imageUrl: url } = await uploadStretchCeilingsImage(file);
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
    if (!fabricId) setSlug(slugifyStretchCeilingsName(value));
  };

  return {
    fabricId,
    manufacturers,
    fileInputRef,
    manufacturerId,
    setManufacturerId,
    name,
    setName: handleNameChange,
    slug,
    setSlug,
    textureType,
    setTextureType,
    tagline,
    setTagline,
    description,
    setDescription,
    imageUrl,
    setImageUrl,
    videoUrl,
    setVideoUrl,
    width,
    setWidth,
    priceFrom,
    setPriceFrom,
    badge,
    setBadge,
    advantages,
    addAdvantage,
    updateAdvantage,
    removeAdvantage,
    characteristics,
    addCharacteristic,
    updateCharacteristic,
    removeCharacteristic,
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

export type CeilingFabricFormPageModel = ReturnType<typeof useCeilingFabricFormPage>;

// Re-export для удобства использования в вью
export type { AdminCeilingManufacturer };
