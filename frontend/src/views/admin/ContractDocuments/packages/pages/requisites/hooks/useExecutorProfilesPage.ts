'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type ExecutorRequisiteProfile,
  getContractDocumentExecutorProfiles,
  putContractDocumentExecutorProfiles,
} from '@/shared/api/admin-contract-document-packages';
import { normalizeExecutorRequisiteProfile } from '@/views/admin/ContractDocuments/packages/platform/form/executorBankFields';

import { EMPTY_EXECUTOR_PROFILE } from '../executorProfilesConstants';

export function useExecutorProfilesPage() {
  const [items, setItems] = useState<ExecutorRequisiteProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExecutorRequisiteProfile>(EMPTY_EXECUTOR_PROFILE);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getContractDocumentExecutorProfiles('REPAIR');
        setItems((res.items ?? []).map(normalizeExecutorRequisiteProfile));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить реквизиты');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(EMPTY_EXECUTOR_PROFILE);
    setEditingIndex(null);
  }, []);

  const saveAll = useCallback(async (nextItems: ExecutorRequisiteProfile[]) => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const normalizedItems = nextItems.map(normalizeExecutorRequisiteProfile);
      await putContractDocumentExecutorProfiles({ kind: 'REPAIR', items: normalizedItems });
      setItems(normalizedItems);
      setOk('Сохранено.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить реквизиты');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleUpsert = useCallback(async () => {
    if (!draft.title?.trim()) {
      setError('Укажите название набора реквизитов.');
      return;
    }
    const next = [...items];
    const normalized: ExecutorRequisiteProfile = normalizeExecutorRequisiteProfile({
      ...draft,
      title: draft.title.trim(),
    });
    if (editingIndex === null) next.push(normalized);
    else next[editingIndex] = normalized;
    await saveAll(next);
    resetDraft();
  }, [draft, editingIndex, items, resetDraft, saveAll]);

  const handleDelete = useCallback(
    async (idx: number) => {
      const next = items.filter((_, i) => i !== idx);
      await saveAll(next);
      if (editingIndex === idx) resetDraft();
    },
    [editingIndex, items, resetDraft, saveAll]
  );

  const startEdit = useCallback(
    (idx: number) => {
      const item = items[idx];
      if (!item) return;
      setDraft({
        ...item,
        kind: item.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY',
      });
      setEditingIndex(idx);
    },
    [items]
  );

  return {
    draft,
    editingIndex,
    error,
    handleDelete,
    handleUpsert,
    items,
    loading,
    ok,
    resetDraft,
    saving,
    setDraft,
    startEdit,
  };
}

export type ExecutorProfilesPageModel = ReturnType<typeof useExecutorProfilesPage>;
