'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type CrmCustomerTrashRow,
  getCrmCustomerTrash,
  restoreCrmCustomer,
} from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';

import {
  formatCrmAuditActor,
  formatCrmDateTimeLocale,
  formatCrmEntityType,
} from '../shared/crmCustomerDisplay';
import { formatCrmPhoneOrDash } from '../shared/crmCustomerPhone';
import panelStyles from './AddCrmCustomerModal.module.css';
import styles from './CrmCustomerTrashModal.module.css';

const PAGE_SIZE = 15;

interface CrmCustomerTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored?: () => void;
}

export function CrmCustomerTrashModal({ isOpen, onClose, onRestored }: CrmCustomerTrashModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CrmCustomerTrashRow[]>([]);
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
      const res = await getCrmCustomerTrash({
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
      await restoreCrmCustomer(id);
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
      title="Корзина клиентов"
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
            <label htmlFor="crm-trash-search">Поиск в корзине</label>
            <input
              id="crm-trash-search"
              type="search"
              placeholder="ФИО, телефон, e-mail, компания…"
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
                    <span className={styles.entryName}>{row.displayName}</span>
                    {row.email ? <span className={styles.entrySub}>{row.email}</span> : null}
                    <span className={styles.entryTags}>
                      <span className={styles.entryTag}>{formatCrmEntityType(row.entityType)}</span>
                      <span className={styles.entryTag}>{formatCrmPhoneOrDash(row.phone)}</span>
                    </span>
                    <span className={styles.entryDeleted}>
                      Удалён {formatCrmDateTimeLocale(row.deletedAt)} ·{' '}
                      {formatCrmAuditActor(row.deletedBy)}
                    </span>
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
            Карточки в корзине скрыты из общего справочника заказчиков. Восстановление вернёт
            клиента в список.
          </span>
        </div>
      </form>
    </Modal>
  );
}
