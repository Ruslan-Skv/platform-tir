'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ContractDocumentPackageUserRef } from '@/shared/api/admin-contract-document-packages';
import {
  type ContractEstimatePresetTrashRow,
  getContractDocumentEstimatePresetsTrash,
  restoreContractEstimatePreset,
} from '@/shared/api/contract-documents/admin-contract-document-estimate-presets-trash';
import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import styles from '@/views/admin/CRM/Customers/modals/CrmCustomerTrashModal.module.css';
import { formatCrmDateTimeLocale } from '@/views/admin/CRM/Customers/shared/crmCustomerDisplay';

import {
  ESTIMATE_TRASH_RETENTION_NOTICE,
  estimateTrashPermanentDeleteAtIso,
} from './estimateTrashRetention';

const PAGE_SIZE = 15;

function formatPackageUserLabel(user: ContractDocumentPackageUserRef | null | undefined): string {
  if (!user) return '—';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email?.trim() || '—';
}

interface EstimateTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored?: () => void;
}

export function EstimateTrashModal({ isOpen, onClose, onRestored }: EstimateTrashModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ContractEstimatePresetTrashRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchInput('');
      setSearchQuery('');
      setPage(1);
      setError(null);
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
      const res = await getContractDocumentEstimatePresetsTrash({
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

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    setError(null);
    try {
      await restoreContractEstimatePreset(id);
      onRestored?.();
      await loadTrash();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка восстановления');
    } finally {
      setRestoringId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Корзина расчётов"
      size="lg"
      className={`${panelStyles.modalPanel} ${styles.trashPanel}`}
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
            <label htmlFor="estimate-trash-search">Поиск в корзине</label>
            <input
              id="estimate-trash-search"
              type="search"
              placeholder="Название, категория, объект…"
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
            {rows.map((row) => (
              <article key={row.id} className={styles.entry}>
                <div className={styles.entryMain}>
                  <div className={styles.entryMeta}>
                    <span className={styles.entryName}>{row.title || 'Без названия'}</span>
                    <span className={styles.entrySub}>{row.categoryName}</span>
                    {row.groupTitle ? (
                      <span className={styles.entrySub}>{row.groupTitle}</span>
                    ) : null}
                    <span className={styles.entryDeleted}>
                      Удалён {formatCrmDateTimeLocale(row.deletedAt)} ·{' '}
                      {formatPackageUserLabel(row.deletedBy)}
                    </span>
                    {row.permanentDeleteAt || estimateTrashPermanentDeleteAtIso(row.deletedAt) ? (
                      <span className={styles.entryDeleted}>
                        Безвозвратное удаление:{' '}
                        {formatCrmDateTimeLocale(
                          row.permanentDeleteAt ?? estimateTrashPermanentDeleteAtIso(row.deletedAt)!
                        )}
                      </span>
                    ) : null}
                  </div>
                  <button
                    data-admin-mutation
                    type="button"
                    className={styles.restoreBtn}
                    disabled={restoringId === row.id}
                    onClick={() => void handleRestore(row.id)}
                  >
                    {restoringId === row.id ? '…' : 'Восстановить'}
                  </button>
                </div>
              </article>
            ))}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Вперёд
            </button>
          </div>
        ) : null}

        <div data-modal-footer-info data-modal-tone="info" role="status">
          <span data-modal-footer-info-icon aria-hidden="true" />
          <span data-modal-footer-info-text>
            Расчёты в корзине скрыты из общего списка. Восстановление вернёт расчёт на страницу
            «Расчёты». {ESTIMATE_TRASH_RETENTION_NOTICE}
          </span>
        </div>
      </form>
    </Modal>
  );
}
