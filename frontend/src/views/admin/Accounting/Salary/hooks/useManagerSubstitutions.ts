'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type ManagerSubstitution,
  type ManagerSubstitutionPayload,
  createManagerSubstitution,
  deleteManagerSubstitution,
  getManagerSubstitutions,
  updateManagerSubstitution,
} from '@/shared/api/accounting/admin-salary';

export type ManagerSubstitutionDraft = {
  absentManagerId: string;
  substituteManagerId: string;
  dateFrom: string;
  dateTo: string;
  comment: string;
};

const EMPTY_DRAFT: ManagerSubstitutionDraft = {
  absentManagerId: '',
  substituteManagerId: '',
  dateFrom: new Date().toISOString().slice(0, 10),
  dateTo: new Date().toISOString().slice(0, 10),
  comment: '',
};

/**
 * Подмены менеджеров на период отпуска/длительного больничного (вкладка
 * «Настройки» раздела «ЗП», только суперадмин). В период подмены з/п по
 * договорам отсутствующего менеджера и его личные продажи по платежам ДП
 * начисляются подменяющему.
 */
export function useManagerSubstitutions() {
  const [rows, setRows] = useState<ManagerSubstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice((current) => (current === text ? null : current)), 4000);
  }, []);

  const reload = useCallback(async () => {
    try {
      setRows(await getManagerSubstitutions());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить подмены');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ===== Создание/правка через модалку, удаление через ConfirmModal =====
  const [modalOpen, setModalOpen] = useState(false);
  /** null — создание новой подмены. */
  const [editingRow, setEditingRow] = useState<ManagerSubstitution | null>(null);
  const [draft, setDraft] = useState<ManagerSubstitutionDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagerSubstitution | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateModal = useCallback(() => {
    setEditingRow(null);
    setDraft(EMPTY_DRAFT);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((row: ManagerSubstitution) => {
    setEditingRow(row);
    setDraft({
      absentManagerId: row.absentManagerId,
      substituteManagerId: row.substituteManagerId,
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      comment: row.comment ?? '',
    });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (saving) return;
    setModalOpen(false);
  }, [saving]);

  const validateDraft = (d: ManagerSubstitutionDraft): string | null => {
    if (!d.absentManagerId) return 'Выберите отсутствующего менеджера';
    if (!d.substituteManagerId) return 'Выберите подменяющего менеджера';
    if (d.absentManagerId === d.substituteManagerId) {
      return 'Менеджер не может подменять сам себя';
    }
    if (!d.dateFrom || !d.dateTo) return 'Укажите период подмены';
    if (d.dateFrom > d.dateTo) return 'Начало периода не может быть позже конца';
    return null;
  };

  const save = useCallback(
    async () => {
      const invalid = validateDraft(draft);
      if (invalid) {
        setError(invalid);
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const payload: ManagerSubstitutionPayload = {
          absentManagerId: draft.absentManagerId,
          substituteManagerId: draft.substituteManagerId,
          dateFrom: draft.dateFrom,
          dateTo: draft.dateTo,
          comment: draft.comment.trim() || null,
        };
        if (editingRow) {
          await updateManagerSubstitution(editingRow.id, payload);
          showNotice('Подмена обновлена');
        } else {
          await createManagerSubstitution(payload);
          showNotice('Подмена создана');
        }
        setModalOpen(false);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось сохранить подмену');
      } finally {
        setSaving(false);
      }
    },
     
    [draft, editingRow, reload, showNotice]
  );

  const remove = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteManagerSubstitution(deleteTarget.id);
      showNotice('Подмена удалена');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить подмену');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, reload, showNotice]);

  return {
    rows,
    loading,
    error,
    notice,
    reload,
    modalOpen,
    editingRow,
    draft,
    setDraft,
    saving,
    openCreateModal,
    openEditModal,
    closeModal,
    save,
    deleteTarget,
    setDeleteTarget,
    deleting,
    remove,
  };
}

export type ManagerSubstitutionsModel = ReturnType<typeof useManagerSubstitutions>;
