'use client';

import { useMemo } from 'react';

import type { MoneyMovementListResponse } from '@/shared/api/crm/admin-money-movements';
import { Modal } from '@/shared/ui/Modal';
import {
  BudgetDonutChart,
  HorizontalShareChart,
} from '@/views/admin/AdvertisingStrategy/shared/AdvertisingStrategyCharts';

import styles from '../MoneyMovements.module.css';
import {
  DP_DIRECTION_OPTIONS,
  DP_OTHER_DIRECTION,
  formatDpDate,
  formatDpMoney,
} from '../money-movements-page.constants';
import formStyles from './MoneyMovementModalForm.module.css';

type DpStatsModalProps = {
  open: boolean;
  onClose: () => void;
  /** Итоги по менеджерам за выбранный период (те же фильтры, что у журнала). */
  managerSums: MoneyMovementListResponse['managerSums'];
  /** Итоги по направлениям за выбранный период. */
  directionSums: MoneyMovementListResponse['directionSums'];
  /** Итоги «направление × менеджер» — кто из менеджеров лидер в каждом направлении. */
  directionManagerSums: MoneyMovementListResponse['directionManagerSums'];
  dateFrom: string;
  dateTo: string;
};

type DpChartItem = { id: string; label: string; value: number };

/** Детальная статистика журнала ДП за выбранный период: столбчатые и круговые графики. */
export function DpStatsModal({
  open,
  onClose,
  managerSums,
  directionSums,
  directionManagerSums,
  dateFrom,
  dateTo,
}: DpStatsModalProps) {
  // В графики попадают только положительные суммы, по убыванию — сверху лидер.
  const managerChartItems = useMemo<DpChartItem[]>(
    () =>
      managerSums
        .filter((item) => item.sum > 0)
        .map((item) => ({ id: item.managerId ?? '__none', label: item.name, value: item.sum })),
    [managerSums]
  );

  const directionChartItems = useMemo<DpChartItem[]>(
    () =>
      directionSums
        // «Прочее» — движения вне продаж, в графики оплат не входят.
        .filter((item) => item.direction !== DP_OTHER_DIRECTION)
        .filter((item) => item.sum > 0)
        .map((item) => ({
          id: item.direction ?? '__none',
          label: item.direction ?? 'Без направления',
          value: item.sum,
        }))
        .sort((a, b) => b.value - a.value),
    [directionSums]
  );

  /** По каждому направлению — столбчатый график менеджеров (лидер сверху). */
  const directionManagerCharts = useMemo(() => {
    const byDirection = new Map<string, { label: string; items: DpChartItem[] }>();
    for (const row of directionManagerSums) {
      if (row.sum <= 0) continue;
      const key = row.direction ?? '__none';
      const entry = byDirection.get(key) ?? {
        label: row.direction ?? 'Без направления',
        items: [],
      };
      entry.items.push({ id: row.managerId ?? '__none', label: row.name, value: row.sum });
      byDirection.set(key, entry);
    }
    for (const entry of byDirection.values()) {
      entry.items.sort((a, b) => b.value - a.value);
    }
    // Порядок блоков — как в справочнике направлений, прочие — в конце.
    const orderIndex = (key: string) => {
      const index = DP_DIRECTION_OPTIONS.findIndex((option) => option.value === key);
      return index === -1 ? DP_DIRECTION_OPTIONS.length : index;
    };
    return [...byDirection.entries()]
      .sort((a, b) => orderIndex(a[0]) - orderIndex(b[0]))
      .map(([key, entry]) => ({ key, ...entry }));
  }, [directionManagerSums]);

  const managerChartTotal = managerChartItems.reduce((acc, item) => acc + item.value, 0);
  const directionChartTotal = directionChartItems.reduce((acc, item) => acc + item.value, 0);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Детальная статистика"
      size="lg"
      className={formStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <p className={styles.statsPeriodHint}>
        Период: {formatDpDate(dateFrom)} — {formatDpDate(dateTo)} · по текущим фильтрам журнала
      </p>
      <div className={styles.statsChartsGrid}>
        <HorizontalShareChart title="Оплаты по менеджерам" items={managerChartItems} />
        <BudgetDonutChart
          title="Доли менеджеров"
          items={managerChartItems}
          centerLabel="Итого"
          centerValue={formatDpMoney(managerChartTotal)}
        />
        <HorizontalShareChart title="Оплаты по направлениям" items={directionChartItems} />
        <BudgetDonutChart
          title="Доли направлений"
          items={directionChartItems}
          centerLabel="Итого"
          centerValue={formatDpMoney(directionChartTotal)}
        />
      </div>

      {directionManagerCharts.length > 0 ? (
        <>
          <h3 className={styles.statsSectionTitle}>Менеджеры по направлениям</h3>
          <div className={styles.statsChartsGrid}>
            {directionManagerCharts.map((block) => (
              <HorizontalShareChart key={block.key} title={block.label} items={block.items} />
            ))}
          </div>
        </>
      ) : null}
    </Modal>
  );
}
