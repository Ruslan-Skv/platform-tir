'use client';

import { type ChangeEvent, useCallback, useEffect, useState } from 'react';

import type { ServiceCatalogHeroNote, ServiceCatalogStep } from '@/shared/api/service-catalog';
import {
  type AdminServiceCatalogBlock,
  getAdminServiceCatalogBlock,
  updateAdminServiceCatalogBlock,
} from '@/shared/api/service-catalog/admin-service-catalog-block';

export interface ServiceCatalogBlockForm {
  title: string;
  subtitle: string;
  description: string;
  heroImageUrl: string;
  heroNotes: ServiceCatalogHeroNote[];
  seoTitle: string;
  seoDescription: string;
  steps: ServiceCatalogStep[];
  stepsCardTransparent: boolean;
  seoTextTitle: string;
  seoText: string;
  ctaTitle: string;
  ctaText: string;
  ctaBackgroundColor: string;
  ctaTextColor: string;
  ctaBackgroundImage: string;
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaShowButtons: boolean;
}

const MAX_HERO_NOTES = 4;
const MAX_STEPS = 6;

function blockToForm(block: AdminServiceCatalogBlock): ServiceCatalogBlockForm {
  return {
    title: block.title ?? '',
    subtitle: block.subtitle ?? '',
    description: block.description ?? '',
    heroImageUrl: block.heroImageUrl ?? '',
    heroNotes: Array.isArray(block.heroNotes) ? block.heroNotes : [],
    seoTitle: block.seoTitle ?? '',
    seoDescription: block.seoDescription ?? '',
    steps: Array.isArray(block.steps) ? block.steps : [],
    stepsCardTransparent: block.stepsCardTransparent !== false,
    seoTextTitle: block.seoTextTitle ?? '',
    seoText: block.seoText ?? '',
    ctaTitle: block.ctaTitle ?? '',
    ctaText: block.ctaText ?? '',
    ctaBackgroundColor: block.ctaBackgroundColor ?? '',
    ctaTextColor: block.ctaTextColor ?? '',
    ctaBackgroundImage: block.ctaBackgroundImage ?? '',
    ctaBackgroundFit: block.ctaBackgroundFit || 'contain',
    ctaBackgroundImageOpacity: block.ctaBackgroundImageOpacity ?? 30,
    ctaShowButtons: block.ctaShowButtons !== false,
  };
}

/** Пустая строка превращается в null — на сайте тогда показывается значение по умолчанию. */
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : value;
}

export function useServiceCatalogBlockSettings() {
  const [form, setForm] = useState<ServiceCatalogBlockForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const block = await getAdminServiceCatalogBlock();
      setForm(blockToForm(block));
    } catch (error) {
      setMessage({
        type: 'err',
        text: error instanceof Error ? error.message : 'Не удалось загрузить настройки',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = useCallback(
    <K extends keyof ServiceCatalogBlockForm>(key: K, value: ServiceCatalogBlockForm[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const updateHeroNote = useCallback((index: number, patch: Partial<ServiceCatalogHeroNote>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const heroNotes = prev.heroNotes.map((note, i) =>
        i === index ? { ...note, ...patch } : note
      );
      return { ...prev, heroNotes };
    });
  }, []);

  const addHeroNote = useCallback(() => {
    setForm((prev) => {
      if (!prev || prev.heroNotes.length >= MAX_HERO_NOTES) return prev;
      return { ...prev, heroNotes: [...prev.heroNotes, { icon: 'ShieldCheck', text: '' }] };
    });
  }, []);

  const removeHeroNote = useCallback((index: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, heroNotes: prev.heroNotes.filter((_, i) => i !== index) };
    });
  }, []);

  const updateStep = useCallback((index: number, patch: Partial<ServiceCatalogStep>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.map((step, i) => (i === index ? { ...step, ...patch } : step));
      return { ...prev, steps };
    });
  }, []);

  const addStep = useCallback(() => {
    setForm((prev) => {
      if (!prev || prev.steps.length >= MAX_STEPS) return prev;
      return {
        ...prev,
        steps: [...prev.steps, { title: '', description: '', backgroundImage: null }],
      };
    });
  }, []);

  const removeStep = useCallback((index: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.filter((_, i) => i !== index) };
    });
  }, []);

  /** Картинки — base64 data URL, как у категорий каталога услуг. */
  const handleFileSelect = useCallback(
    (field: 'heroImageUrl' | 'ctaBackgroundImage') => (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          updateField(field, reader.result);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [updateField]
  );

  /** Фоновая картинка карточки этапа — base64 data URL. */
  const handleStepFileSelect = useCallback(
    (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          updateStep(index, { backgroundImage: reader.result });
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [updateStep]
  );

  const removeStepBackground = useCallback(
    (index: number) => {
      updateStep(index, { backgroundImage: null });
    },
    [updateStep]
  );

  const handleSave = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await updateAdminServiceCatalogBlock({
        title: form.title.trim() || 'Ремонт квартир',
        subtitle: emptyToNull(form.subtitle),
        description: emptyToNull(form.description),
        heroImageUrl: emptyToNull(form.heroImageUrl),
        heroNotes: form.heroNotes.filter((note) => note.text.trim() !== ''),
        seoTitle: emptyToNull(form.seoTitle),
        seoDescription: emptyToNull(form.seoDescription),
        steps: form.steps
          .filter((step) => step.title.trim() !== '')
          .map((step) => ({ ...step, backgroundImage: step.backgroundImage?.trim() || null })),
        stepsCardTransparent: form.stepsCardTransparent,
        seoTextTitle: emptyToNull(form.seoTextTitle),
        seoText: emptyToNull(form.seoText),
        ctaTitle: emptyToNull(form.ctaTitle),
        ctaText: emptyToNull(form.ctaText),
        ctaBackgroundColor: emptyToNull(form.ctaBackgroundColor),
        ctaTextColor: emptyToNull(form.ctaTextColor),
        ctaBackgroundImage: emptyToNull(form.ctaBackgroundImage),
        ctaBackgroundFit: form.ctaBackgroundFit,
        ctaBackgroundImageOpacity: form.ctaBackgroundImageOpacity,
        ctaShowButtons: form.ctaShowButtons,
      });
      setForm(blockToForm(saved));
      setMessage({ type: 'ok', text: 'Настройки сохранены' });
    } catch (error) {
      setMessage({
        type: 'err',
        text: error instanceof Error ? error.message : 'Не удалось сохранить настройки',
      });
    } finally {
      setSaving(false);
    }
  }, [form]);

  return {
    form,
    loading,
    saving,
    message,
    updateField,
    updateHeroNote,
    addHeroNote,
    removeHeroNote,
    updateStep,
    addStep,
    removeStep,
    handleFileSelect,
    handleStepFileSelect,
    removeStepBackground,
    handleSave,
    maxHeroNotes: MAX_HERO_NOTES,
    maxSteps: MAX_STEPS,
  };
}

export type ServiceCatalogBlockSettingsModel = ReturnType<typeof useServiceCatalogBlockSettings>;
