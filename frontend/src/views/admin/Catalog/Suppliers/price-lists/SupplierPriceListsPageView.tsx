import Link from 'next/link';

import {
  PRICE_LIST_CATEGORIES,
  PRICE_LIST_CATEGORY_LABELS,
} from '@/shared/api/admin-supplier-price-lists';

import styles from './SupplierPriceListsPage.module.css';
import { PriceListCompareSection } from './components/PriceListCompareSection';
import { PriceListUploadSection } from './components/PriceListUploadSection';
import type { SupplierPriceListsPageModel } from './supplier-price-lists-page.types';
import { formatDate } from './supplier-price-lists-page.utils';

type SupplierPriceListsPageViewProps = {
  model: SupplierPriceListsPageModel;
};

export function SupplierPriceListsPageView({ model }: SupplierPriceListsPageViewProps) {
  if (model.loading) {
    return <div className={styles.loading}>Загрузка…</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Сверка прайс-листов: {model.supplierLabel}</h1>
          <p className={styles.subtitle}>
            Загрузите прайс Стройком один раз — система разберёт все категории и сохранит отдельные
            снимки. Сравнение и применение цен — по выбранной вкладке.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/catalog/suppliers" className={styles.backLink}>
            ← К списку поставщиков
          </Link>
          <Link
            href={`/admin/catalog/suppliers/${model.supplierId}/edit`}
            className={styles.secondaryLink}
          >
            Карточка поставщика
          </Link>
          <Link href="/admin/catalog/components" className={styles.secondaryLink}>
            Комплектующие
          </Link>
        </div>
      </div>

      {model.message ? (
        <div
          className={`${styles.message} ${model.message.type === 'ok' ? styles.messageOk : styles.messageErr}`}
        >
          {model.message.text}
        </div>
      ) : null}

      <PriceListUploadSection
        selectedFile={model.selectedFile}
        fileInputRef={model.fileInputRef}
        uploading={model.uploading}
        setSelectedFile={model.setSelectedFile}
        clearSelectedFile={model.clearSelectedFile}
        handleUpload={model.handleUpload}
      />

      <div className={styles.categoryTabs}>
        {PRICE_LIST_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={`${styles.categoryTab} ${model.category === item ? styles.categoryTabActive : ''}`}
            onClick={() => model.setCategory(item)}
          >
            {PRICE_LIST_CATEGORY_LABELS[item]}
          </button>
        ))}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Снимки — {PRICE_LIST_CATEGORY_LABELS[model.category]}
        </h2>
        {model.categoryLoading ? (
          <div className={styles.sectionLoading}>Загрузка снимков…</div>
        ) : model.snapshots.length === 0 ? (
          <p className={styles.empty}>Снимков пока нет. Загрузите первый прайс-лист.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Дата загрузки</th>
                  <th>Файл</th>
                  <th>Дата в прайсе</th>
                  <th>Строк</th>
                </tr>
              </thead>
              <tbody>
                {model.snapshots.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td>{formatDate(snapshot.createdAt)}</td>
                    <td>{snapshot.fileName}</td>
                    <td>{snapshot.priceListDate || '—'}</td>
                    <td>{snapshot.rowCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {model.snapshots.length > 0 ? (
        <PriceListCompareSection
          category={model.category}
          isTrimCategory={model.isTrimCategory}
          snapshots={model.snapshots}
          comparison={model.comparison}
          filteredRows={model.filteredRows}
          comparing={model.comparing}
          mapping={model.mapping}
          applying={model.applying}
          currentSnapshotId={model.currentSnapshotId}
          previousSnapshotId={model.previousSnapshotId}
          statusFilter={model.statusFilter}
          setCurrentSnapshotId={model.setCurrentSnapshotId}
          setPreviousSnapshotId={model.setPreviousSnapshotId}
          setStatusFilter={model.setStatusFilter}
          runCompare={model.runCompare}
          handleAutoMap={model.handleAutoMap}
          handleApply={model.handleApply}
        />
      ) : null}
    </div>
  );
}
