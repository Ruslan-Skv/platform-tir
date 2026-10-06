'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type ContractDocumentPaymentInvoiceTrashItem,
  getPaymentInvoiceTrash,
} from '@/shared/api/admin-payment-invoices';
import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import styles from '@/views/admin/CRM/Customers/modals/CrmCustomerTrashModal.module.css';

import { formatDateRu, formatMoneyRub } from './accounting-invoices-page.utils';

const PAGE_SIZE = 15;

function formatDateTimeLocale(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

function formatUserLabel(
  user: { firstName: string | null; lastName: string | null } | null
): string {
  return [user?.lastName, user?.firstName].filter(Boolean).join(' ') || '—';
}

export interface InvoicesTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Корзина выставленных счетов: удалённые супер-админом записи. Без восстановления. */
export function InvoicesTrashModal({ isOpen, onClose }: InvoicesTrashModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ContractDocumentPaymentInvoiceTrashItem[]>([]);
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
      const res = await getPaymentInvoiceTrash({
        search: searchQuery || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setRows(res.items ?? []);
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
      title="Корзина счетов на оплату"
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
            <label htmlFor="invoices-trash-search">Поиск в корзине</label>
            <input
              id="invoices-trash-search"
              type="search"
              placeholder="№ счёта, договор, заказчик, основание…"
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
                    <span className={styles.entryName}>
                      {`Счёт № ${row.invoiceNumber} от ${formatDateRu(row.invoiceDate)}`}
                      {` · ${formatMoneyRub(row.amount)}`}
                    </span>
                    <span className={styles.entrySub}>
                      {`Договор: ${row.contractNumber || '—'} · Заказчик: ${row.customerName || '—'}`}
                    </span>
                    <span className={styles.entrySub}>{`Основание: ${row.basis || '—'}`}</span>
                    <div className={styles.entryTags}>
                      <span className={styles.entryTag}>
                        Выставил: {formatUserLabel(row.issuedBy)}
                      </span>
                      {row.signedAt ? <span className={styles.entryTag}>подписан ЭП</span> : null}
                    </div>
                    <span className={styles.entryDeleted}>
                      {`Выставлен: ${formatDateTimeLocale(row.createdAt)}`}
                    </span>
                    <span className={styles.entryDeleted}>
                      {`Удалено: ${formatDateTimeLocale(row.deletedAt)} · ${formatUserLabel(row.deletedBy)}`}
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
              ? `Счета хранятся в корзине ${retentionDays} дней, затем удаляются безвозвратно. `
              : 'Счета удаляются из корзины безвозвратно через 30 дней. '}
            Удалённые счета скрыты из бухгалтерии и модалки «Счета на оплату по договору».
            Восстановление из корзины невозможно. Удалять счета может только супер-админ.
          </span>
        </div>
      </form>
    </Modal>
  );
}
