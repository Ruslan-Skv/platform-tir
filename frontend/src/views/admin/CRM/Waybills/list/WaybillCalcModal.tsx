'use client';

import { useEffect, useMemo, useState } from 'react';

import type { CrmUser } from '@/shared/api/admin-crm';
import {
  type WaybillTask,
  createWaybillSettlement,
  getWaybillTasks,
} from '@/shared/api/admin-waybills';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from '../shared/Waybills.module.css';
import {
  WAYBILL_PAYER_OPTIONS,
  formatMoney,
  formatRub,
  formatUserLabel,
  formatWaybillDateDisplay,
  monthEndIso,
  monthStartIso,
  parseIsoDateParts,
  parseOptionalNumber,
  parseWaybillCost,
  resolveWaybillContractNumber,
  todayIsoDate,
} from '../shared/waybills-page.utils';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UNKNOWN_PAYER = 'Не указан';
const CUSTOMER_PAYER = 'Заказчик';

export type WaybillCalcModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Водители страницы путевого листа. */
  drivers: CrmUser[];
  /** Расчёт сохранён: задания закрыты — обновить список и закрыть модалку. */
  onSaved?: () => void;
};

type PayerAgg = { payer: string; sum: number; count: number };

type PositionAgg = {
  byPayer: PayerAgg[];
  total: number;
  /** Заданий, у которых по позиции указана сумма. */
  withCost: number;
};

type FinalKind = 'PAYOUT' | 'DEPOSIT';

/** Суммы позиции (доставка / грузчики) в разрезе плательщиков. */
function aggregatePosition(
  tasks: WaybillTask[],
  costKey: 'deliveryCost' | 'moversCost',
  payerKey: 'deliveryPayer' | 'moversPayer'
): PositionAgg {
  const map = new Map<string, PayerAgg>();
  let total = 0;
  let withCost = 0;
  for (const task of tasks) {
    const cost = parseWaybillCost(task[costKey]);
    if (cost === null) continue;
    const payer = task[payerKey]?.trim() || UNKNOWN_PAYER;
    const agg = map.get(payer) ?? { payer, sum: 0, count: 0 };
    agg.sum += cost;
    agg.count += 1;
    map.set(payer, agg);
    total += cost;
    withCost += 1;
  }
  const order = WAYBILL_PAYER_OPTIONS as readonly string[];
  const byPayer = [...map.values()].sort((a, b) => {
    const ai = order.indexOf(a.payer);
    const bi = order.indexOf(b.payer);
    if (ai !== -1 || bi !== -1) {
      return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
    }
    return a.payer.localeCompare(b.payer, 'ru');
  });
  return { byPayer, total, withCost };
}

function CalcSummaryBlock({
  title,
  payerTitle,
  agg,
}: {
  title: string;
  payerTitle: string;
  agg: PositionAgg;
}) {
  return (
    <div className={styles.calcBlock}>
      <div className={styles.calcBlockHead}>
        <span className={styles.calcBlockTitle}>{title}</span>
        <span className={styles.calcBlockTotal}>{formatRub(agg.total)}</span>
      </div>
      <div className={styles.calcPayerCaption}>
        {payerTitle} · заданий с суммой: {agg.withCost}
      </div>
      {agg.byPayer.length > 0 ? (
        <ul className={styles.calcPayerList}>
          {agg.byPayer.map((row) => (
            <li key={row.payer} className={styles.calcPayerRow}>
              <span className={styles.calcPayerName}>{row.payer}</span>
              <span className={styles.calcPayerSum}>
                {formatRub(row.sum)} · {row.count} зад.
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.calcPayerEmpty}>суммы за период не указаны</div>
      )}
    </div>
  );
}

/** Сверка выполненных заданий за период и расчёт з/п водителя. */
export function WaybillCalcModal({ isOpen, onClose, drivers, onSaved }: WaybillCalcModalProps) {
  const [dateFrom, setDateFrom] = useState(() => {
    const parts = parseIsoDateParts(todayIsoDate());
    return monthStartIso(
      parts?.y ?? new Date().getFullYear(),
      parts ? parts.m - 1 : new Date().getMonth()
    );
  });
  const [dateTo, setDateTo] = useState(() => {
    const parts = parseIsoDateParts(todayIsoDate());
    return monthEndIso(
      parts?.y ?? new Date().getFullYear(),
      parts ? parts.m - 1 : new Date().getMonth()
    );
  });
  const [driverUserId, setDriverUserId] = useState('');
  const [tasks, setTasks] = useState<WaybillTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [finalKind, setFinalKind] = useState<FinalKind>('PAYOUT');
  const [finalAmount, setFinalAmount] = useState('0');
  const [settlementNote, setSettlementNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const rangeInvalid = ISO_DATE_RE.test(dateFrom) && ISO_DATE_RE.test(dateTo) && dateFrom > dateTo;

  useEffect(() => {
    if (!isOpen) return;
    if (!ISO_DATE_RE.test(dateFrom) || !ISO_DATE_RE.test(dateTo) || rangeInvalid) return;
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void getWaybillTasks({ dateFrom, dateTo })
        .then((rows) => {
          if (!cancelled) {
            setTasks(rows);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setTasks([]);
            setError(err instanceof Error ? err.message : 'Не удалось загрузить задания');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, dateFrom, dateTo, rangeInvalid]);

  /** В расчёт входят только выполненные задания, ещё не закрытые прошлыми расчётами. */
  const doneTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'DONE' && (!driverUserId || t.driverUserId === driverUserId))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [tasks, driverUserId]
  );

  const deliveryAgg = useMemo(
    () => aggregatePosition(doneTasks, 'deliveryCost', 'deliveryPayer'),
    [doneTasks]
  );
  const moversAgg = useMemo(
    () => aggregatePosition(doneTasks, 'moversCost', 'moversPayer'),
    [doneTasks]
  );
  const grandTotal = deliveryAgg.total + moversAgg.total;

  /** Наличные, собранные водителем с заказчиков (плательщик «Заказчик»). */
  const collectedFromCustomers = useMemo(
    () =>
      doneTasks.reduce((sum, t) => {
        let taskSum = 0;
        if (t.deliveryPayer?.trim() === CUSTOMER_PAYER) {
          taskSum += parseWaybillCost(t.deliveryCost) ?? 0;
        }
        if (t.moversPayer?.trim() === CUSTOMER_PAYER) {
          taskSum += parseWaybillCost(t.moversCost) ?? 0;
        }
        return sum + taskSum;
      }, 0),
    [doneTasks]
  );
  const companyOwed = grandTotal - collectedFromCustomers;
  const suggestedKind: FinalKind = companyOwed >= collectedFromCustomers ? 'PAYOUT' : 'DEPOSIT';
  const suggestedAmount = Math.abs(companyOwed - collectedFromCustomers);

  // Предложение итога пересчитывается при смене периода/водителя/данных.
  useEffect(() => {
    setFinalKind(suggestedKind);
    setFinalAmount(
      suggestedAmount % 1 === 0 ? String(suggestedAmount) : suggestedAmount.toFixed(2)
    );
  }, [suggestedKind, suggestedAmount]);

  const selectedDriver = drivers.find((d) => d.id === driverUserId) ?? null;

  const amountNumber = parseOptionalNumber(finalAmount);
  const amountValid = amountNumber !== null && amountNumber >= 0;
  const canSave = Boolean(
    selectedDriver && doneTasks.length > 0 && amountValid && !rangeInvalid && !loading
  );

  const openConfirm = () => {
    if (!canSave) return;
    setSaveError(null);
    setConfirmOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDriver || amountNumber === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      await createWaybillSettlement({
        dateFrom,
        dateTo,
        driverUserId: selectedDriver.id,
        payoutAmount: finalKind === 'PAYOUT' ? amountNumber : 0,
        depositAmount: finalKind === 'DEPOSIT' ? amountNumber : 0,
        note: settlementNote.trim() || null,
      });
      setConfirmOpen(false);
      setSettlementNote('');
      onSaved?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Не удалось сохранить расчёт');
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'date',
      title: 'Дата',
      render: (item: WaybillTask) => formatWaybillDateDisplay(item.date),
    },
    {
      key: 'contract',
      title: '№ договора',
      render: (item: WaybillTask) => resolveWaybillContractNumber(item) || '—',
    },
    {
      key: 'delivery',
      title: 'Доставка',
      render: (item: WaybillTask) => formatMoney(item.deliveryCost, item.deliveryPayer),
    },
    {
      key: 'movers',
      title: 'Грузчики',
      render: (item: WaybillTask) => formatMoney(item.moversCost, item.moversPayer),
    },
    ...(driverUserId
      ? []
      : [
          {
            key: 'driver',
            title: 'Водитель',
            render: (item: WaybillTask) => formatUserLabel(item.driver),
          },
        ]),
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Расчёт з/п водителя"
        size="lg"
        showCloseButton
        compactOnMobile
      >
        <div data-modal-form data-modal-density="compact">
          <p data-modal-form-hint className={styles.modalHintFlush}>
            Сверка выполненных заданий за период: суммы доставки и грузчиков с разбивкой по
            плательщикам. В расчёт входят только выполненные задания.
          </p>

          <div data-modal-form-grid className={styles.calcFiltersGrid}>
            <div data-modal-form-group>
              <label htmlFor="wb-calc-from">Период с</label>
              <input
                id="wb-calc-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div data-modal-form-group>
              <label htmlFor="wb-calc-to">Период по</label>
              <input
                id="wb-calc-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div data-modal-form-group>
              <label htmlFor="wb-calc-driver">Водитель</label>
              <select
                id="wb-calc-driver"
                value={driverUserId}
                onChange={(e) => setDriverUserId(e.target.value)}
              >
                <option value="">Все водители</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {formatUserLabel(d)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rangeInvalid ? (
            <p data-modal-form-error>Дата «по» раньше даты «с» — исправьте период.</p>
          ) : null}
          {error ? <p data-modal-form-error>{error}</p> : null}

          <div className={styles.calcSummary}>
            <CalcSummaryBlock
              title="Доставка"
              payerTitle="Кто платит (доставка)"
              agg={deliveryAgg}
            />
            <CalcSummaryBlock title="Грузчики" payerTitle="Кто платит (грузчики)" agg={moversAgg} />
          </div>

          <div className={styles.calcGrand}>
            <span>
              Итого за период · выполнено заданий: {doneTasks.length}
              {selectedDriver ? ` · ${formatUserLabel(selectedDriver)}` : ''}
            </span>
            <span className={styles.calcGrandSum}>{formatRub(grandTotal)}</span>
          </div>

          <div className={styles.calcFinalBlock}>
            <div className={styles.calcBlockTitle}>Итоговый расчёт</div>
            <div className={styles.calcFinalRows}>
              <div className={styles.calcPayerRow}>
                <span className={styles.calcPayerName}>
                  Оплачено заказчиками на руки (наличные у водителя)
                </span>
                <span className={styles.calcPayerSum}>{formatRub(collectedFromCustomers)}</span>
              </div>
              <div className={styles.calcPayerRow}>
                <span className={styles.calcPayerName}>
                  Начислено компанией (доставка и грузчики за её счёт)
                </span>
                <span className={styles.calcPayerSum}>{formatRub(companyOwed)}</span>
              </div>
              <div className={`${styles.calcPayerRow} ${styles.calcFinalSuggest}`}>
                <span className={styles.calcPayerName}>
                  {suggestedKind === 'PAYOUT'
                    ? 'Итог по сверке: выплата водителю из кассы'
                    : 'Итог по сверке: внесение водителем в кассу'}
                </span>
                <span className={styles.calcPayerSum}>{formatRub(suggestedAmount)}</span>
              </div>
            </div>

            {doneTasks.length === 0 ? (
              <p data-modal-form-hint>
                За период нет выполненных заданий — итоговый расчёт сохранить нечего.
              </p>
            ) : !selectedDriver ? (
              <p data-modal-form-hint>
                Выберите водителя, чтобы сохранить итоговый расчёт по его заданиям.
              </p>
            ) : (
              <div data-modal-form-grid className={styles.calcFiltersGrid}>
                <div data-modal-form-group>
                  <label htmlFor="wb-calc-final-kind">Тип итога</label>
                  <select
                    id="wb-calc-final-kind"
                    value={finalKind}
                    onChange={(e) => setFinalKind(e.target.value as FinalKind)}
                    disabled={saving}
                  >
                    <option value="PAYOUT">Выплата водителю</option>
                    <option value="DEPOSIT">Внесение в кассу</option>
                  </select>
                </div>
                <div data-modal-form-group>
                  <label htmlFor="wb-calc-final-amount">Сумма итога, ₽</label>
                  <input
                    id="wb-calc-final-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={finalAmount}
                    onChange={(e) => setFinalAmount(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div data-modal-form-group>
                  <label htmlFor="wb-calc-final-note">Примечание</label>
                  <input
                    id="wb-calc-final-note"
                    type="text"
                    value={settlementNote}
                    onChange={(e) => setSettlementNote(e.target.value)}
                    placeholder="Например: выплачено наличными 05.11"
                    disabled={saving}
                    maxLength={2000}
                  />
                </div>
              </div>
            )}

            {saveError ? <p data-modal-form-error>{saveError}</p> : null}

            {doneTasks.length > 0 && selectedDriver ? (
              <div className={styles.calcFinalActions}>
                <button
                  data-admin-mutation
                  type="button"
                  data-modal-btn="primary"
                  disabled={!canSave || saving}
                  onClick={openConfirm}
                >
                  {saving ? 'Сохранение…' : 'Сохранить расчёт и закрыть задания'}
                </button>
                <span className={styles.calcFinalHint}>
                  Будет закрыто заданий: {doneTasks.length} — после этого они не редактируются.
                </span>
              </div>
            ) : null}
          </div>

          <h4 className={styles.calcListTitle}>Выполненные задания</h4>
          <DataTable
            containerClassName={styles.directoryTable}
            data={doneTasks}
            columns={columns}
            keyExtractor={(item) => item.id}
            loading={loading}
            emptyMessage={loading ? 'Загрузка...' : 'За выбранный период выполненных заданий нет'}
          />

          <div data-modal-form-actions>
            <button type="button" data-modal-btn="secondary" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Сохранить расчёт и закрыть задания"
        message={`Расчёт за ${dateFrom} — ${dateTo} (${formatUserLabel(selectedDriver)}): ${
          finalKind === 'PAYOUT' ? 'выплата водителю' : 'внесение в кассу'
        } ${formatRub(amountNumber ?? 0)}. Будет закрыто заданий: ${doneTasks.length} — они больше не редактируются и не попадут в новые расчёты.`}
        confirmText={saving ? 'Сохранение…' : 'Сохранить и закрыть'}
        cancelText="Отмена"
        onConfirm={() => void handleSave()}
      />
    </>
  );
}
