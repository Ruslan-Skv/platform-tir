'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';

import {
  MARKUP_KIND_CONFIG,
  MARKUP_SETTINGS_KINDS,
  type MarkupKindSettingsSnapshot,
  type MarkupSettingsKind,
} from '../markupSettingsConstants';
import { formatMarkupPercentInput, parseMarkupPercentInput } from '../markupSettingsUtils';

export type MarkupSettingsPageMessage = { type: 'success' | 'error'; text: string };

export type MarkupRow = {
  kind: MarkupSettingsKind;
  title: string;
  inputId: string;
  /** Поле «Налог, %» (только «Ремонт»). */
  taxInputId: string | null;
  markupInput: string;
  taxInput: string | null;
  /** Значения, уже сохранённые на сервере (для отбора изменённых строк). */
  savedMarkupPercent: number;
  savedTaxPercent: number;
  updatedAt: string | null;
};

/** Строка из снимка настроек; null — настроек ещё нет, показываем значения по умолчанию. */
function buildRow(
  kind: MarkupSettingsKind,
  snapshot: MarkupKindSettingsSnapshot | null
): MarkupRow {
  const config = MARKUP_KIND_CONFIG[kind];
  const markupPercent = snapshot?.markupPercent ?? config.fallbackPercent ?? 0;
  const taxPercent = snapshot?.taxPercent ?? 0;
  return {
    kind,
    title: config.title,
    inputId: config.inputId,
    taxInputId: config.taxInputId ?? null,
    markupInput: formatMarkupPercentInput(markupPercent),
    taxInput: config.taxInputId ? formatMarkupPercentInput(taxPercent) : null,
    savedMarkupPercent: markupPercent,
    savedTaxPercent: taxPercent,
    updatedAt: snapshot?.updatedAt ?? null,
  };
}

function describeSavedRow(row: MarkupRow, res: MarkupKindSettingsSnapshot): string {
  if (row.taxInputId !== null) {
    return `${row.title} — наценка ${res.markupPercent ?? 0} %, налог ${res.taxPercent ?? 0} %`;
  }
  return `${row.title} — наценка ${res.markupPercent ?? 0} %`;
}

export function useMarkupSettingsPage() {
  const { canEdit: isSuperAdmin } = useAdminSectionCanEdit();
  const [message, setMessage] = useState<MarkupSettingsPageMessage | null>(null);
  const [rows, setRows] = useState<MarkupRow[]>(() =>
    MARKUP_SETTINGS_KINDS.map((kind) => buildRow(kind, null))
  );
  const [loading, setLoading] = useState(true);
  const [savingKind, setSavingKind] = useState<MarkupSettingsKind | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      /** Падение одного направления не должно ломать всю страницу. */
      const settled = await Promise.all(
        MARKUP_SETTINGS_KINDS.map(async (kind) => {
          try {
            return {
              kind,
              failed: false,
              row: buildRow(kind, await MARKUP_KIND_CONFIG[kind].load()),
            };
          } catch {
            return { kind, failed: true, row: buildRow(kind, null) };
          }
        })
      );
      setRows(settled.map((item) => item.row));
      const failedTitles = settled
        .filter((item) => item.failed)
        .map((item) => MARKUP_KIND_CONFIG[item.kind].title);
      if (failedTitles.length > 0) {
        setMessage({
          type: 'error',
          text: `Не удалось загрузить настройки: ${failedTitles.join(', ')} — показаны значения по умолчанию.`,
        });
      }
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

  const setTaxInput = useCallback((kind: MarkupSettingsKind, raw: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.kind === kind && row.taxInput !== null ? { ...row, taxInput: raw } : row
      )
    );
  }, []);

  /** Сохраняет направление без сообщений; null — ошибка запроса или валидации. */
  const persistKind = useCallback(
    async (kind: MarkupSettingsKind): Promise<MarkupKindSettingsSnapshot | null> => {
      if (!isSuperAdmin) return null;
      const row = rows.find((r) => r.kind === kind);
      if (!row) return null;
      const parsed = parseMarkupPercentInput(row.markupInput);
      if (parsed === null) return null;
      const parsedTax = row.taxInput !== null ? parseMarkupPercentInput(row.taxInput) : null;
      if (row.taxInput !== null && parsedTax === null) return null;
      setSavingKind(kind);
      try {
        const res = await MARKUP_KIND_CONFIG[kind].save({
          markupPercent: parsed,
          taxPercent: parsedTax,
        });
        setRows((prev) =>
          prev.map((r) =>
            r.kind === kind
              ? {
                  ...r,
                  markupInput: formatMarkupPercentInput(res.markupPercent ?? 0),
                  taxInput:
                    r.taxInput !== null ? formatMarkupPercentInput(res.taxPercent ?? 0) : null,
                  savedMarkupPercent: res.markupPercent ?? 0,
                  savedTaxPercent: res.taxPercent ?? 0,
                  updatedAt: res.updatedAt,
                }
              : r
          )
        );
        return res;
      } catch {
        return null;
      } finally {
        setSavingKind(null);
      }
    },
    [isSuperAdmin, rows]
  );

  /** Сохраняет только изменённые направления и показывает один итог. */
  const saveAllMarkups = useCallback(async (): Promise<void> => {
    if (!isSuperAdmin) return;
    const invalid = rows.find((row) => {
      const markupInvalid = parseMarkupPercentInput(row.markupInput) === null;
      const taxInvalid = row.taxInput !== null && parseMarkupPercentInput(row.taxInput) === null;
      return markupInvalid || taxInvalid;
    });
    if (invalid) {
      setMessage({
        type: 'error',
        text: `Проверьте «${invalid.title}»: наценка и налог — целое число от 0 до 100 %.`,
      });
      return;
    }
    const dirty = rows.filter((row) => {
      const markup = parseMarkupPercentInput(row.markupInput) ?? 0;
      const tax = row.taxInput !== null ? (parseMarkupPercentInput(row.taxInput) ?? 0) : null;
      return markup !== row.savedMarkupPercent || (tax !== null && tax !== row.savedTaxPercent);
    });
    if (dirty.length === 0) {
      setMessage({ type: 'success', text: 'Нет изменений для сохранения.' });
      return;
    }
    const savedParts: string[] = [];
    const failedTitles: string[] = [];
    for (const row of dirty) {
      const res = await persistKind(row.kind);
      if (res) {
        savedParts.push(describeSavedRow(row, res));
      } else {
        failedTitles.push(row.title);
      }
    }
    if (failedTitles.length > 0) {
      setMessage({
        type: 'error',
        text: `${savedParts.length > 0 ? `Сохранено: ${savedParts.join('; ')}. ` : ''}Не удалось сохранить: ${failedTitles.join(', ')}.`,
      });
      return;
    }
    setMessage({ type: 'success', text: `Сохранено: ${savedParts.join('; ')}.` });
  }, [isSuperAdmin, rows, persistKind]);

  const busy = loading || savingKind !== null;

  return {
    busy,
    isSuperAdmin,
    loading,
    message,
    refresh: load,
    rows,
    saveAllMarkups,
    savingKind,
    setMarkupInput,
    setTaxInput,
    setMessage,
  };
}

export type MarkupSettingsPageModel = ReturnType<typeof useMarkupSettingsPage>;
