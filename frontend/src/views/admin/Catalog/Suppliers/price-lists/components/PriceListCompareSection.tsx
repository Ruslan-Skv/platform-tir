import type { PriceListDiffStatus } from '@/shared/api/admin-supplier-price-lists';

import styles from '../SupplierPriceListsPage.module.css';
import type { SupplierPriceListsPageModel } from '../supplier-price-lists-page.types';
import { formatDate, statusLabel } from '../supplier-price-lists-page.utils';
import { PriceListDiffTable } from './PriceListDiffTable';

type PriceListCompareSectionProps = Pick<
  SupplierPriceListsPageModel,
  | 'category'
  | 'isTrimCategory'
  | 'snapshots'
  | 'comparison'
  | 'filteredRows'
  | 'comparing'
  | 'mapping'
  | 'applying'
  | 'currentSnapshotId'
  | 'previousSnapshotId'
  | 'statusFilter'
  | 'setCurrentSnapshotId'
  | 'setPreviousSnapshotId'
  | 'setStatusFilter'
  | 'runCompare'
  | 'handleAutoMap'
  | 'handleApply'
>;

export function PriceListCompareSection({
  category,
  isTrimCategory,
  snapshots,
  comparison,
  filteredRows,
  comparing,
  mapping,
  applying,
  currentSnapshotId,
  previousSnapshotId,
  statusFilter,
  setCurrentSnapshotId,
  setPreviousSnapshotId,
  setStatusFilter,
  runCompare,
  handleAutoMap,
  handleApply,
}: PriceListCompareSectionProps) {
  if (snapshots.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Сравнение прайсов</h2>

      <div className={styles.compareControls}>
        <div className={styles.formGroup}>
          <label htmlFor="current-snapshot">Новый прайс</label>
          <select
            id="current-snapshot"
            className={styles.select}
            value={currentSnapshotId}
            onChange={(e) => setCurrentSnapshotId(e.target.value)}
          >
            {snapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {formatDate(snapshot.createdAt)} — {snapshot.fileName}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="previous-snapshot">Предыдущий прайс</label>
          <select
            id="previous-snapshot"
            className={styles.select}
            value={previousSnapshotId}
            onChange={(e) => setPreviousSnapshotId(e.target.value)}
          >
            <option value="">Авто (предыдущий снимок)</option>
            {snapshots
              .filter((snapshot) => snapshot.id !== currentSnapshotId)
              .map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {formatDate(snapshot.createdAt)} — {snapshot.fileName}
                </option>
              ))}
          </select>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={comparing || !currentSnapshotId}
          onClick={() => void runCompare(currentSnapshotId, previousSnapshotId || undefined)}
        >
          {comparing ? 'Сравнение…' : 'Обновить сравнение'}
        </button>
        {isTrimCategory ? (
          <>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={mapping}
              onClick={() => void handleAutoMap()}
            >
              {mapping ? 'Привязка…' : 'Автопривязка к справочнику'}
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={applying || !comparison}
              onClick={() => void handleApply()}
            >
              {applying ? 'Применение…' : 'Применить в справочник'}
            </button>
          </>
        ) : null}
      </div>

      {comparison ? (
        <>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Без изменений</span>
              <span className={styles.summaryValue}>{comparison.summary.unchanged}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Изменились</span>
              <span className={styles.summaryValue}>{comparison.summary.changed}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Новые</span>
              <span className={styles.summaryValue}>{comparison.summary.added}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Удалённые</span>
              <span className={styles.summaryValue}>{comparison.summary.removed}</span>
            </div>
          </div>

          <div className={styles.filters}>
            {(['all', 'changed', 'added', 'removed', 'unchanged'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`${styles.filterButton} ${
                  statusFilter === filter ? styles.filterButtonActive : ''
                }`}
                onClick={() => setStatusFilter(filter as PriceListDiffStatus | 'all')}
              >
                {filter === 'all' ? 'Все' : statusLabel(filter)}
              </button>
            ))}
          </div>

          <PriceListDiffTable rows={filteredRows} category={category} />
        </>
      ) : null}
    </section>
  );
}
