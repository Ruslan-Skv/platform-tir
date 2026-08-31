'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';

import {
  formatPackageWorkPeriodDays,
  normalizePackageWorkPeriodInput,
  parsePackageWorkPeriodInput,
} from '../../../platform/form/contractWorkPeriod';
import { WORK_PERIOD_KIND_CONFIG, type WorkPeriodSettingsKind } from '../packageSettingsConstants';
import { formatApplyWorkPeriodResult } from '../packageSettingsUtils';

export type PackageSettingsPageMessage = { type: 'success' | 'error'; text: string };

export type WorkPeriodRow = {
  kind: WorkPeriodSettingsKind;
  title: string;
  inputId: string;
  daysInput: string;
  updatedAt: string | null;
};

export type WorkPeriodConfirmState = {
  kind: WorkPeriodSettingsKind;
  days: number;
  title: string;
  message: string;
};

const WORK_PERIOD_KINDS = Object.keys(WORK_PERIOD_KIND_CONFIG) as WorkPeriodSettingsKind[];

function emptyRows(): WorkPeriodRow[] {
  return WORK_PERIOD_KINDS.map((kind) => {
    const config = WORK_PERIOD_KIND_CONFIG[kind];
    return {
      kind,
      title: config.title,
      inputId: config.inputId,
      daysInput: String(config.fallbackDays),
      updatedAt: null,
    };
  });
}

export function usePackageSettingsPage() {
  const { canEdit: isSuperAdmin } = useAdminSectionCanEdit();
  const [message, setMessage] = useState<PackageSettingsPageMessage | null>(null);
  const [rows, setRows] = useState<WorkPeriodRow[]>(emptyRows);
  const [loading, setLoading] = useState(true);
  const [savingKind, setSavingKind] = useState<WorkPeriodSettingsKind | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);
  const [confirmState, setConfirmState] = useState<WorkPeriodConfirmState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const results = await Promise.all(
        WORK_PERIOD_KINDS.map(async (kind) => {
          const config = WORK_PERIOD_KIND_CONFIG[kind];
          const res = await config.load();
          return {
            kind,
            title: config.title,
            inputId: config.inputId,
            daysInput: formatPackageWorkPeriodDays(res.defaultWorkPeriodDays),
            updatedAt: res.updatedAt,
          } satisfies WorkPeriodRow;
        })
      );
      setRows(results);
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Не удалось загрузить настройки',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setDaysInput = useCallback((kind: WorkPeriodSettingsKind, raw: string) => {
    const normalized = normalizePackageWorkPeriodInput(raw);
    setRows((prev) =>
      prev.map((row) => (row.kind === kind ? { ...row, daysInput: normalized } : row))
    );
  }, []);

  const runApplyToAll = useCallback(async (kind: WorkPeriodSettingsKind, days: number) => {
    const config = WORK_PERIOD_KIND_CONFIG[kind];
    setApplyingAll(true);
    try {
      const res = await config.applyToAll({ workPeriodDays: days });
      setMessage({ type: 'success', text: formatApplyWorkPeriodResult(res, config.title) });
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Не удалось применить ко всем',
      });
    } finally {
      setApplyingAll(false);
      setConfirmState(null);
    }
  }, []);

  const saveDefault = useCallback(
    async (kind: WorkPeriodSettingsKind) => {
      if (!isSuperAdmin) return;
      const row = rows.find((r) => r.kind === kind);
      if (!row) return;
      const parsed = parsePackageWorkPeriodInput(row.daysInput);
      if (parsed === null) {
        setMessage({
          type: 'error',
          text: 'Укажите срок от 1 до 3650 рабочих дней (целое число).',
        });
        return;
      }
      const config = WORK_PERIOD_KIND_CONFIG[kind];
      setSavingKind(kind);
      try {
        const res = await config.save({ defaultWorkPeriodDays: parsed });
        setRows((prev) =>
          prev.map((r) =>
            r.kind === kind
              ? {
                  ...r,
                  daysInput: formatPackageWorkPeriodDays(res.defaultWorkPeriodDays),
                  updatedAt: res.updatedAt,
                }
              : r
          )
        );
        setConfirmState({
          kind,
          days: parsed,
          title: 'Применить к существующим договорам?',
          message: config.applyConfirm(parsed),
        });
      } catch (e) {
        setMessage({
          type: 'error',
          text: e instanceof Error ? e.message : 'Не удалось сохранить',
        });
      } finally {
        setSavingKind(null);
      }
    },
    [isSuperAdmin, rows]
  );

  const handleConfirmModal = useCallback(() => {
    if (!confirmState) return;
    void runApplyToAll(confirmState.kind, confirmState.days);
  }, [confirmState, runApplyToAll]);

  const handleDismissAfterSave = useCallback(() => {
    if (confirmState) {
      const config = WORK_PERIOD_KIND_CONFIG[confirmState.kind];
      setMessage({ type: 'success', text: config.saveOk });
    }
    setConfirmState(null);
  }, [confirmState]);

  const busy = loading || savingKind !== null || applyingAll;

  const parsedByKind = useMemo(() => {
    const map = new Map<WorkPeriodSettingsKind, number | null>();
    for (const row of rows) {
      map.set(row.kind, parsePackageWorkPeriodInput(row.daysInput));
    }
    return map;
  }, [rows]);

  return {
    applyingAll,
    busy,
    confirmState,
    handleConfirmModal,
    handleDismissAfterSave,
    isSuperAdmin,
    loading,
    message,
    parsedByKind,
    refresh: load,
    rows,
    saveDefault,
    savingKind,
    setDaysInput,
    setMessage,
  };
}

export type PackageSettingsPageModel = ReturnType<typeof usePackageSettingsPage>;
