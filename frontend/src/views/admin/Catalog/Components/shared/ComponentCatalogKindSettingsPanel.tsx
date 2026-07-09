'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AdminComponentCatalogKind,
  createAdminComponentCatalogKind,
  deleteAdminComponentCatalogKind,
  fetchAdminComponentCatalogKinds,
  slugifyComponentCatalog,
  updateAdminComponentCatalogKind,
} from '@/shared/api/admin-component-catalog';
import { Modal } from '@/shared/ui/Modal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

import modalStyles from '../ComponentCatalogModal.module.css';
import styles from '../ComponentCatalogPage.module.css';
import { COMPONENT_CATALOG_KINDS_KEY } from '../hooks/useComponentCatalogPage';

type KindDraft = {
  name: string;
  kitQuantity: string;
  quantityStep: string;
};

type ComponentCatalogKindSettingsPanelProps = {
  onToast: (text: string, type: 'ok' | 'err') => void;
};

function draftFromRow(row: AdminComponentCatalogKind): KindDraft {
  return {
    name: row.name,
    kitQuantity: row.kitQuantity != null ? String(row.kitQuantity) : '',
    quantityStep: String(row.quantityStep),
  };
}

function draftsEqual(a: KindDraft, b: KindDraft): boolean {
  return a.name === b.name && a.kitQuantity === b.kitQuantity && a.quantityStep === b.quantityStep;
}

function parseKindParams(
  draft: KindDraft
): { kitQuantity: number | null; quantityStep: number } | null {
  const quantityStep = parseFloat(draft.quantityStep.replace(',', '.'));
  if (!Number.isFinite(quantityStep) || quantityStep <= 0) return null;
  const kitRaw = draft.kitQuantity.trim();
  let kitQuantity: number | null = null;
  if (kitRaw) {
    kitQuantity = parseFloat(kitRaw.replace(',', '.'));
    if (!Number.isFinite(kitQuantity) || kitQuantity < 0) return null;
  }
  return { kitQuantity, quantityStep };
}

export function ComponentCatalogKindSettingsPanel({
  onToast,
}: ComponentCatalogKindSettingsPanelProps) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, KindDraft>>({});
  const [savedDrafts, setSavedDrafts] = useState<Record<string, KindDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKitQty, setNewKitQty] = useState('');
  const [newQtyStep, setNewQtyStep] = useState('1');
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: [COMPONENT_CATALOG_KINDS_KEY],
    queryFn: fetchAdminComponentCatalogKinds,
  });

  const rows = data?.data ?? [];

  useEffect(() => {
    if (!rows.length) return;
    const next: Record<string, KindDraft> = {};
    for (const row of rows) {
      next[row.id] = draftFromRow(row);
    }
    setDrafts(next);
    setSavedDrafts(next);
  }, [rows]);

  const dirtyIds = useMemo(
    () =>
      rows
        .filter((row) => {
          const draft = drafts[row.id];
          const saved = savedDrafts[row.id];
          return draft && saved && !draftsEqual(draft, saved);
        })
        .map((row) => row.id),
    [drafts, rows, savedDrafts]
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_KINDS_KEY] });
    void queryClient.invalidateQueries({ queryKey: ['admin-component-catalog-list'] });
  }, [queryClient]);

  const updateDraft = useCallback((id: string, patch: Partial<KindDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }, []);

  const handleSave = useCallback(
    async (row: AdminComponentCatalogKind) => {
      const draft = drafts[row.id];
      if (!draft) return;
      const name = draft.name.trim();
      if (!name) {
        onToast('Укажите название вида', 'err');
        return;
      }
      const parsed = parseKindParams(draft);
      if (!parsed) {
        onToast('Некорректные параметры комплекта или шага', 'err');
        return;
      }
      setSavingId(row.id);
      try {
        await updateAdminComponentCatalogKind(row.id, {
          name,
          kitQuantity: parsed.kitQuantity,
          quantityStep: parsed.quantityStep,
        });
        setSavedDrafts((prev) => ({ ...prev, [row.id]: { ...draft, name } }));
        invalidate();
        onToast(`Вид «${name}» сохранён`, 'ok');
      } catch (e) {
        onToast(e instanceof Error ? e.message : 'Ошибка сохранения', 'err');
      } finally {
        setSavingId(null);
      }
    },
    [drafts, invalidate, onToast]
  );

  const handleDelete = useCallback(
    async (row: AdminComponentCatalogKind) => {
      const count = row._count?.items ?? 0;
      if (!confirm(`Удалить вид «${row.name}»?${count ? ` Привязано позиций: ${count}.` : ''}`))
        return;
      try {
        await deleteAdminComponentCatalogKind(row.id);
        invalidate();
        onToast('Вид удалён', 'ok');
      } catch (e) {
        onToast(e instanceof Error ? e.message : 'Ошибка удаления', 'err');
      }
    },
    [invalidate, onToast]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      onToast('Укажите название вида', 'err');
      return;
    }
    const parsed = parseKindParams({
      name,
      kitQuantity: newKitQty,
      quantityStep: newQtyStep,
    });
    if (!parsed) {
      onToast('Некорректный шаг количества', 'err');
      return;
    }
    setCreating(true);
    try {
      await createAdminComponentCatalogKind({
        name,
        slug: slugifyComponentCatalog(name),
        kitQuantity: parsed.kitQuantity,
        quantityStep: parsed.quantityStep,
      });
      invalidate();
      setCreateOpen(false);
      setNewName('');
      setNewKitQty('');
      setNewQtyStep('1');
      onToast(`Вид «${name}» создан`, 'ok');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Ошибка создания', 'err');
    } finally {
      setCreating(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        title: 'Вид комплектующего',
        render: (row: AdminComponentCatalogKind) => (
          <input
            className={styles.kindSettingInputWide}
            value={drafts[row.id]?.name ?? row.name}
            onChange={(e) => updateDraft(row.id, { name: e.target.value })}
          />
        ),
      },
      {
        key: 'code',
        title: 'Код',
        width: '160px',
        render: (row: AdminComponentCatalogKind) => (
          <span className={styles.kindCodeCell}>{row.code}</span>
        ),
      },
      {
        key: 'items',
        title: 'Позиций',
        width: '80px',
        render: (row: AdminComponentCatalogKind) => row._count?.items ?? 0,
      },
      {
        key: 'kitQuantity',
        title: 'В комплекте, шт.',
        width: '140px',
        render: (row: AdminComponentCatalogKind) => (
          <input
            className={styles.kindSettingInput}
            value={drafts[row.id]?.kitQuantity ?? ''}
            onChange={(e) => updateDraft(row.id, { kitQuantity: e.target.value })}
            placeholder="—"
            inputMode="decimal"
          />
        ),
      },
      {
        key: 'quantityStep',
        title: 'Шаг',
        width: '90px',
        render: (row: AdminComponentCatalogKind) => (
          <input
            className={styles.kindSettingInput}
            value={drafts[row.id]?.quantityStep ?? '1'}
            onChange={(e) => updateDraft(row.id, { quantityStep: e.target.value })}
            inputMode="decimal"
          />
        ),
      },
      {
        key: 'actions',
        title: '',
        width: '140px',
        render: (row: AdminComponentCatalogKind) => {
          const dirty = dirtyIds.includes(row.id);
          const canDelete = (row._count?.items ?? 0) === 0;
          return (
            <div className={styles.tableRowActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={!dirty || savingId === row.id}
                onClick={() => void handleSave(row)}
              >
                {savingId === row.id ? '…' : 'Сохранить'}
              </button>
              {canDelete ? (
                <AdminTableIconButton title="Удалить вид" onClick={() => void handleDelete(row)}>
                  <DeleteIcon />
                </AdminTableIconButton>
              ) : null}
            </div>
          );
        },
      },
    ],
    [dirtyIds, drafts, handleDelete, handleSave, savingId, updateDraft]
  );

  return (
    <>
      <p className={styles.hint}>
        Виды комплектующих задаются здесь: название, количество в комплекте и шаг покупки
        применяются ко всем позициям этого вида. Для расчёта цены «Комплект» используются виды с
        кодами STOIKA_KOROBKI и NALICHNIK.
      </p>
      <div className={styles.filters}>
        <div className={styles.hierarchyToolbar}>
          <button type="button" className={styles.addButton} onClick={() => setCreateOpen(true)}>
            + Новый вид
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className={styles.loadingOverlay}>Загрузка…</div>
      ) : (
        <DataTable
          paginationClassName={styles.pagination}
          paginationActiveClassName={styles.paginationPageActive}
          data={rows}
          columns={columns}
          keyExtractor={(row) => row.id}
        />
      )}

      <Modal
        isOpen={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="Новый вид комплектующего"
        size="md"
        className={crmFormStyles.modalPanel}
        showCloseButton
      >
        <form
          className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
          data-modal-form
          data-modal-density="compact"
          onSubmit={(e) => void handleCreate(e)}
        >
          <div data-modal-form-group>
            <label htmlFor="new-kind-name">Название *</label>
            <input
              id="new-kind-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Порог, Капитель…"
              autoFocus
            />
          </div>
          <div data-modal-form-grid className={styles.groupFormGrid}>
            <div data-modal-form-group>
              <label htmlFor="new-kind-kit">В комплекте, шт.</label>
              <input
                id="new-kind-kit"
                value={newKitQty}
                onChange={(e) => setNewKitQty(e.target.value)}
                placeholder="пусто — не входит"
                inputMode="decimal"
              />
            </div>
            <div data-modal-form-group>
              <label htmlFor="new-kind-step">Шаг количества *</label>
              <input
                id="new-kind-step"
                value={newQtyStep}
                onChange={(e) => setNewQtyStep(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>
          <div data-modal-form-actions>
            <button
              type="button"
              data-modal-btn="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Отмена
            </button>
            <button type="submit" data-modal-btn="primary" disabled={creating}>
              {creating ? 'Создание…' : 'Создать'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
