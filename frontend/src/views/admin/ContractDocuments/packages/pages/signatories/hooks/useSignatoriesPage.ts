'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ContractSignatoryProfile,
  getContractDocumentSignatoryProfiles,
  putContractDocumentSignatoryProfiles,
} from '@/shared/api/admin-contract-document-packages';
import { type CrmUser, getCrmUsers } from '@/shared/api/admin-crm';

import {
  EMPTY_SIGNATORY_PROFILE,
  type SignatoryRowView,
  type SignatorySortKey,
} from '../signatoriesConstants';
import { formatCrmUserLabel, normalizeSignatoryProfile } from '../signatoriesUtils';

export type SignatoriesPageMessage = { type: 'success' | 'error'; text: string };

export function useSignatoriesPage() {
  const [items, setItems] = useState<ContractSignatoryProfile[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SignatoriesPageMessage | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContractSignatoryProfile>(EMPTY_SIGNATORY_PROFILE);
  const [formOpen, setFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [signatorySort, setSignatorySort] = useState<SignatorySortKey>('title_asc');

  const crmUserLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of crmUsers) {
      map.set(u.id, formatCrmUserLabel(u));
    }
    return map;
  }, [crmUsers]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [profilesRes, users] = await Promise.all([
        getContractDocumentSignatoryProfiles('REPAIR'),
        getCrmUsers().catch(() => [] as CrmUser[]),
      ]);
      setCrmUsers(users);
      setItems(profilesRes.items ?? []);
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Не удалось загрузить данные',
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
    setDraft(EMPTY_SIGNATORY_PROFILE);
    setFormError(null);
  }, []);

  const openCreate = useCallback(() => {
    setDraft(EMPTY_SIGNATORY_PROFILE);
    setEditingIndex(null);
    setFormError(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback(
    (idx: number) => {
      const item = items[idx];
      if (!item) return;
      setDraft({ ...item });
      setEditingIndex(idx);
      setFormError(null);
      setFormOpen(true);
    },
    [items]
  );

  const saveAll = useCallback(
    async (nextItems: ContractSignatoryProfile[], successText: string): Promise<string | null> => {
      setSaving(true);
      setFormError(null);
      const sanitized = nextItems.map(normalizeSignatoryProfile);
      try {
        await putContractDocumentSignatoryProfiles({ kind: 'REPAIR', items: sanitized });
        setItems(sanitized);
        setMessage({ type: 'success', text: successText });
        return null;
      } catch (e) {
        const text = e instanceof Error ? e.message : 'Не удалось сохранить';
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
      setFormError('Укажите название карточки.');
      return false;
    }
    const crmUserId = draft.crmUserId?.trim();
    if (!crmUserId) {
      setFormError(
        'Выберите пользователя CRM — без привязки карточка не попадёт в фильтр менеджера в замерах.'
      );
      return false;
    }
    const duplicateIdx = items.findIndex(
      (p, i) => i !== editingIndex && p.crmUserId?.trim() === crmUserId
    );
    if (duplicateIdx >= 0) {
      setFormError('Этот пользователь CRM уже привязан к другой карточке менеджера.');
      return false;
    }
    const next = [...items];
    const normalizedDraft = normalizeSignatoryProfile(draft);
    const isEdit = editingIndex !== null;
    if (editingIndex === null) next.push(normalizedDraft);
    else next[editingIndex] = normalizedDraft;
    const error = await saveAll(next, isEdit ? 'Карточка сохранена.' : 'Карточка добавлена.');
    if (!error) closeForm();
    return !error;
  }, [closeForm, draft, editingIndex, items, saveAll]);

  const confirmDelete = useCallback(async () => {
    if (deleteIndex === null) return false;
    const next = items.filter((_, i) => i !== deleteIndex);
    const error = await saveAll(next, 'Карточка удалена.');
    if (!error) {
      if (editingIndex === deleteIndex) closeForm();
      setDeleteIndex(null);
      return true;
    }
    setMessage({ type: 'error', text: error });
    return false;
  }, [closeForm, deleteIndex, editingIndex, items, saveAll]);

  const displayedRows = useMemo((): SignatoryRowView[] => {
    const rows: SignatoryRowView[] = items.map((item, originalIndex) => ({
      item,
      originalIndex,
    }));
    const cmpTitle = (a: SignatoryRowView, b: SignatoryRowView) =>
      (a.item.title || '').localeCompare(b.item.title || '', 'ru', { sensitivity: 'base' });
    return [...rows].sort((a, b) => {
      if (signatorySort === 'title_asc') return cmpTitle(a, b);
      return -cmpTitle(a, b);
    });
  }, [items, signatorySort]);

  return {
    closeForm,
    confirmDelete,
    crmUserLabelById,
    crmUsers,
    deleteIndex,
    displayedRows,
    draft,
    editingIndex,
    formError,
    formOpen,
    handleUpsert,
    items,
    loading,
    message,
    openCreate,
    openEdit,
    refresh: load,
    saving,
    setDeleteIndex,
    setDraft,
    setMessage,
    setSignatorySort,
    signatorySort,
  };
}

export type SignatoriesPageModel = ReturnType<typeof useSignatoriesPage>;
