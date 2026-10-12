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
  /** Контролировать режим работы (удержания из оклада). */
  workModeEnforced: boolean;
  /** Учитывать прогулы (удержание дневной доли оклада за прогул). */
  truancyEnforced: boolean;
  /** Премии за места по итогам продаж месяца, ₽. */
  salesBonusFirstPlace: string;
  salesBonusSecondPlace: string;
  salesBonusThirdPlace: string;
  /** Минимальный уровень продаж менеджера для права на премию, ₽. */
  salesBonusMinSales: string;
  /** План продаж: пороги объёма продаж за месяц, ₽. */
  salesPlanThreshold1: string;
  salesPlanThreshold2: string;
  salesPlanThreshold3: string;
  /** Премии за пороги плана — % от з/п менеджера по договорам. */
  salesPlanPercent1: string;
  salesPlanPercent2: string;
  salesPlanPercent3: string;
  /** Пользователь-бригадир; '' — не назначен. */
  brigadierUserId: string;
  /** Ведущий специалист по направлениям: id направления → id пользователя; '' — не назначен. */
  leadSpecialistUserIds: Record<string, string>;
  /** Строки окладов: сотрудник + месячный оклад (пустая строка — не установлен). */
  employeeSalaries: Array<{ userId: string; monthlySalary: string }>;
}

/** Payload модалки создания/правки направления (code — только при создании). */
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
  workModeEnforced: false,
  truancyEnforced: false,
  salesBonusFirstPlace: '0',
  salesBonusSecondPlace: '0',
  salesBonusThirdPlace: '0',
  salesBonusMinSales: '0',
  salesPlanThreshold1: '0',
  salesPlanThreshold2: '0',
  salesPlanThreshold3: '0',
  salesPlanPercent1: '0',
  salesPlanPercent2: '0',
  salesPlanPercent3: '0',
  brigadierUserId: '',
  leadSpecialistUserIds: {},
  employeeSalaries: [],
};

/** Логика вкладки «Настройки» (суперадмин): глобальные параметры, направления, правила ставок. */
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
        workModeEnforced: settings.global.workModeEnforced ?? false,
        truancyEnforced: settings.global.truancyEnforced ?? false,
        salesBonusFirstPlace: String(settings.global.salesBonusFirstPlace ?? 0),
        salesBonusSecondPlace: String(settings.global.salesBonusSecondPlace ?? 0),
        salesBonusThirdPlace: String(settings.global.salesBonusThirdPlace ?? 0),
        salesBonusMinSales: String(settings.global.salesBonusMinSales ?? 0),
        salesPlanThreshold1: String(settings.global.salesPlanThreshold1 ?? 0),
        salesPlanThreshold2: String(settings.global.salesPlanThreshold2 ?? 0),
        salesPlanThreshold3: String(settings.global.salesPlanThreshold3 ?? 0),
        salesPlanPercent1: String(settings.global.salesPlanPercent1 ?? 0),
        salesPlanPercent2: String(settings.global.salesPlanPercent2 ?? 0),
        salesPlanPercent3: String(settings.global.salesPlanPercent3 ?? 0),
        brigadierUserId: settings.global.brigadierUserId ?? '',
        leadSpecialistUserIds: Object.fromEntries(
          settings.categories.map((c) => [c.id, c.leadSpecialistUserId ?? ''])
        ),
        employeeSalaries: (settings.global.employeeSalaries ?? []).map((s) => ({
          userId: s.userId,
          monthlySalary: String(s.monthlySalary),
        })),
      });
    }
  }, [settings]);

  const saveGlobal = useCallback(async () => {
    setGlobalSaving(true);
    setError(null);
    try {
      await saveSalaryGlobalSettings({
        taxPercent: Number(globalForm.taxPercent.replace(',', '.')),
        workModeEnforced: globalForm.workModeEnforced,
        truancyEnforced: globalForm.truancyEnforced,
        salesBonusFirstPlace: Number(globalForm.salesBonusFirstPlace.replace(',', '.')),
        salesBonusSecondPlace: Number(globalForm.salesBonusSecondPlace.replace(',', '.')),
        salesBonusThirdPlace: Number(globalForm.salesBonusThirdPlace.replace(',', '.')),
        salesBonusMinSales: Number(globalForm.salesBonusMinSales.replace(',', '.')),
        salesPlanThreshold1: Number(globalForm.salesPlanThreshold1.replace(',', '.')),
        salesPlanThreshold2: Number(globalForm.salesPlanThreshold2.replace(',', '.')),
        salesPlanThreshold3: Number(globalForm.salesPlanThreshold3.replace(',', '.')),
        salesPlanPercent1: Number(globalForm.salesPlanPercent1.replace(',', '.')),
        salesPlanPercent2: Number(globalForm.salesPlanPercent2.replace(',', '.')),
        salesPlanPercent3: Number(globalForm.salesPlanPercent3.replace(',', '.')),
        brigadierUserId: globalForm.brigadierUserId || null,
        employeeSalaries: globalForm.employeeSalaries
          .filter((row) => row.userId)
          .map((row) => ({
            userId: row.userId,
            monthlySalary: row.monthlySalary.trim()
              ? Number(row.monthlySalary.replace(',', '.'))
              : null,
          })),
      });
      // Привязки ВС хранятся на направлениях — сохраняем только изменившиеся.
      const current = new Map(
        (settings?.categories ?? []).map((c) => [c.id, c.leadSpecialistUserId ?? ''])
      );
      const changed = Object.entries(globalForm.leadSpecialistUserIds).filter(
        ([categoryId, userId]) => current.get(categoryId) !== userId
      );
      await Promise.all(
        changed.map(([categoryId, userId]) =>
          updateSalaryCategory(categoryId, { leadSpecialistUserId: userId || null })
        )
      );
      showNotice('Глобальные параметры сохранены');
      await reloadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить параметры');
    } finally {
      setGlobalSaving(false);
    }
  }, [globalForm, settings, reloadSettings, showNotice]);

  // ===== Направления: создание/правка через модалку, удаление через ConfirmModal =====

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  /** null — создание нового направления. */
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
        setError('Укажите код нового направления');
        return;
      }
      setCategorySaving(true);
      try {
        if (editingCategory) {
          const { code: _code, ...update } = input;
          await updateSalaryCategory(editingCategory.id, update);
          showNotice('Направление сохранено');
        } else {
          await createSalaryCategory({ ...input, code: input.code!.trim().toUpperCase() });
          showNotice('Направление добавлено');
        }
        closeCategoryModal();
        await reloadSettings();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось сохранить направление');
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
      showNotice('Направление удалено');
      setDeleteCategoryTarget(null);
      await reloadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить направление');
    } finally {
      setDeletingCategory(false);
    }
  }, [deleteCategoryTarget, reloadSettings, showNotice]);

  // ===== Правила ставок по офисам: добавление через модалку =====

  /** Направление, для которого открыта модалка добавления правила. */
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
