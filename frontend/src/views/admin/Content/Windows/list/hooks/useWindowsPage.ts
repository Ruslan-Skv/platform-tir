'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AdminWindowBrand, AdminWindowSystem } from '@/shared/api/windows';
import {
  deleteWindowBrand,
  deleteWindowSystem,
  getAdminWindowBrands,
  getAdminWindowSystems,
  getAdminWindowsSettings,
  updateWindowBrand,
  updateWindowSystem,
  updateWindowsSettings,
  uploadWindowsImage,
} from '@/shared/api/windows';

export interface WindowsSettingsForm {
  title: string;
  subtitle: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  heroImageUrl: string;
  comparisonShow: boolean;
  comparisonTitle: string;
  comparisonNote: string;
  comparisonShowChambers: boolean;
  comparisonShowDepth: boolean;
  comparisonShowGlass: boolean;
  comparisonShowThermal: boolean;
  comparisonShowSound: boolean;
  ctaBackgroundColor: string;
  ctaBackgroundImage: string;
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaTextColor: string;
  ctaShowButtons: boolean;
}

export function useWindowsPage() {
  const [brands, setBrands] = useState<AdminWindowBrand[]>([]);
  const [systems, setSystems] = useState<AdminWindowSystem[]>([]);
  const [settingsForm, setSettingsForm] = useState<WindowsSettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingSettingsImage, setUploadingSettingsImage] = useState(false);
  const [uploadingCtaImage, setUploadingCtaImage] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'brand'; id: string; name: string; note?: string }
    | { kind: 'system'; id: string; name: string }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [brandsData, systemsData, settings] = await Promise.all([
        getAdminWindowBrands(),
        getAdminWindowSystems(),
        getAdminWindowsSettings(),
      ]);
      setBrands(brandsData);
      setSystems(systemsData);
      setSettingsForm({
        title: settings.title ?? '',
        subtitle: settings.subtitle ?? '',
        description: settings.description ?? '',
        seoTitle: settings.seoTitle ?? '',
        seoDescription: settings.seoDescription ?? '',
        heroImageUrl: settings.heroImageUrl ?? '',
        comparisonShow: settings.comparisonShow ?? true,
        comparisonTitle: settings.comparisonTitle ?? '',
        comparisonNote: settings.comparisonNote ?? '',
        comparisonShowChambers: settings.comparisonShowChambers ?? true,
        comparisonShowDepth: settings.comparisonShowDepth ?? true,
        comparisonShowGlass: settings.comparisonShowGlass ?? true,
        comparisonShowThermal: settings.comparisonShowThermal ?? true,
        comparisonShowSound: settings.comparisonShowSound ?? true,
        ctaBackgroundColor: settings.ctaBackgroundColor ?? '',
        ctaBackgroundImage: settings.ctaBackgroundImage ?? '',
        ctaBackgroundFit: settings.ctaBackgroundFit ?? 'contain',
        ctaBackgroundImageOpacity: settings.ctaBackgroundImageOpacity ?? 30,
        ctaTextColor: settings.ctaTextColor ?? '',
        ctaShowButtons: settings.ctaShowButtons ?? true,
      });
    } catch {
      showMessage('error', 'Ошибка загрузки раздела «Окна»');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateSettingsField = (
    field: keyof WindowsSettingsForm,
    value: WindowsSettingsForm[keyof WindowsSettingsForm]
  ) => {
    setSettingsForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveSettings = async () => {
    if (!settingsForm) return;
    setSavingSettings(true);
    try {
      await updateWindowsSettings({
        // Пустые строки отправляем как есть: бэкенд превращает их в null (очистка поля)
        title: settingsForm.title.trim(),
        subtitle: settingsForm.subtitle.trim(),
        description: settingsForm.description.trim(),
        heroImageUrl: settingsForm.heroImageUrl.trim(),
        seoTitle: settingsForm.seoTitle.trim(),
        seoDescription: settingsForm.seoDescription.trim(),
        comparisonShow: settingsForm.comparisonShow,
        comparisonTitle: settingsForm.comparisonTitle.trim(),
        comparisonNote: settingsForm.comparisonNote.trim(),
        comparisonShowChambers: settingsForm.comparisonShowChambers,
        comparisonShowDepth: settingsForm.comparisonShowDepth,
        comparisonShowGlass: settingsForm.comparisonShowGlass,
        comparisonShowThermal: settingsForm.comparisonShowThermal,
        comparisonShowSound: settingsForm.comparisonShowSound,
        ctaBackgroundColor: settingsForm.ctaBackgroundColor.trim(),
        ctaBackgroundImage: settingsForm.ctaBackgroundImage.trim(),
        ctaBackgroundFit: settingsForm.ctaBackgroundFit,
        ctaBackgroundImageOpacity: Math.max(
          0,
          Math.min(100, settingsForm.ctaBackgroundImageOpacity)
        ),
        ctaTextColor: settingsForm.ctaTextColor.trim(),
        ctaShowButtons: settingsForm.ctaShowButtons,
      });
      showMessage('success', 'Настройки раздела сохранены');
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка сохранения настроек');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSettingsFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSettingsImage(true);
    try {
      const { imageUrl } = await uploadWindowsImage(file);
      updateSettingsField('heroImageUrl', imageUrl);
      showMessage('success', 'Изображение раздела загружено — не забудьте сохранить');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingSettingsImage(false);
      e.target.value = '';
    }
  };

  const handleCtaFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCtaImage(true);
    try {
      const { imageUrl } = await uploadWindowsImage(file);
      updateSettingsField('ctaBackgroundImage', imageUrl);
      showMessage('success', 'Фон блока загружен — не забудьте сохранить');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingCtaImage(false);
      e.target.value = '';
    }
  };

  const handleToggleBrandActive = async (brand: AdminWindowBrand) => {
    try {
      await updateWindowBrand(brand.id, { isActive: !brand.isActive });
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, isActive: !brand.isActive } : b))
      );
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка обновления бренда');
    }
  };

  const handleToggleSystemActive = async (system: AdminWindowSystem) => {
    try {
      await updateWindowSystem(system.id, { isActive: !system.isActive });
      setSystems((prev) =>
        prev.map((s) => (s.id === system.id ? { ...s, isActive: !system.isActive } : s))
      );
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка обновления системы');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'brand') {
        await deleteWindowBrand(deleteTarget.id);
      } else {
        await deleteWindowSystem(deleteTarget.id);
      }
      showMessage('success', 'Удалено');
      setDeleteTarget(null);
      loadAll();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  return {
    brands,
    systems,
    settingsForm,
    updateSettingsField,
    handleSaveSettings,
    savingSettings,
    uploadingSettingsImage,
    handleSettingsFileSelect,
    uploadingCtaImage,
    handleCtaFileSelect,
    loading,
    message,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    handleToggleBrandActive,
    handleToggleSystemActive,
  };
}

export type WindowsAdminPageModel = ReturnType<typeof useWindowsPage>;
