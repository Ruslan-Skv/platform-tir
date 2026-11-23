'use client';

import { useCallback, useEffect, useState } from 'react';

import type {
  AdminCeilingFabric,
  AdminCeilingManufacturer,
  StretchCeilingsFaqItem,
  StretchCeilingsStep,
} from '@/shared/api/stretch-ceilings';
import {
  deleteCeilingFabric,
  deleteCeilingManufacturer,
  getAdminCeilingFabrics,
  getAdminCeilingManufacturers,
  getAdminStretchCeilingsSettings,
  updateAdminStretchCeilingsSettings,
  updateCeilingFabric,
  updateCeilingManufacturer,
  uploadStretchCeilingsImage,
} from '@/shared/api/stretch-ceilings';

export interface StretchCeilingsSettingsForm {
  title: string;
  subtitle: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  heroImageUrl: string;
  comparisonShow: boolean;
  comparisonTitle: string;
  comparisonNote: string;
  comparisonShowTexture: boolean;
  comparisonShowWidth: boolean;
  comparisonShowPrice: boolean;
  comparisonShowCountry: boolean;
  calcShow: boolean;
  calcTitle: string;
  calcNote: string;
  calcPricePerMeterBaget: number;
  calcPricePerCorner: number;
  calcPricePerLight: number;
  calcPricePerPipe: number;
  calcLightOptionPrice: number;
  calcCorniceOptionPrice: number;
  calcMinOrder: number;
  steps: StretchCeilingsStep[];
  faq: StretchCeilingsFaqItem[];
  ctaBackgroundColor: string;
  ctaBackgroundImage: string;
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaTextColor: string;
  ctaShowButtons: boolean;
}

export function useStretchCeilingsPage() {
  const [manufacturers, setManufacturers] = useState<AdminCeilingManufacturer[]>([]);
  const [fabrics, setFabrics] = useState<AdminCeilingFabric[]>([]);
  const [settingsForm, setSettingsForm] = useState<StretchCeilingsSettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingSettingsImage, setUploadingSettingsImage] = useState(false);
  const [uploadingCtaImage, setUploadingCtaImage] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'manufacturer'; id: string; name: string; note?: string }
    | { kind: 'fabric'; id: string; name: string }
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
      const [manufacturersData, fabricsData, settings] = await Promise.all([
        getAdminCeilingManufacturers(),
        getAdminCeilingFabrics(),
        getAdminStretchCeilingsSettings(),
      ]);
      setManufacturers(manufacturersData);
      setFabrics(fabricsData);
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
        comparisonShowTexture: settings.comparisonShowTexture ?? true,
        comparisonShowWidth: settings.comparisonShowWidth ?? true,
        comparisonShowPrice: settings.comparisonShowPrice ?? true,
        comparisonShowCountry: settings.comparisonShowCountry ?? true,
        calcShow: settings.calcShow ?? true,
        calcTitle: settings.calcTitle ?? '',
        calcNote: settings.calcNote ?? '',
        calcPricePerMeterBaget: settings.calcPricePerMeterBaget ?? 180,
        calcPricePerCorner: settings.calcPricePerCorner ?? 150,
        calcPricePerLight: settings.calcPricePerLight ?? 450,
        calcPricePerPipe: settings.calcPricePerPipe ?? 350,
        calcLightOptionPrice: settings.calcLightOptionPrice ?? 600,
        calcCorniceOptionPrice: settings.calcCorniceOptionPrice ?? 900,
        calcMinOrder: settings.calcMinOrder ?? 3000,
        steps: settings.steps ?? [],
        faq: settings.faq ?? [],
        ctaBackgroundColor: settings.ctaBackgroundColor ?? '',
        ctaBackgroundImage: settings.ctaBackgroundImage ?? '',
        ctaBackgroundFit: settings.ctaBackgroundFit ?? 'contain',
        ctaBackgroundImageOpacity: settings.ctaBackgroundImageOpacity ?? 30,
        ctaTextColor: settings.ctaTextColor ?? '',
        ctaShowButtons: settings.ctaShowButtons ?? true,
      });
    } catch {
      showMessage('error', 'Ошибка загрузки раздела «Натяжные потолки»');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateSettingsField = (
    field: keyof StretchCeilingsSettingsForm,
    value: StretchCeilingsSettingsForm[keyof StretchCeilingsSettingsForm]
  ) => {
    setSettingsForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveSettings = async () => {
    if (!settingsForm) return;
    setSavingSettings(true);
    try {
      await updateAdminStretchCeilingsSettings({
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
        comparisonShowTexture: settingsForm.comparisonShowTexture,
        comparisonShowWidth: settingsForm.comparisonShowWidth,
        comparisonShowPrice: settingsForm.comparisonShowPrice,
        comparisonShowCountry: settingsForm.comparisonShowCountry,
        calcShow: settingsForm.calcShow,
        calcTitle: settingsForm.calcTitle.trim(),
        calcNote: settingsForm.calcNote.trim(),
        calcPricePerMeterBaget: settingsForm.calcPricePerMeterBaget,
        calcPricePerCorner: settingsForm.calcPricePerCorner,
        calcPricePerLight: settingsForm.calcPricePerLight,
        calcPricePerPipe: settingsForm.calcPricePerPipe,
        calcLightOptionPrice: settingsForm.calcLightOptionPrice,
        calcCorniceOptionPrice: settingsForm.calcCorniceOptionPrice,
        calcMinOrder: settingsForm.calcMinOrder,
        steps: settingsForm.steps
          .map((step) => ({ title: step.title.trim(), description: step.description.trim() }))
          .filter((step) => step.title && step.description),
        faq: settingsForm.faq
          .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
          .filter((item) => item.question && item.answer),
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
      const { imageUrl } = await uploadStretchCeilingsImage(file);
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
      const { imageUrl } = await uploadStretchCeilingsImage(file);
      updateSettingsField('ctaBackgroundImage', imageUrl);
      showMessage('success', 'Фон блока загружен — не забудьте сохранить');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingCtaImage(false);
      e.target.value = '';
    }
  };

  // ===== Этапы работы =====
  const addStep = () =>
    setSettingsForm((prev) =>
      prev ? { ...prev, steps: [...prev.steps, { title: '', description: '' }] } : prev
    );
  const updateStep = (index: number, field: 'title' | 'description', value: string) =>
    setSettingsForm((prev) =>
      prev
        ? {
            ...prev,
            steps: prev.steps.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
          }
        : prev
    );
  const removeStep = (index: number) =>
    setSettingsForm((prev) =>
      prev ? { ...prev, steps: prev.steps.filter((_, i) => i !== index) } : prev
    );

  // ===== FAQ =====
  const addFaqItem = () =>
    setSettingsForm((prev) =>
      prev ? { ...prev, faq: [...prev.faq, { question: '', answer: '' }] } : prev
    );
  const updateFaqItem = (index: number, field: 'question' | 'answer', value: string) =>
    setSettingsForm((prev) =>
      prev
        ? {
            ...prev,
            faq: prev.faq.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
          }
        : prev
    );
  const removeFaqItem = (index: number) =>
    setSettingsForm((prev) =>
      prev ? { ...prev, faq: prev.faq.filter((_, i) => i !== index) } : prev
    );

  const handleToggleManufacturerActive = async (manufacturer: AdminCeilingManufacturer) => {
    try {
      await updateCeilingManufacturer(manufacturer.id, { isActive: !manufacturer.isActive });
      setManufacturers((prev) =>
        prev.map((m) => (m.id === manufacturer.id ? { ...m, isActive: !manufacturer.isActive } : m))
      );
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка обновления производителя');
    }
  };

  const handleToggleFabricActive = async (fabric: AdminCeilingFabric) => {
    try {
      await updateCeilingFabric(fabric.id, { isActive: !fabric.isActive });
      setFabrics((prev) =>
        prev.map((f) => (f.id === fabric.id ? { ...f, isActive: !fabric.isActive } : f))
      );
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка обновления фактуры');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'manufacturer') {
        await deleteCeilingManufacturer(deleteTarget.id);
      } else {
        await deleteCeilingFabric(deleteTarget.id);
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
    manufacturers,
    fabrics,
    settingsForm,
    updateSettingsField,
    handleSaveSettings,
    savingSettings,
    uploadingSettingsImage,
    handleSettingsFileSelect,
    uploadingCtaImage,
    handleCtaFileSelect,
    addStep,
    updateStep,
    removeStep,
    addFaqItem,
    updateFaqItem,
    removeFaqItem,
    loading,
    message,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    handleToggleManufacturerActive,
    handleToggleFabricActive,
  };
}

export type StretchCeilingsAdminPageModel = ReturnType<typeof useStretchCeilingsPage>;
