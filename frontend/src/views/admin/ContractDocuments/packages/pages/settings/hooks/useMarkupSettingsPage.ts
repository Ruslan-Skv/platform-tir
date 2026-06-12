'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  getContractDocumentWindowsWorkOrderMarkup,
  putContractDocumentWindowsWorkOrderMarkup,
} from '@/shared/api/admin-contract-document-packages';

import { DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT } from '../../../families/product-like/print/productWorkOrder';
import { formatMarkupPercentInput, parseMarkupPercentInput } from '../markupSettingsUtils';

export function useMarkupSettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markupInput, setMarkupInput] = useState(
    formatMarkupPercentInput(DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT)
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getContractDocumentWindowsWorkOrderMarkup();
      setMarkupInput(formatMarkupPercentInput(res.windowsWorkOrderMarkupPercent));
      setUpdatedAt(res.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parsedMarkup = useMemo(() => parseMarkupPercentInput(markupInput), [markupInput]);

  const handleSave = useCallback(async () => {
    if (!isSuperAdmin) return;
    if (parsedMarkup === null) {
      setError('Укажите наценку от 0 до 100 % (целое число).');
      return;
    }
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const res = await putContractDocumentWindowsWorkOrderMarkup({
        windowsWorkOrderMarkupPercent: parsedMarkup,
      });
      setMarkupInput(formatMarkupPercentInput(res.windowsWorkOrderMarkupPercent));
      setUpdatedAt(res.updatedAt);
      setOk(
        `Наценка для заказ-нарядов «Окна» сохранена (${res.windowsWorkOrderMarkupPercent} %). Цена в заказ-наряде = цена в счёт-заказе минус эта доля.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }, [isSuperAdmin, parsedMarkup]);

  return {
    isSuperAdmin,
    loading,
    saving,
    markupInput,
    setMarkupInput,
    updatedAt,
    error,
    ok,
    parsedMarkup,
    handleSave,
  };
}

export type MarkupSettingsPageModel = ReturnType<typeof useMarkupSettingsPage>;
