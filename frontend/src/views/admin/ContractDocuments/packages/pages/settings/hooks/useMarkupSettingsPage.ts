'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';

import { DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT } from '../../../families/product-like/print/productWorkOrder';
import {
  MARKUP_KIND_CONFIG,
  MARKUP_SETTINGS_KINDS,
  type MarkupSettingsKind,
} from '../markupSettingsConstants';
import { formatMarkupPercentInput, parseMarkupPercentInput } from '../markupSettingsUtils';

export type MarkupSettingsPageMessage = { type: 'success' | 'error'; text: string };

export type MarkupRow = {
  kind: MarkupSettingsKind;
  title: string;
  inputId: string;
  markupInput: string;
  updatedAt: string | null;
};

function emptyRows(): MarkupRow[] {
  return MARKUP_SETTINGS_KINDS.map((kind) => {
    const config = MARKUP_KIND_CONFIG[kind];
    return {
      kind,
      title: config.title,
      inputId: config.inputId,
      markupInput: formatMarkupPercentInput(
        config.fallbackPercent ?? DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT
      ),
      updatedAt: null,
    };
  });
}

export function useMarkupSettingsPage() {
  const { canEdit: isSuperAdmin } = useAdminSectionCanEdit();
  const [message, setMessage] = useState<MarkupSettingsPageMessage | null>(null);
  const [rows, setRows] = useState<MarkupRow[]>(emptyRows);
  const [loading, setLoading] = useState(true);
  const [savingKind, setSavingKind] = useState<MarkupSettingsKind | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const results = await Promise.all(
        MARKUP_SETTINGS_KINDS.map(async (kind) => {
          const config = MARKUP_KIND_CONFIG[kind];
          const res = await config.load();
          return {
            kind,
            title: config.title,
            inputId: config.inputId,
            markupInput: formatMarkupPercentInput(res.windowsWorkOrderMarkupPercent),
            updatedAt: res.updatedAt,
          } satisfies MarkupRow;
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

  const setMarkupInput = useCallback((kind: MarkupSettingsKind, raw: string) => {
    setRows((prev) => prev.map((row) => (row.kind === kind ? { ...row, markupInput: raw } : row)));
  }, []);

  const saveMarkup = useCallback(
    async (kind: MarkupSettingsKind) => {
      if (!isSuperAdmin) return;
      const row = rows.find((r) => r.kind === kind);
      if (!row) return;
      const parsed = parseMarkupPercentInput(row.markupInput);
      if (parsed === null) {
        setMessage({
          type: 'error',
          text: 'Укажите наценку от 0 до 100 % (целое число).',
        });
        return;
      }
      const config = MARKUP_KIND_CONFIG[kind];
      setSavingKind(kind);
      try {
        const res = await config.save({ windowsWorkOrderMarkupPercent: parsed });
        setRows((prev) =>
          prev.map((r) =>
            r.kind === kind
              ? {
                  ...r,
                  markupInput: formatMarkupPercentInput(res.windowsWorkOrderMarkupPercent),
                  updatedAt: res.updatedAt,
                }
              : r
          )
        );
        setMessage({
          type: 'success',
          text: config.saveOk(res.windowsWorkOrderMarkupPercent),
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

  const busy = loading || savingKind !== null;

  const parsedByKind = useMemo(() => {
    const map = new Map<MarkupSettingsKind, number | null>();
    for (const row of rows) {
      map.set(row.kind, parseMarkupPercentInput(row.markupInput));
    }
    return map;
  }, [rows]);

  return {
    busy,
    isSuperAdmin,
    loading,
    message,
    parsedByKind,
    refresh: load,
    rows,
    saveMarkup,
    savingKind,
    setMarkupInput,
    setMessage,
  };
}

export type MarkupSettingsPageModel = ReturnType<typeof useMarkupSettingsPage>;
