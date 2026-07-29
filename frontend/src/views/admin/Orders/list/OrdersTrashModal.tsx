'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type AdminOrderTrashRow,
  getAdminOrdersTrash,
  restoreAdminOrder,
  restoreServiceOrder,
} from '@/shared/api/admin-orders';
import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import trashStyles from '@/views/admin/CRM/Customers/modals/CrmCustomerTrashModal.module.css';

import { formatOrderCurrency, formatOrderDate } from './orders-page.utils';

const PAGE_SIZE = 15;

type OrdersTrashModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onRestored?: () => void;
};

export function OrdersTrashModal({ isOpen, onClose, onRestored }: OrdersTrashModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminOrderTrashRow[]>([]);
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
      const res = await getAdminOrdersTrash({
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

  const handleRestore = async (row: AdminOrderTrashRow) => {
    setRestoringId(row.id);
    setError(null);
    try {
      if (row.orderType === 'service') {
        await restoreServiceOrder(row.id);
      } else {
        await restoreAdminOrder(row.id);
      }
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
      title="Корзина заказов"
      size="lg"
      className={`${panelStyles.modalPanel} ${trashStyles.trashPanel}`}
      showCloseButton
      compactOnMobile
    >
      <form
        className={`${panelStyles.formShell} ${trashStyles.shell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => {
          e.preventDefault();
          setSearchQuery(searchInput.trim());
        }}
      >
        <div className={trashStyles.searchRow} data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="orders-trash-search">Поиск в корзине</label>
            <input
              id="orders-trash-search"
              type="search"
              placeholder="Номер заказа, клиент, e-mail…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div data-modal-form-group className={trashStyles.searchBtnWrap}>
            <span className={trashStyles.searchBtnLabel} aria-hidden>
              &nbsp;
            </span>
            <button type="submit" data-modal-btn="primary" className={trashStyles.searchBtn}>
              Найти
            </button>
          </div>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}
        {loading ? <p data-modal-form-hint>Загрузка…</p> : null}
        {!loading && rows.length === 0 ? <p data-modal-form-hint>Корзина пуста</p> : null}

        {!loading && rows.length > 0 ? (
          <div className={trashStyles.list} data-modal-readonly-panel data-modal-density="compact">
            {rows.map((row) => (
              <article key={`${row.orderType}-${row.id}`} className={trashStyles.entry}>
                <div className={trashStyles.entryMain}>
                  <div className={trashStyles.entryMeta}>
                    <span className={trashStyles.entryName}>{row.orderNumber}</span>
                    <span className={trashStyles.entrySub}>{row.customerLabel}</span>
                    <span className={trashStyles.entryTags}>
                      <span className={trashStyles.entryTag}>
                        {row.orderType === 'service' ? 'Услуги' : 'Товары'}
                      </span>
                      <span className={trashStyles.entryTag}>
                        {formatOrderCurrency(Number(row.total))}
                      </span>
                    </span>
                    <span className={trashStyles.entryDeleted}>
                      Удалён {formatOrderDate(row.deletedAt)}
                    </span>
                  </div>
                  <button
                    data-admin-mutation
                    type="button"
                    className={trashStyles.restoreBtn}
                    disabled={restoringId === row.id}
                    onClick={() => void handleRestore(row)}
                  >
                    {restoringId === row.id ? '…' : 'Восстановить'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && totalPages > 1 ? (
          <div className={trashStyles.pagination}>
            <button
              type="button"
              data-modal-btn="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </button>
            <span className={trashStyles.pageInfo}>
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
            Заказы в корзине скрыты из списка. Восстановление вернёт заказ в общий список.
          </span>
        </div>
      </form>
    </Modal>
  );
}
