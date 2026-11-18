'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { AdminWindowBrand, WindowCharacteristicItem } from '@/shared/api/windows';
import {
  createWindowSystem,
  getAdminWindowBrands,
  getAdminWindowSystem,
  updateWindowSystem,
  uploadWindowsImage,
} from '@/shared/api/windows';

import { slugifyWindowsName } from '../windows-form.utils';

/** Строка формы для редактирования списка характеристик. */
export interface CharacteristicRow extends WindowCharacteristicItem {
  uid: string;
}

function toRows(items: WindowCharacteristicItem[] | null | undefined): CharacteristicRow[] {
  return (items ?? []).map((item, index) => ({ ...item, uid: `row-${index}-${item.label}` }));
}

let uidCounter = 0;
function nextUid(): string {
  uidCounter += 1;
  return `row-new-${uidCounter}`;
}

export function useWindowSystemFormPage(systemId?: string) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [brands, setBrands] = useState<AdminWindowBrand[]>([]);
  const [brandId, setBrandId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [chambers, setChambers] = useState('');
  const [mountingDepth, setMountingDepth] = useState('');
  const [glassUnitWidth, setGlassUnitWidth] = useState('');
  const [thermalResistance, setThermalResistance] = useState('');
  const [soundInsulation, setSoundInsulation] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [badge, setBadge] = useState('');
  const [advantages, setAdvantages] = useState<string[]>([]);
  const [characteristics, setCharacteristics] = useState<CharacteristicRow[]>([]);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(!!systemId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Список брендов для селекта (+ предвыбор бренда из ?brandId= при создании)
  useEffect(() => {
    let cancelled = false;
    getAdminWindowBrands()
      .then((data) => {
        if (cancelled) return;
        setBrands(data);
        if (!systemId) {
          const preset =
            typeof window !== 'undefined'
              ? new URLSearchParams(window.location.search).get('brandId')
              : null;
          if (preset && data.some((b) => b.id === preset)) {
            setBrandId(preset);
          } else if (data[0]) {
            setBrandId(data[0].id);
          }
        }
      })
      .catch(() => showMessage('error', 'Ошибка загрузки брендов'));
    return () => {
      cancelled = true;
    };
  }, [systemId]);

  const loadSystem = useCallback(async () => {
    if (!systemId) return;
    setLoading(true);
    try {
      const data = await getAdminWindowSystem(systemId);
      setBrandId(data.brandId);
      setName(data.name);
      setSlug(data.slug);
      setTagline(data.tagline ?? '');
      setDescription(data.description);
      setImageUrl(data.imageUrl ?? '');
      setChambers(data.chambers != null ? String(data.chambers) : '');
      setMountingDepth(data.mountingDepth != null ? String(data.mountingDepth) : '');
      setGlassUnitWidth(data.glassUnitWidth ?? '');
      setThermalResistance(data.thermalResistance ?? '');
      setSoundInsulation(data.soundInsulation ?? '');
      setPriceFrom(data.priceFrom != null ? String(data.priceFrom) : '');
      setBadge(data.badge ?? '');
      setAdvantages(data.advantages ?? []);
      setCharacteristics(toRows(data.characteristics));
      setSortOrder(data.sortOrder);
      setIsActive(data.isActive);
    } catch {
      showMessage('error', 'Ошибка загрузки профильной системы');
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  useEffect(() => {
    loadSystem();
  }, [loadSystem]);

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
    if (!brandId) {
      showMessage('error', 'Выберите бренд');
      return;
    }
    if (!name.trim()) {
      showMessage('error', 'Введите название системы');
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
        brandId,
        name: name.trim(),
        slug: slug.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim(),
        imageUrl: imageUrl.trim() || undefined,
        chambers: chambers.trim() ? Number(chambers) : undefined,
        mountingDepth: mountingDepth.trim() ? Number(mountingDepth) : undefined,
        glassUnitWidth: glassUnitWidth.trim() || undefined,
        thermalResistance: thermalResistance.trim() || undefined,
        soundInsulation: soundInsulation.trim() || undefined,
        priceFrom: priceFrom.trim() ? Number(priceFrom) : undefined,
        badge: badge.trim() || undefined,
        advantages: advantages.map((a) => a.trim()).filter(Boolean),
        characteristics: characteristics
          .map(({ label, value }) => ({ label: label.trim(), value: value.trim() }))
          .filter((row) => row.label && row.value),
        sortOrder,
        isActive,
      };
      if (systemId) {
        await updateWindowSystem(systemId, payload);
        showMessage('success', 'Профильная система обновлена');
      } else {
        const created = await createWindowSystem(payload);
        showMessage('success', 'Профильная система создана');
        router.push(`/admin/content/windows/systems/${created.id}/edit`);
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
      const { imageUrl: url } = await uploadWindowsImage(file);
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
    if (!systemId) setSlug(slugifyWindowsName(value));
  };

  return {
    systemId,
    brands,
    fileInputRef,
    brandId,
    setBrandId,
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
    chambers,
    setChambers,
    mountingDepth,
    setMountingDepth,
    glassUnitWidth,
    setGlassUnitWidth,
    thermalResistance,
    setThermalResistance,
    soundInsulation,
    setSoundInsulation,
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

export type WindowSystemFormPageModel = ReturnType<typeof useWindowSystemFormPage>;

// Re-export для удобства использования в вью
export type { AdminWindowBrand };
