'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT } from '../../../families/product-like/print/productWorkOrder';
import { MARKUP_KIND_CONFIG, type MarkupSettingsKind } from '../markupSettingsConstants';
import { formatMarkupPercentInput, parseMarkupPercentInput } from '../markupSettingsUtils';

export type UseMarkupSettingsSectionParams = {
  kind: MarkupSettingsKind;
  isSuperAdmin: boolean;
  onError: (message: string | null) => void;
  onOk: (message: string | null) => void;
};

export function useMarkupSettingsSection({
  kind,
  isSuperAdmin,
  onError,
  onOk,
}: UseMarkupSettingsSectionParams) {
  const config = MARKUP_KIND_CONFIG[kind];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markupInput, setMarkupInput] = useState(
    formatMarkupPercentInput(config.fallbackPercent ?? DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT)
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cfg = MARKUP_KIND_CONFIG[kind];
    setLoading(true);
    onError(null);
    try {
      const res = await cfg.load();
      setMarkupInput(formatMarkupPercentInput(res.windowsWorkOrderMarkupPercent));
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

  const parsedMarkup = useMemo(() => parseMarkupPercentInput(markupInput), [markupInput]);

  const handleSave = useCallback(async () => {
    if (!isSuperAdmin) return;
    if (parsedMarkup === null) {
      onError('Укажите наценку от 0 до 100 % (целое число).');
      return;
    }
    setSaving(true);
    onError(null);
    onOk(null);
    try {
      const res = await config.save({ windowsWorkOrderMarkupPercent: parsedMarkup });
      setMarkupInput(formatMarkupPercentInput(res.windowsWorkOrderMarkupPercent));
      setUpdatedAt(res.updatedAt);
      onOk(config.saveOk(res.windowsWorkOrderMarkupPercent));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }, [config, isSuperAdmin, onError, onOk, parsedMarkup]);

  return {
    title: config.title,
    inputId: config.inputId,
    loading,
    saving,
    markupInput,
    setMarkupInput,
    updatedAt,
    parsedMarkup,
    isSuperAdmin,
    handleSave,
  };
}

export type MarkupSettingsSectionModel = ReturnType<typeof useMarkupSettingsSection>;
