'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  formatPackageWorkPeriodDays,
  normalizePackageWorkPeriodInput,
  parsePackageWorkPeriodInput,
} from '../../../platform/form/contractWorkPeriod';
import { WORK_PERIOD_KIND_CONFIG, type WorkPeriodSettingsKind } from '../packageSettingsConstants';
import { formatApplyWorkPeriodResult } from '../packageSettingsUtils';

export type UseWorkPeriodSettingsSectionParams = {
  kind: WorkPeriodSettingsKind;
  isSuperAdmin: boolean;
  onError: (message: string | null) => void;
  onOk: (message: string | null) => void;
};

export type WorkPeriodConfirmState = {
  days: number;
  title: string;
  message: string;
};

export function useWorkPeriodSettingsSection({
  kind,
  isSuperAdmin,
  onError,
  onOk,
}: UseWorkPeriodSettingsSectionParams) {
  const config = WORK_PERIOD_KIND_CONFIG[kind];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);
  const [defaultDaysInput, setDefaultDaysInput] = useState(String(config.fallbackDays));
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<WorkPeriodConfirmState | null>(null);

  const load = useCallback(async () => {
    const cfg = WORK_PERIOD_KIND_CONFIG[kind];
    setLoading(true);
    onError(null);
    try {
      const res = await cfg.load();
      setDefaultDaysInput(formatPackageWorkPeriodDays(res.defaultWorkPeriodDays));
      setUpdatedAt(res.updatedAt);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, [kind, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsedDefaultDays = useMemo(
    () => parsePackageWorkPeriodInput(defaultDaysInput),
    [defaultDaysInput]
  );

  const handleDefaultDaysChange = useCallback((raw: string) => {
    setDefaultDaysInput(normalizePackageWorkPeriodInput(raw));
  }, []);

  const runApplyToAll = useCallback(
    async (days: number) => {
      setApplyingAll(true);
      onError(null);
      onOk(null);
      try {
        const res = await config.applyToAll({ workPeriodDays: days });
        onOk(formatApplyWorkPeriodResult(res, config.title));
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Не удалось применить ко всем');
      } finally {
        setApplyingAll(false);
        setConfirmState(null);
      }
    },
    [config, onError, onOk]
  );

  const handleSaveDefault = useCallback(async () => {
    if (!isSuperAdmin) return;
    if (parsedDefaultDays === null) {
      onError('Укажите срок от 1 до 3650 рабочих дней (целое число).');
      return;
    }
    setSaving(true);
    onError(null);
    onOk(null);
    try {
      const res = await config.save({ defaultWorkPeriodDays: parsedDefaultDays });
      setDefaultDaysInput(formatPackageWorkPeriodDays(res.defaultWorkPeriodDays));
      setUpdatedAt(res.updatedAt);
      setConfirmState({
        days: parsedDefaultDays,
        title: 'Применить к существующим договорам?',
        message: config.applyConfirm(parsedDefaultDays),
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }, [config, isSuperAdmin, onError, onOk, parsedDefaultDays]);

  const handleConfirmModal = useCallback(() => {
    if (!confirmState) return;
    void runApplyToAll(confirmState.days);
  }, [confirmState, runApplyToAll]);

  const handleDismissAfterSave = useCallback(() => {
    onOk(config.saveOk);
    setConfirmState(null);
  }, [config.saveOk, onOk]);

  return {
    title: config.title,
    inputId: config.inputId,
    loading,
    saving,
    applyingAll,
    defaultDaysInput,
    updatedAt,
    parsedDefaultDays,
    isSuperAdmin,
    confirmState,
    handleDefaultDaysChange,
    handleSaveDefault,
    handleConfirmModal,
    handleDismissAfterSave,
  };
}

export type WorkPeriodSettingsSectionModel = ReturnType<typeof useWorkPeriodSettingsSection>;
