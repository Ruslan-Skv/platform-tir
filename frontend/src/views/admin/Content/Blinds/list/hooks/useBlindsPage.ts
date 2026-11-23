'use client';

import { useCallback, useEffect, useState } from 'react';

import type {
  AdminBlindsCategory,
  AdminBlindsProduct,
  BlindsFaqItem,
  BlindsStep,
} from '@/shared/api/blinds';
import {
  deleteBlindsCategory,
  deleteBlindsProduct,
  getAdminBlindsCategories,
  getAdminBlindsProducts,
  getAdminBlindsSettings,
  updateAdminBlindsSettings,
  updateBlindsCategory,
  updateBlindsProduct,
  uploadBlindsImage,
} from '@/shared/api/blinds';

export interface BlindsSettingsForm {
  title: string;
  subtitle: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  heroImageUrl: string;
  comparisonShow: boolean;
  comparisonTitle: string;
  comparisonNote: string;
  comparisonShowMount: boolean;
  comparisonShowMaterial: boolean;
  comparisonShowControl: boolean;
  comparisonShowPrice: boolean;
  calcShow: boolean;
  calcTitle: string;
  calcNote: string;
  calcMountPrice: number;
  calcMotorPrice: number;
  calcNoDrillPrice: number;
  calcMinOrder: number;
  steps: BlindsStep[];
  faq: BlindsFaqItem[];
  ctaBackgroundColor: string;
  ctaBackgroundImage: string;
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaTextColor: string;
  ctaShowButtons: boolean;
}

export function useBlindsAdminPage() {
  const [categories, setCategories] = useState<AdminBlindsCategory[]>([]);
  const [products, setProducts] = useState<AdminBlindsProduct[]>([]);
  const [settingsForm, setSettingsForm] = useState<BlindsSettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingSettingsImage, setUploadingSettingsImage] = useState(false);
  const [uploadingCtaImage, setUploadingCtaImage] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'category'; id: string; name: string; note?: string }
    | { kind: 'product'; id: string; name: string }
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
      const [categoriesData, productsData, settings] = await Promise.all([
        getAdminBlindsCategories(),
        getAdminBlindsProducts(),
        getAdminBlindsSettings(),
      ]);
      setCategories(categoriesData);
      setProducts(productsData);
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
        comparisonShowMount: settings.comparisonShowMount ?? true,
        comparisonShowMaterial: settings.comparisonShowMaterial ?? true,
        comparisonShowControl: settings.comparisonShowControl ?? true,
        comparisonShowPrice: settings.comparisonShowPrice ?? true,
        calcShow: settings.calcShow ?? true,
        calcTitle: settings.calcTitle ?? '',
        calcNote: settings.calcNote ?? '',
        calcMountPrice: settings.calcMountPrice ?? 300,
        calcMotorPrice: settings.calcMotorPrice ?? 5500,
        calcNoDrillPrice: settings.calcNoDrillPrice ?? 400,
        calcMinOrder: settings.calcMinOrder ?? 2500,
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
      showMessage('error', 'Ошибка загрузки раздела «Жалюзи»');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateSettingsField = (
    field: keyof BlindsSettingsForm,
    value: BlindsSettingsForm[keyof BlindsSettingsForm]
  ) => {
    setSettingsForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveSettings = async () => {
    if (!settingsForm) return;
    setSavingSettings(true);
    try {
      await updateAdminBlindsSettings({
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
        comparisonShowMount: settingsForm.comparisonShowMount,
        comparisonShowMaterial: settingsForm.comparisonShowMaterial,
        comparisonShowControl: settingsForm.comparisonShowControl,
        comparisonShowPrice: settingsForm.comparisonShowPrice,
        calcShow: settingsForm.calcShow,
        calcTitle: settingsForm.calcTitle.trim(),
        calcNote: settingsForm.calcNote.trim(),
        calcMountPrice: settingsForm.calcMountPrice,
        calcMotorPrice: settingsForm.calcMotorPrice,
        calcNoDrillPrice: settingsForm.calcNoDrillPrice,
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
      const { imageUrl } = await uploadBlindsImage(file);
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
      const { imageUrl } = await uploadBlindsImage(file);
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

  const handleToggleCategoryActive = async (category: AdminBlindsCategory) => {
    try {
      await updateBlindsCategory(category.id, { isActive: !category.isActive });
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, isActive: !category.isActive } : c))
      );
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка обновления категории');
    }
  };

  const handleToggleProductActive = async (product: AdminBlindsProduct) => {
    try {
      await updateBlindsProduct(product.id, { isActive: !product.isActive });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: !product.isActive } : p))
      );
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка обновления изделия');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'category') {
        await deleteBlindsCategory(deleteTarget.id);
      } else {
        await deleteBlindsProduct(deleteTarget.id);
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
    categories,
    products,
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
    handleToggleCategoryActive,
    handleToggleProductActive,
  };
}

export type BlindsAdminPageModel = ReturnType<typeof useBlindsAdminPage>;
