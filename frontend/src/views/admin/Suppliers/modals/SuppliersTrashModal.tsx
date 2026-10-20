'use client';

import { useCallback, useEffect, useState } from 'react';

import { type AdminSupplierTrashItem, getSuppliersTrash } from '@/shared/api/admin-suppliers';
import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import styles from '@/views/admin/CRM/Customers/modals/CrmCustomerTrashModal.module.css';

import { formatSupplierMoney } from '../suppliers-page.utils';

const PAGE_SIZE = 15;

function formatDateTimeLocale(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

export interface SuppliersTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Корзина поставщиков: удалённые карточки с информацией об удалении. Без восстановления. */
export function SuppliersTrashModal({ isOpen, onClose }: SuppliersTrashModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminSupplierTrashItem[]>([]);
  const [total, setTotal] = useState(0);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchInput('');
      setSearchQuery('');
      setPage(1);
      setError(null);
      return;
    }
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 380);
    return () => window.clearTimeout(timer);
  }, [searchInput, isOpen]);

  useEffect(() => {
    if (isOpen) setPage(1);
  }, [searchQuery, isOpen]);

  const loadTrash = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getSuppliersTrash({
        search: searchQuery || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
      setRetentionDays(res.trashRetentionDays ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки корзины');
    } finally {
      setLoading(false);
    }
  }, [isOpen, page, searchQuery]);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Корзина поставщиков"
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
            <label htmlFor="suppliers-trash-search">Поиск в корзине</label>
            <input
              id="suppliers-trash-search"
              type="search"
              placeholder="Наименование или ИНН…"
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
                    <span className={styles.entryName}>{row.name}</span>
                    <span className={styles.entrySub}>
                      {`${row.legalName}${row.inn ? ` · ИНН: ${row.inn}` : ''}`}
                    </span>
                    <span className={styles.entrySub}>
                      {`Сальдо на удаление: ${formatSupplierMoney(row.balance)} · записей ведомости: ${row.entriesCount} · блоков реквизитов: ${row.requisiteCount}`}
                    </span>
                    <span className={styles.entrySub}>
                      {`Начислено: ${formatSupplierMoney(row.amountSum)} · Оплачено: ${formatSupplierMoney(row.paymentSum)}`}
                    </span>
                    <span className={styles.entryDeleted}>
                      {`Удалено: ${formatDateTimeLocale(row.deletedAt)} · ${row.deletedBy || '—'}`}
                    </span>
                    <span className={styles.entryDeleted}>
                      {`Безвозвратное удаление: ${formatDateTimeLocale(row.permanentDeleteAt)}`}
                    </span>
                  </div>
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
            {retentionDays != null
              ? `Поставщики хранятся в корзине ${retentionDays} дней, затем удаляются безвозвратно вместе с ведомостью и реквизитами. `
              : 'Поставщики удаляются из корзины безвозвратно через 30 дней. '}
            Удалённый поставщик скрыт из сводного списка и недоступен по прямой ссылке. Удаляет в
            корзину только супер-админ; восстановление из корзины невозможно.
          </span>
        </div>
      </form>
    </Modal>
  );
}
