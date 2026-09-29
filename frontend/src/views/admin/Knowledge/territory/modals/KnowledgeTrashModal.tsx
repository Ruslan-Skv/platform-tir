'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type KnowledgeTrashRow,
  deleteKnowledgeTrashItem,
  getKnowledgeTrash,
  restoreKnowledgeTrashItem,
} from '@/shared/api/admin-knowledge';
import confirmModalStyles from '@/shared/ui/ConfirmModal/ConfirmModal.module.css';
import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import styles from '@/views/admin/CRM/Customers/modals/CrmCustomerTrashModal.module.css';
import { formatCrmDateTimeLocale } from '@/views/admin/CRM/Customers/shared/crmCustomerDisplay';

const PAGE_SIZE = 15;

const TYPE_LABELS: Record<KnowledgeTrashRow['type'], string> = {
  material: 'Материал',
  category: 'Категория',
  module: 'Модуль',
};

function formatUserLabel(user: KnowledgeTrashRow['deletedBy']): string {
  if (!user) return '—';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email?.trim() || '—';
}

interface KnowledgeTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored?: () => void;
  /** Обновление счётчика корзины после безвозвратного удаления. */
  onDeleted?: () => void;
  /** Безвозвратное удаление доступно только супер-администратору. */
  canDeletePermanently?: boolean;
}

export function KnowledgeTrashModal({
  isOpen,
  onClose,
  onRestored,
  onDeleted,
  canDeletePermanently = false,
}: KnowledgeTrashModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<KnowledgeTrashRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringKey, setRestoringKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeTrashRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchInput('');
      setSearchQuery('');
      setPage(1);
      setError(null);
      setDeleteTarget(null);
      return;
    }
    const t = window.setTimeout(() => setSearchQuery(searchInput.trim()), 380);
    return () => window.clearTimeout(t);
  }, [searchInput, isOpen]);

  useEffect(() => {
    if (isOpen) setPage(1);
  }, [searchQuery, isOpen]);

  const loadTrash = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getKnowledgeTrash({
        search: searchQuery || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки корзины');
    } finally {
      setLoading(false);
    }
  }, [isOpen, page, searchQuery]);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  const handleRestore = async (row: KnowledgeTrashRow) => {
    const key = `${row.type}:${row.id}`;
    setRestoringKey(key);
    setError(null);
    try {
      await restoreKnowledgeTrashItem(row.type, row.id);
      onRestored?.();
      await loadTrash();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка восстановления');
    } finally {
      setRestoringKey(null);
    }
  };

  const handlePermanentDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteKnowledgeTrashItem(deleteTarget.type, deleteTarget.id);
      setDeleteTarget(null);
      onDeleted?.();
      if (rows.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await loadTrash();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка безвозвратного удаления');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, loadTrash, onDeleted, page, rows.length]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Корзина базы знаний"
        size="lg"
        className={`${panelStyles.modalPanel} ${styles.trashPanel}`}
        contentClassName={styles.contentBody}
        showCloseButton
      >
        <form
          className={`${panelStyles.formShell} ${styles.shell}`}
          data-modal-form
          data-modal-density="compact"
          onSubmit={(e) => {
            e.preventDefault();
            setSearchQuery(searchInput.trim());
          }}
        >
          <div className={styles.searchRow} data-modal-form-grid>
            <div data-modal-form-group data-modal-span>
              <label htmlFor="knowledge-trash-search">Поиск в корзине</label>
              <input
                id="knowledge-trash-search"
                type="search"
                placeholder="Название, категория, тип…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div data-modal-form-group className={styles.searchBtnWrap}>
              <span className={styles.searchBtnLabel} aria-hidden>
                &nbsp;
              </span>
              <button type="submit" data-modal-btn="primary" className={styles.searchBtn}>
                Найти
              </button>
            </div>
          </div>

          {error ? <p data-modal-form-error>{error}</p> : null}
          {loading ? <p data-modal-form-hint>Загрузка…</p> : null}
          {!loading && rows.length === 0 ? <p data-modal-form-hint>Корзина пуста</p> : null}

          {!loading && rows.length > 0 ? (
            <div className={styles.list} data-modal-readonly-panel data-modal-density="compact">
              {rows.map((row) => {
                const restoreKey = `${row.type}:${row.id}`;
                const rowBusy = restoringKey === restoreKey || (deleting && !!deleteTarget);
                return (
                  <article key={restoreKey} className={styles.entry}>
                    <div className={styles.entryMain}>
                      <div className={styles.entryMeta}>
                        <span className={styles.entryName}>{row.title || 'Без названия'}</span>
                        <span className={styles.entrySub}>
                          {TYPE_LABELS[row.type]}
                          {row.subtitle ? ` · ${row.subtitle}` : ''}
                        </span>
                        <span className={styles.entryDeleted}>
                          Удалён {formatCrmDateTimeLocale(row.deletedAt)} ·{' '}
                          {formatUserLabel(row.deletedBy)}
                        </span>
                        <span className={styles.entryDeleted}>
                          Безвозвратное удаление: {formatCrmDateTimeLocale(row.permanentDeleteAt)}
                        </span>
                      </div>
                      <div className={styles.entryActions}>
                        <button
                          data-admin-mutation
                          type="button"
                          className={styles.restoreBtn}
                          disabled={rowBusy}
                          onClick={() => void handleRestore(row)}
                        >
                          {restoringKey === restoreKey ? '…' : 'Восстановить'}
                        </button>
                        {canDeletePermanently ? (
                          <button
                            data-admin-mutation
                            type="button"
                            className={styles.deleteBtn}
                            disabled={rowBusy}
                            onClick={() => setDeleteTarget(row)}
                          >
                            Удалить навсегда
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {!loading && totalPages > 1 ? (
            <div className={styles.pagination}>
              <button
                type="button"
                data-modal-btn="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </button>
              <span className={styles.pageInfo}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                data-modal-btn="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </button>
            </div>
          ) : null}
        </form>
      </Modal>

      {deleteTarget ? (
        <Modal
          isOpen
          onClose={() => {
            if (!deleting) setDeleteTarget(null);
          }}
          title="Удалить безвозвратно?"
          size="sm"
          showCloseButton
        >
          <div className={confirmModalStyles.content}>
            <p className={confirmModalStyles.message}>
              {TYPE_LABELS[deleteTarget.type]} «
              <strong>{deleteTarget.title || 'Без названия'}</strong>» будет удалён
              {deleteTarget.type === 'category' ? 'а' : ''} из корзины навсегда. Восстановить его
              будет невозможно.
            </p>
            {deleteTarget.type === 'category' ? (
              <p className={confirmModalStyles.message}>
                Вместе с категорией из корзины будут безвозвратно удалены все её модули и материалы,
                находящиеся в корзине.
              </p>
            ) : null}
            <div className={confirmModalStyles.actions}>
              <button
                type="button"
                className={confirmModalStyles.cancelButton}
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Отмена
              </button>
              <button
                data-admin-mutation
                type="button"
                className={`${confirmModalStyles.confirmButton} ${confirmModalStyles.danger}`}
                disabled={deleting}
                onClick={() => void handlePermanentDelete()}
              >
                {deleting ? 'Удаление…' : 'Удалить навсегда'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
