'use client';

import { useEffect, useMemo, useState } from 'react';

import { type WaybillSettlement, getWaybillSettlements } from '@/shared/api/admin-waybills';
import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import styles from '@/views/admin/CRM/Customers/modals/CrmCustomerTrashModal.module.css';

import {
  formatRub,
  formatUserLabel,
  formatWaybillDateDisplay,
  parseWaybillCost,
} from '../shared/waybills-page.utils';

const PAGE_SIZE = 15;

export type WaybillSettlementHistoryModalProps = {
  open: boolean;
  onClose: () => void;
};

function formatDateTimeLocale(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

function settlementHeadline(row: WaybillSettlement): string {
  const payout = parseWaybillCost(row.payoutAmount) ?? 0;
  const deposit = parseWaybillCost(row.depositAmount) ?? 0;
  const period = `${formatWaybillDateDisplay(row.dateFrom)} – ${formatWaybillDateDisplay(
    row.dateTo
  )}`;
  if (payout > 0) return `${period} · Выплата водителю: ${formatRub(payout)}`;
  if (deposit > 0) return `${period} · Внесение в кассу: ${formatRub(deposit)}`;
  return `${period} · Взаиморасчёт (0 ₽)`;
}

/** История расчётов з/п водителей — записи создаются кнопкой «+ Расчёт». */
export function WaybillSettlementHistoryModal({
  open,
  onClose,
}: WaybillSettlementHistoryModalProps) {
  const [settlements, setSettlements] = useState<WaybillSettlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getWaybillSettlements(200)
      .then((rows) => {
        if (!cancelled) setSettlements(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setSettlements([]);
          setError(err instanceof Error ? err.message : 'Не удалось загрузить историю расчётов');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Закрытие модалки — чистое состояние поиска.
  useEffect(() => {
    if (open) return;
    setSearchInput('');
    setPage(1);
  }, [open]);

  useEffect(() => {
    setPage(1);
  }, [searchInput]);

  const term = searchInput.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!term) return settlements;
    return settlements.filter((row) =>
      [
        row.driver ? formatUserLabel(row.driver) : '',
        row.createdBy ? formatUserLabel(row.createdBy) : '',
        row.note ?? '',
        String(parseWaybillCost(row.payoutAmount) ?? ''),
        String(parseWaybillCost(row.depositAmount) ?? ''),
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [settlements, term]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="История расчётов"
      size="lg"
      className={`${panelStyles.modalPanel} ${styles.trashPanel}`}
      contentClassName={styles.contentBody}
      showCloseButton
    >
      <form
        className={`${panelStyles.formShell} ${styles.shell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className={styles.searchRow} data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="waybill-settlements-search">Поиск в истории</label>
            <input
              id="waybill-settlements-search"
              type="search"
              placeholder="Водитель, сумма, примечание…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}
        {loading ? <p data-modal-form-hint>Загрузка…</p> : null}
        {!loading && settlements.length === 0 ? (
          <p data-modal-form-hint>Расчётов пока не было</p>
        ) : null}
        {!loading && settlements.length > 0 && filtered.length === 0 ? (
          <p data-modal-form-hint>Ничего не найдено</p>
        ) : null}

        {rows.length > 0 ? (
          <div className={styles.list} data-modal-readonly-panel data-modal-density="compact">
            {rows.map((row) => (
              <article key={row.id} className={styles.entry}>
                <div className={styles.entryMain}>
                  <div className={styles.entryMeta}>
                    <span className={styles.entryName}>{settlementHeadline(row)}</span>
                    <span className={styles.entrySub}>
                      {`Водитель: ${row.driver ? formatUserLabel(row.driver) : '—'} · закрыто заданий: ${row.tasksCount}`}
                    </span>
                    <span className={styles.entrySub}>
                      {`Доставка: ${formatRub(parseWaybillCost(row.deliveryTotal) ?? 0)} · Грузчики: ${formatRub(
                        parseWaybillCost(row.moversTotal) ?? 0
                      )} · собрано с заказчиков: ${formatRub(
                        parseWaybillCost(row.collectedFromCustomers) ?? 0
                      )}`}
                    </span>
                    <span className={styles.entrySub}>{`Примечание: ${row.note ?? '—'}`}</span>
                    <span className={styles.entryDeleted}>
                      {`Создал: ${row.createdBy ? formatUserLabel(row.createdBy) : '—'} · ${formatDateTimeLocale(
                        row.createdAt
                      )}`}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {filtered.length > PAGE_SIZE ? (
          <div className={styles.pagination}>
            <button
              type="button"
              data-modal-btn="secondary"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </button>
            <span className={styles.pageInfo}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              data-modal-btn="secondary"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Вперёд
            </button>
          </div>
        ) : null}

        <div data-modal-footer-info data-modal-tone="info" role="status">
          <span data-modal-footer-info-icon aria-hidden="true" />
          <span data-modal-footer-info-text>
            Расчёт создаётся в модалке «+ Расчёт»: выполненные задания периода закрываются и больше
            не редактируются и не попадают в новые расчёты.
          </span>
        </div>
      </form>
    </Modal>
  );
}
