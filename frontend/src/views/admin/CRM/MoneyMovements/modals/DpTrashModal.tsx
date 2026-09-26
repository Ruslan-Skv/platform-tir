'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type MoneyMovementTrashItem,
  getMoneyMovementTrash,
} from '@/shared/api/crm/admin-money-movements';
import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import styles from '@/views/admin/CRM/Customers/modals/CrmCustomerTrashModal.module.css';

import {
  DP_PAYMENT_FORM_LABELS,
  formatDpDate,
  formatDpMoney,
  formatDpTime,
} from '../money-movements-page.constants';

const PAGE_SIZE = 15;

function formatDateTimeLocale(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

function formatUserLabel(user: { id: string; name: string } | null): string {
  return user?.name || '—';
}

/** Строка «поле: было …» по правкам супер-админа до удаления записи. */
function editedFieldsLine(item: MoneyMovementTrashItem): string | null {
  const original = item.originalValues;
  if (!original) return null;
  const parts = Object.entries(original).map(([field, value]) => `${field}: было ${value ?? '—'}`);
  return parts.length > 0 ? parts.join(', ') : null;
}

export interface DpTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Корзина журнала ДП: удалённые ручные записи с полной информацией. Без восстановления. */
export function DpTrashModal({ isOpen, onClose }: DpTrashModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MoneyMovementTrashItem[]>([]);
  const [total, setTotal] = useState(0);
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
      const res = await getMoneyMovementTrash({
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Корзина журнала ДП"
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
            <label htmlFor="dp-trash-search">Поиск в корзине</label>
            <input
              id="dp-trash-search"
              type="search"
              placeholder="Основание, примечание, № договора, заказчик…"
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
              const edited = editedFieldsLine(row);
              return (
                <article key={row.id} className={styles.entry}>
                  <div className={styles.entryMain}>
                    <div className={styles.entryMeta}>
                      <span className={styles.entryName}>
                        {formatDpDate(row.paymentDate)}
                        {row.direction ? ` · ${row.direction}` : ''}
                        {` · ${formatDpMoney(row.amount)}`}
                      </span>
                      <span className={styles.entrySub}>
                        {`Тип: ${row.isManual ? 'ручная запись' : 'авто по оплате договора'} · Время оплаты: ${formatDpTime(row.performedAt)}`}
                      </span>
                      <span className={styles.entrySub}>
                        {`Менеджер: ${row.manager?.name || '—'}`}
                        {row.office ? ` · Офис: ${row.office}` : ''}
                      </span>
                      <span className={styles.entrySub}>
                        {`№ договора: ${row.contractNumber || '—'} · Заказчик: ${row.customerName || '—'}`}
                      </span>
                      <span className={styles.entrySub}>{`Основание: ${row.basis || '—'}`}</span>
                      {row.notes ? (
                        <span className={styles.entrySub}>Примечание: {row.notes}</span>
                      ) : null}
                      <div className={styles.entryTags}>
                        <span className={styles.entryTag}>
                          Способ оплаты:{' '}
                          {DP_PAYMENT_FORM_LABELS[row.paymentForm] || row.paymentForm}
                        </span>
                        {row.executorName ? (
                          <span className={styles.entryTag}>Исполнитель: {row.executorName}</span>
                        ) : null}
                        {row.addendumNumber != null ? (
                          <span className={styles.entryTag}>Д/с №{row.addendumNumber}</span>
                        ) : null}
                      </div>
                      <span className={styles.entryDeleted}>
                        {`Создал: ${formatUserLabel(row.createdBy)} · ${formatDateTimeLocale(row.createdAt)}`}
                      </span>
                      <span className={styles.entryDeleted}>
                        {`Удалено: ${formatDateTimeLocale(row.deletedAt)} · ${formatUserLabel(row.deletedBy)}`}
                      </span>
                      {edited ? (
                        <span className={styles.entryDeleted}>Правки супер-админа: {edited}</span>
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Вперёд
            </button>
          </div>
        ) : null}

        <div data-modal-footer-info data-modal-tone="info" role="status">
          <span data-modal-footer-info-icon aria-hidden="true" />
          <span data-modal-footer-info-text>
            Удалённые записи скрыты из журнала ДП, итогов и остатка кассы менеджера. Восстановление
            из корзины невозможно. Сотрудники удаляют только свои записи, сделанные в текущем
            месяце; супер-админ — любые ручные записи.
          </span>
        </div>
      </form>
    </Modal>
  );
}
