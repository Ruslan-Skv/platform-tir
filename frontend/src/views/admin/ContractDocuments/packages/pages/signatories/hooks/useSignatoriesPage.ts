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
  MANAGER_CRM_ROLES,
  type SignatoryRowView,
  type SignatorySortKey,
} from '../signatoriesConstants';
import { formatCrmUserLabel, normalizeSignatoryProfile } from '../signatoriesUtils';

export function useSignatoriesPage() {
  const [items, setItems] = useState<ContractSignatoryProfile[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContractSignatoryProfile>(EMPTY_SIGNATORY_PROFILE);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [signatorySort, setSignatorySort] = useState<SignatorySortKey>('title_asc');

  const managerCrmUsers = useMemo(
    () =>
      crmUsers.filter((u) =>
        MANAGER_CRM_ROLES.includes(u.role as (typeof MANAGER_CRM_ROLES)[number])
      ),
    [crmUsers]
  );

  const crmUserLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of crmUsers) {
      map.set(u.id, formatCrmUserLabel(u));
    }
    return map;
  }, [crmUsers]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [profilesRes, users] = await Promise.all([
          getContractDocumentSignatoryProfiles('REPAIR'),
          getCrmUsers().catch(() => [] as CrmUser[]),
        ]);
        setCrmUsers(users);
        setItems(profilesRes.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(EMPTY_SIGNATORY_PROFILE);
    setEditingIndex(null);
  }, []);

  const saveAll = useCallback(async (nextItems: ContractSignatoryProfile[]) => {
    setSaving(true);
    setError(null);
    setOk(null);
    const sanitized = nextItems.map(normalizeSignatoryProfile);
    try {
      await putContractDocumentSignatoryProfiles({ kind: 'REPAIR', items: sanitized });
      setItems(sanitized);
      setOk('Сохранено.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleUpsert = useCallback(async () => {
    if (!draft.title?.trim()) {
      setError('Укажите название карточки.');
      return;
    }
    const crmUserId = draft.crmUserId?.trim();
    if (!crmUserId) {
      setError(
        'Выберите пользователя CRM — без привязки карточка не попадёт в фильтр менеджера в замерах.'
      );
      return;
    }
    const duplicateIdx = items.findIndex(
      (p, i) => i !== editingIndex && p.crmUserId?.trim() === crmUserId
    );
    if (duplicateIdx >= 0) {
      setError('Этот пользователь CRM уже привязан к другой карточке менеджера.');
      return;
    }
    const next = [...items];
    const normalizedDraft = normalizeSignatoryProfile(draft);
    if (editingIndex === null) next.push(normalizedDraft);
    else next[editingIndex] = normalizedDraft;
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
      setDraft({ ...item });
      setEditingIndex(idx);
    },
    [items]
  );

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
    crmUserLabelById,
    displayedRows,
    draft,
    editingIndex,
    error,
    handleDelete,
    handleUpsert,
    items,
    loading,
    managerCrmUsers,
    ok,
    resetDraft,
    saving,
    setDraft,
    setSignatorySort,
    signatorySort,
    startEdit,
  };
}

export type SignatoriesPageModel = ReturnType<typeof useSignatoriesPage>;
