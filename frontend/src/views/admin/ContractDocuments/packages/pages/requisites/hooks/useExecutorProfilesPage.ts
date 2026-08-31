'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ExecutorRequisiteProfile,
  getContractDocumentExecutorProfiles,
  putContractDocumentExecutorProfiles,
} from '@/shared/api/admin-contract-document-packages';
import { normalizeExecutorRequisiteProfile } from '@/views/admin/ContractDocuments/packages/platform/form/executorBankFields';

import {
  EMPTY_EXECUTOR_PROFILE,
  type ExecutorKindFilter,
  type ExecutorProfileRowView,
  type ExecutorSortKey,
} from '../executorProfilesConstants';

export type ExecutorProfilesPageMessage = { type: 'success' | 'error'; text: string };

export function useExecutorProfilesPage() {
  const [items, setItems] = useState<ExecutorRequisiteProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<ExecutorProfilesPageMessage | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExecutorRequisiteProfile>(EMPTY_EXECUTOR_PROFILE);
  const [formOpen, setFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [kindFilter, setKindFilter] = useState<ExecutorKindFilter>('ALL');
  const [sortKey, setSortKey] = useState<ExecutorSortKey>('title_asc');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await getContractDocumentExecutorProfiles('REPAIR');
      setItems((res.items ?? []).map(normalizeExecutorRequisiteProfile));
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Не удалось загрузить реквизиты',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingIndex(null);
    setDraft(EMPTY_EXECUTOR_PROFILE);
    setFormError(null);
  }, []);

  const openCreate = useCallback(() => {
    setDraft(EMPTY_EXECUTOR_PROFILE);
    setEditingIndex(null);
    setFormError(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback(
    (idx: number) => {
      const item = items[idx];
      if (!item) return;
      setDraft({
        ...item,
        kind: item.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY',
      });
      setEditingIndex(idx);
      setFormError(null);
      setFormOpen(true);
    },
    [items]
  );

  const saveAll = useCallback(
    async (nextItems: ExecutorRequisiteProfile[], successText: string): Promise<string | null> => {
      setSaving(true);
      setFormError(null);
      const normalizedItems = nextItems.map(normalizeExecutorRequisiteProfile);
      try {
        await putContractDocumentExecutorProfiles({ kind: 'REPAIR', items: normalizedItems });
        setItems(normalizedItems);
        setMessage({ type: 'success', text: successText });
        return null;
      } catch (e) {
        const text = e instanceof Error ? e.message : 'Не удалось сохранить реквизиты';
        setFormError(text);
        return text;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const handleUpsert = useCallback(async () => {
    if (!draft.title?.trim()) {
      setFormError('Укажите название набора реквизитов.');
      return false;
    }
    const next = [...items];
    const normalized = normalizeExecutorRequisiteProfile({
      ...draft,
      title: draft.title.trim(),
    });
    const isEdit = editingIndex !== null;
    if (editingIndex === null) next.push(normalized);
    else next[editingIndex] = normalized;
    const error = await saveAll(next, isEdit ? 'Набор сохранён.' : 'Набор добавлен.');
    if (!error) closeForm();
    return !error;
  }, [closeForm, draft, editingIndex, items, saveAll]);

  const confirmDelete = useCallback(async () => {
    if (deleteIndex === null) return false;
    const next = items.filter((_, i) => i !== deleteIndex);
    const error = await saveAll(next, 'Набор удалён.');
    if (!error) {
      if (editingIndex === deleteIndex) closeForm();
      setDeleteIndex(null);
      return true;
    }
    setMessage({ type: 'error', text: error });
    return false;
  }, [closeForm, deleteIndex, editingIndex, items, saveAll]);

  const kindCounts = useMemo(() => {
    let company = 0;
    let entrepreneur = 0;
    for (const item of items) {
      if (item.kind === 'ENTREPRENEUR') entrepreneur += 1;
      else company += 1;
    }
    return {
      ALL: items.length,
      COMPANY: company,
      ENTREPRENEUR: entrepreneur,
    };
  }, [items]);

  const displayedRows = useMemo((): ExecutorProfileRowView[] => {
    const rows: ExecutorProfileRowView[] = items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        if (kindFilter === 'ALL') return true;
        if (kindFilter === 'ENTREPRENEUR') return item.kind === 'ENTREPRENEUR';
        return item.kind !== 'ENTREPRENEUR';
      });
    const cmpTitle = (a: ExecutorProfileRowView, b: ExecutorProfileRowView) =>
      (a.item.title || '').localeCompare(b.item.title || '', 'ru', { sensitivity: 'base' });
    return [...rows].sort((a, b) => (sortKey === 'title_asc' ? cmpTitle(a, b) : -cmpTitle(a, b)));
  }, [items, kindFilter, sortKey]);

  return {
    closeForm,
    confirmDelete,
    deleteIndex,
    displayedRows,
    draft,
    editingIndex,
    formError,
    formOpen,
    handleUpsert,
    items,
    kindCounts,
    kindFilter,
    loading,
    message,
    openCreate,
    openEdit,
    refresh: load,
    saving,
    setDeleteIndex,
    setDraft,
    setKindFilter,
    setMessage,
    setSortKey,
    sortKey,
  };
}

export type ExecutorProfilesPageModel = ReturnType<typeof useExecutorProfilesPage>;
