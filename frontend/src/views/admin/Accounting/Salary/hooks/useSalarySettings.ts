'use client';

import { useCallback, useEffect, useState } from 'react';

import type { SalaryCategory, SalarySettings } from '@/shared/api/admin-salary';
import {
  createSalaryCategory,
  deleteSalaryCategory,
  deleteSalaryRateRule,
  saveSalaryGlobalSettings,
  updateSalaryCategory,
  upsertSalaryRateRule,
} from '@/shared/api/admin-salary';

export interface GlobalFormState {
  taxPercent: string;
  brigadier1Percent: string;
  brigadier2Percent: string;
  brigadeSplitCoeff: string;
  commonPoolToBrigadier: boolean;
}

/** Payload модалки создания/правки категории (code — только при создании). */
export interface SalaryCategoryInput {
  code?: string;
  name: string;
  vsPercent: number;
  splitSign: number;
  splitClose: number;
  managerPercent: number;
  surveyorPercent: number;
  brigadierPercent: number;
  isActive: boolean;
  sortOrder: number;
}

/** Payload модалки добавления правила ставок. */
export interface SalaryRateRuleInput {
  officeId: string | null;
  role: string;
  percent: number;
}

const EMPTY_GLOBAL: GlobalFormState = {
  taxPercent: '8',
  brigadier1Percent: '3.5',
  brigadier2Percent: '5',
  brigadeSplitCoeff: '1.5882',
  commonPoolToBrigadier: true,
};

/** Логика вкладки «Настройки» (суперадмин): глобальные параметры, категории, правила ставок. */
export function useSalarySettings(
  settings: SalarySettings | null,
  reloadSettings: () => Promise<void>
) {
  const [globalForm, setGlobalForm] = useState<GlobalFormState>(EMPTY_GLOBAL);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice((current) => (current === text ? null : current)), 4000);
  }, []);

  useEffect(() => {
    if (settings) {
      setGlobalForm({
        taxPercent: String(settings.global.taxPercent),
        brigadier1Percent: String(settings.global.brigadier1Percent),
        brigadier2Percent: String(settings.global.brigadier2Percent),
        brigadeSplitCoeff: String(settings.global.brigadeSplitCoeff),
        commonPoolToBrigadier: settings.global.commonPoolToBrigadier,
      });
    }
  }, [settings]);

  const saveGlobal = useCallback(async () => {
    setGlobalSaving(true);
    setError(null);
    try {
      await saveSalaryGlobalSettings({
        taxPercent: Number(globalForm.taxPercent.replace(',', '.')),
        brigadier1Percent: Number(globalForm.brigadier1Percent.replace(',', '.')),
        brigadier2Percent: Number(globalForm.brigadier2Percent.replace(',', '.')),
        brigadeSplitCoeff: Number(globalForm.brigadeSplitCoeff.replace(',', '.')),
        commonPoolToBrigadier: globalForm.commonPoolToBrigadier,
      });
      showNotice('Глобальные параметры сохранены');
      await reloadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить параметры');
    } finally {
      setGlobalSaving(false);
    }
  }, [globalForm, reloadSettings, showNotice]);

  // ===== Категории: создание/правка через модалку, удаление через ConfirmModal =====

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  /** null — создание новой категории. */
  const [editingCategory, setEditingCategory] = useState<SalaryCategory | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<SalaryCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

  const openCreateCategoryModal = useCallback(() => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  }, []);

  const openEditCategoryModal = useCallback((category: SalaryCategory) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  }, []);

  const closeCategoryModal = useCallback(() => {
    setCategoryModalOpen(false);
    setEditingCategory(null);
  }, []);

  const handleSubmitCategory = useCallback(
    async (input: SalaryCategoryInput) => {
      if (!editingCategory && !input.code?.trim()) {
        setError('Укажите код новой категории');
        return;
      }
      setCategorySaving(true);
      try {
        if (editingCategory) {
          const { code: _code, ...update } = input;
          await updateSalaryCategory(editingCategory.id, update);
          showNotice('Категория сохранена');
        } else {
          await createSalaryCategory({ ...input, code: input.code!.trim().toUpperCase() });
          showNotice('Категория добавлена');
        }
        closeCategoryModal();
        await reloadSettings();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось сохранить категорию');
      } finally {
        setCategorySaving(false);
      }
    },
    [editingCategory, closeCategoryModal, reloadSettings, showNotice]
  );

  const handleDeleteCategory = useCallback(async () => {
    if (!deleteCategoryTarget) return;
    setDeletingCategory(true);
    try {
      await deleteSalaryCategory(deleteCategoryTarget.id);
      showNotice('Категория удалена');
      setDeleteCategoryTarget(null);
      await reloadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить категорию');
    } finally {
      setDeletingCategory(false);
    }
  }, [deleteCategoryTarget, reloadSettings, showNotice]);

  // ===== Правила ставок по офисам: добавление через модалку =====

  /** Категория, для которой открыта модалка добавления правила. */
  const [ruleCategory, setRuleCategory] = useState<SalaryCategory | null>(null);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<{
    category: SalaryCategory;
    ruleId: string;
  } | null>(null);
  const [deletingRule, setDeletingRule] = useState(false);

  const openRuleModal = useCallback((category: SalaryCategory) => {
    setRuleCategory(category);
  }, []);

  const closeRuleModal = useCallback(() => setRuleCategory(null), []);

  const handleSubmitRule = useCallback(
    async (input: SalaryRateRuleInput) => {
      if (!ruleCategory) return;
      setRulesSaving(true);
      try {
        await upsertSalaryRateRule(ruleCategory.id, input);
        showNotice('Правило ставок сохранено');
        closeRuleModal();
        await reloadSettings();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось сохранить правило');
      } finally {
        setRulesSaving(false);
      }
    },
    [ruleCategory, closeRuleModal, reloadSettings, showNotice]
  );

  const handleDeleteRule = useCallback(async () => {
    if (!deleteRuleTarget) return;
    setDeletingRule(true);
    try {
      await deleteSalaryRateRule(deleteRuleTarget.category.id, deleteRuleTarget.ruleId);
      showNotice('Правило удалено');
      setDeleteRuleTarget(null);
      await reloadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить правило');
    } finally {
      setDeletingRule(false);
    }
  }, [deleteRuleTarget, reloadSettings, showNotice]);

  return {
    globalForm,
    setGlobalForm,
    globalSaving,
    saveGlobal,
    error,
    setError,
    notice,
    categoryModalOpen,
    editingCategory,
    categorySaving,
    openCreateCategoryModal,
    openEditCategoryModal,
    closeCategoryModal,
    handleSubmitCategory,
    deleteCategoryTarget,
    setDeleteCategoryTarget,
    deletingCategory,
    handleDeleteCategory,
    ruleCategory,
    openRuleModal,
    closeRuleModal,
    rulesSaving,
    handleSubmitRule,
    deleteRuleTarget,
    setDeleteRuleTarget,
    deletingRule,
    handleDeleteRule,
  };
}

export type SalarySettingsModel = ReturnType<typeof useSalarySettings>;
