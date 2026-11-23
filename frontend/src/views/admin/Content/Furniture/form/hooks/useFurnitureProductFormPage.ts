'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { AdminFurnitureCategory, ProductCharacteristicItem } from '@/shared/api/furniture';
import {
  createFurnitureProduct,
  getAdminFurnitureCategories,
  getAdminFurnitureProduct,
  updateFurnitureProduct,
  uploadFurnitureImage,
} from '@/shared/api/furniture';

import { slugifyFurnitureName } from '../furniture-form.utils';

/** Строка формы для редактирования списка характеристик. */
export interface CharacteristicRow extends ProductCharacteristicItem {
  uid: string;
}

function toRows(items: ProductCharacteristicItem[] | null | undefined): CharacteristicRow[] {
  return (items ?? []).map((item, index) => ({ ...item, uid: `row-${index}-${item.label}` }));
}

let uidCounter = 0;
function nextUid(): string {
  uidCounter += 1;
  return `row-new-${uidCounter}`;
}

export function useFurnitureProductFormPage(productId?: string) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<AdminFurnitureCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [facadeMaterial, setFacadeMaterial] = useState('');
  const [hardware, setHardware] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceUnit, setPriceUnit] = useState('');
  const [badge, setBadge] = useState('');
  const [advantages, setAdvantages] = useState<string[]>([]);
  const [characteristics, setCharacteristics] = useState<CharacteristicRow[]>([]);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Список категорий для селекта (+ предвыбор из ?categoryId= при создании)
  useEffect(() => {
    let cancelled = false;
    getAdminFurnitureCategories()
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
        if (!productId) {
          const preset =
            typeof window !== 'undefined'
              ? new URLSearchParams(window.location.search).get('categoryId')
              : null;
          if (preset && data.some((c) => c.id === preset)) {
            setCategoryId(preset);
          } else if (data[0]) {
            setCategoryId(data[0].id);
          }
        }
      })
      .catch(() => showMessage('error', 'Ошибка загрузки категорий'));
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const data = await getAdminFurnitureProduct(productId);
      setCategoryId(data.categoryId);
      setName(data.name);
      setSlug(data.slug);
      setTagline(data.tagline ?? '');
      setDescription(data.description);
      setImageUrl(data.imageUrl ?? '');
      setVideoUrl(data.videoUrl ?? '');
      setConfiguration(data.configuration ?? '');
      setFacadeMaterial(data.facadeMaterial ?? '');
      setHardware(data.hardware ?? '');
      setPriceFrom(data.priceFrom != null ? String(data.priceFrom) : '');
      setPriceUnit(data.priceUnit ?? '');
      setBadge(data.badge ?? '');
      setAdvantages(data.advantages ?? []);
      setCharacteristics(toRows(data.characteristics));
      setSortOrder(data.sortOrder);
      setIsActive(data.isActive);
    } catch {
      showMessage('error', 'Ошибка загрузки изделия');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

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
    if (!categoryId) {
      showMessage('error', 'Выберите категорию');
      return;
    }
    if (!name.trim()) {
      showMessage('error', 'Введите название изделия');
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
        categoryId,
        name: name.trim(),
        slug: slug.trim(),
        // Пустые строки отправляем как есть: бэкенд превращает их в null (очистка поля)
        tagline: tagline.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        videoUrl: videoUrl.trim(),
        configuration: configuration.trim(),
        facadeMaterial: facadeMaterial.trim(),
        hardware: hardware.trim(),
        priceFrom: priceFrom.trim() ? Number(priceFrom) : undefined,
        priceUnit: priceUnit.trim(),
        badge: badge.trim(),
        advantages: advantages.map((a) => a.trim()).filter(Boolean),
        characteristics: characteristics
          .map(({ label, value }) => ({ label: label.trim(), value: value.trim() }))
          .filter((row) => row.label && row.value),
        sortOrder,
        isActive,
      };
      if (productId) {
        await updateFurnitureProduct(productId, payload);
        showMessage('success', 'Изделие обновлено');
      } else {
        const created = await createFurnitureProduct(payload);
        showMessage('success', 'Изделие создано');
        router.push(`/admin/content/furniture/products/${created.id}/edit`);
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
      const { imageUrl: url } = await uploadFurnitureImage(file);
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
    if (!productId) setSlug(slugifyFurnitureName(value));
  };

  return {
    productId,
    categories,
    fileInputRef,
    categoryId,
    setCategoryId,
    name,
    setName: handleNameChange,
    slug,
    setSlug,
    tagline,
    setTagline,
    description,
    setDescription,
    imageUrl,
    setImageUrl,
    videoUrl,
    setVideoUrl,
    configuration,
    setConfiguration,
    facadeMaterial,
    setFacadeMaterial,
    hardware,
    setHardware,
    priceFrom,
    setPriceFrom,
    priceUnit,
    setPriceUnit,
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

export type FurnitureProductFormPageModel = ReturnType<typeof useFurnitureProductFormPage>;

// Re-export для удобства использования в вью
export type { AdminFurnitureCategory };
