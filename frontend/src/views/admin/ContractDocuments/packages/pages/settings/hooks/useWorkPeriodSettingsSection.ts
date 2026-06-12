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
      const applyNow = window.confirm(
        `Срок по умолчанию для «${config.title}» сохранён (${parsedDefaultDays} дн.).\n\nПрименить ко всем неподписанным договорам «${config.title}» без ручного срока в карточке?`
      );
      if (applyNow) {
        const applyRes = await config.applyToAll({ workPeriodDays: parsedDefaultDays });
        onOk(`${config.saveOk} ${formatApplyWorkPeriodResult(applyRes, config.title)}`);
      } else {
        onOk(config.saveOk);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }, [config, isSuperAdmin, onError, onOk, parsedDefaultDays]);

  const handleApplyToAll = useCallback(async () => {
    if (!isSuperAdmin) return;
    const days = parsedDefaultDays;
    if (days === null) {
      onError('Сначала укажите корректный срок в поле выше.');
      return;
    }
    if (!window.confirm(config.applyConfirm(days))) return;
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
    }
  }, [config, isSuperAdmin, onError, onOk, parsedDefaultDays]);

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
    handleDefaultDaysChange,
    handleSaveDefault,
    handleApplyToAll,
  };
}

export type WorkPeriodSettingsSectionModel = ReturnType<typeof useWorkPeriodSettingsSection>;
