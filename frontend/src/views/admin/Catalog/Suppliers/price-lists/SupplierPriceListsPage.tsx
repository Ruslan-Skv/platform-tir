'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import {
  PRICE_LIST_CATEGORIES,
  PRICE_LIST_CATEGORY_LABELS,
  PRICE_LIST_UPLOAD_HINT,
  type PriceListCompareResponse,
  type PriceListDiffRow,
  type PriceListDiffStatus,
  type SupplierPriceListCategory,
  type SupplierPriceListSnapshot,
  applySupplierPriceListChanges,
  autoMapSupplierPriceListRows,
  compareSupplierPriceLists,
  fetchSupplierPriceListSnapshots,
  uploadSupplierPriceListAll,
} from '@/shared/api/admin-supplier-price-lists';
import { apiFetch } from '@/shared/lib/api-fetch';

import styles from './SupplierPriceListsPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type SupplierInfo = {
  id: string;
  legalName: string;
  commercialName?: string | null;
};

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ru-RU');
}

function statusLabel(status: PriceListDiffStatus) {
  switch (status) {
    case 'changed':
      return 'Изменилась';
    case 'added':
      return 'Новая';
    case 'removed':
      return 'Удалена';
    default:
      return 'Без изменений';
  }
}

export function SupplierPriceListsPage({ supplierId }: { supplierId: string }) {
  const [category, setCategory] = useState<SupplierPriceListCategory>('TRIM');
  const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
  const [snapshots, setSnapshots] = useState<SupplierPriceListSnapshot[]>([]);
  const [comparison, setComparison] = useState<PriceListCompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentSnapshotId, setCurrentSnapshotId] = useState('');
  const [previousSnapshotId, setPreviousSnapshotId] = useState('');
  const [statusFilter, setStatusFilter] = useState<PriceListDiffStatus | 'all'>('changed');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('admin_token') || localStorage.getItem('user_token')
          : null;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [supplierRes, snapshotsData] = await Promise.all([
        apiFetch(`${API_URL}/admin/catalog/suppliers/${supplierId}`, {
          headers,
          cache: 'no-store',
        }),
        fetchSupplierPriceListSnapshots(supplierId, category),
      ]);

      if (!supplierRes.ok) throw new Error('Поставщик не найден');
      const supplierData = (await supplierRes.json()) as SupplierInfo;
      setSupplier(supplierData);
      setSnapshots(snapshotsData);

      if (snapshotsData.length > 0) {
        setCurrentSnapshotId(snapshotsData[0].id);
        setPreviousSnapshotId(snapshotsData[1]?.id ?? '');
      } else {
        setCurrentSnapshotId('');
        setPreviousSnapshotId('');
        setComparison(null);
      }
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Ошибка загрузки',
      });
    } finally {
      setLoading(false);
    }
  }, [supplierId, category]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const runCompare = useCallback(
    async (currentId: string, previousId?: string) => {
      if (!currentId) return;
      setComparing(true);
      setMessage(null);
      try {
        const result = await compareSupplierPriceLists(
          supplierId,
          currentId,
          category,
          previousId || undefined
        );
        setComparison(result);
      } catch (e) {
        setMessage({
          type: 'err',
          text: e instanceof Error ? e.message : 'Ошибка сравнения',
        });
      } finally {
        setComparing(false);
      }
    },
    [supplierId, category]
  );

  useEffect(() => {
    if (currentSnapshotId) {
      void runCompare(currentSnapshotId, previousSnapshotId || undefined);
    }
  }, [currentSnapshotId, previousSnapshotId, runCompare]);

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: 'err', text: 'Выберите файл прайс-листа' });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const result = await uploadSupplierPriceListAll(supplierId, selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      const totalRows = result.snapshots.reduce((sum, snapshot) => sum + snapshot.rowCount, 0);
      const breakdown = result.snapshots
        .map(
          (snapshot) => `${PRICE_LIST_CATEGORY_LABELS[snapshot.category]} (${snapshot.rowCount})`
        )
        .join(', ');
      const skippedNote =
        result.skipped.length > 0
          ? ` Пропущено: ${result.skipped.map((item) => PRICE_LIST_CATEGORY_LABELS[item.category]).join(', ')}.`
          : '';

      setMessage({
        type: 'ok',
        text: `Прайс загружен: ${result.snapshots.length} категорий, ${totalRows} строк — ${breakdown}.${skippedNote}`,
      });

      await loadData();

      const categorySnapshot = result.snapshots.find((snapshot) => snapshot.category === category);
      if (categorySnapshot) {
        setCurrentSnapshotId(categorySnapshot.id);
        const refreshed = await fetchSupplierPriceListSnapshots(supplierId, category);
        const previous = refreshed.find((snapshot) => snapshot.id !== categorySnapshot.id);
        setPreviousSnapshotId(previous?.id ?? '');
      }
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Ошибка загрузки',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAutoMap = async () => {
    setMapping(true);
    setMessage(null);
    try {
      const result = await autoMapSupplierPriceListRows(
        supplierId,
        currentSnapshotId || undefined,
        category
      );
      setMessage({
        type: 'ok',
        text: `Привязано: ${result.mapped}, пропущено: ${result.skipped}`,
      });
      if (currentSnapshotId) {
        await runCompare(currentSnapshotId, previousSnapshotId || undefined);
      }
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Ошибка автопривязки',
      });
    } finally {
      setMapping(false);
    }
  };

  const handleApply = async () => {
    if (!comparison?.currentSnapshot.id) return;
    const changedMapped = comparison.rows.filter(
      (row) => row.status === 'changed' && row.catalogItemId
    );
    if (changedMapped.length === 0) {
      setMessage({
        type: 'err',
        text: 'Нет привязанных позиций с изменившейся ценой',
      });
      return;
    }

    const confirmed = window.confirm(
      `Обновить цены для ${changedMapped.length} позиций в справочнике комплектующих?`
    );
    if (!confirmed) return;

    setApplying(true);
    setMessage(null);
    try {
      const result = await applySupplierPriceListChanges(supplierId, {
        currentSnapshotId: comparison.currentSnapshot.id,
        previousSnapshotId: comparison.previousSnapshot?.id,
        rowKeys: changedMapped.map((row) => row.rowKey),
        category,
      });
      setMessage({
        type: 'ok',
        text: `Обновлено цен: ${result.updated}`,
      });
      await runCompare(comparison.currentSnapshot.id, comparison.previousSnapshot?.id);
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Ошибка применения цен',
      });
    } finally {
      setApplying(false);
    }
  };

  const filteredRows = useMemo(() => {
    const rows = comparison?.rows ?? [];
    if (statusFilter === 'all') return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [comparison?.rows, statusFilter]);

  const supplierLabel = supplier?.commercialName || supplier?.legalName || 'Поставщик';
  const isTrimCategory = category === 'TRIM';

  if (loading) {
    return <div className={styles.loading}>Загрузка…</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Сверка прайс-листов: {supplierLabel}</h1>
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
            href={`/admin/catalog/suppliers/${supplierId}/edit`}
            className={styles.secondaryLink}
          >
            Карточка поставщика
          </Link>
          <Link href="/admin/catalog/components" className={styles.secondaryLink}>
            Комплектующие
          </Link>
        </div>
      </div>

      {message ? (
        <div
          className={`${styles.message} ${message.type === 'ok' ? styles.messageOk : styles.messageErr}`}
        >
          {message.text}
        </div>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Загрузить прайс</h2>
        <div className={styles.uploadRow}>
          <div className={styles.filePicker}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              className={styles.fileInputHidden}
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className={styles.filePickerButton}
              onClick={() => fileInputRef.current?.click()}
            >
              Выбрать файл
            </button>
            <div className={styles.filePickerMeta}>
              <span className={styles.filePickerName}>
                {selectedFile ? selectedFile.name : 'Файл не выбран'}
              </span>
              <span className={styles.filePickerHint}>{PRICE_LIST_UPLOAD_HINT}</span>
            </div>
            {selectedFile ? (
              <button
                type="button"
                className={styles.filePickerClear}
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Очистить
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={uploading || !selectedFile}
            onClick={() => void handleUpload()}
          >
            {uploading ? 'Загрузка…' : 'Загрузить все категории'}
          </button>
        </div>
      </section>

      <div className={styles.categoryTabs}>
        {PRICE_LIST_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={`${styles.categoryTab} ${category === item ? styles.categoryTabActive : ''}`}
            onClick={() => {
              setCategory(item);
              setComparison(null);
              setMessage(null);
            }}
          >
            {PRICE_LIST_CATEGORY_LABELS[item]}
          </button>
        ))}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Снимки — {PRICE_LIST_CATEGORY_LABELS[category]}</h2>
        {snapshots.length === 0 ? (
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
                {snapshots.map((snapshot) => (
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

      {snapshots.length > 0 ? (
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
                    onClick={() => setStatusFilter(filter)}
                  >
                    {filter === 'all' ? 'Все' : statusLabel(filter)}
                  </button>
                ))}
              </div>

              <DiffTable rows={filteredRows} category={category} />
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function DiffTable({
  rows,
  category,
}: {
  rows: PriceListDiffRow[];
  category: SupplierPriceListCategory;
}) {
  if (rows.length === 0) {
    return <p className={styles.empty}>Нет строк для выбранного фильтра.</p>;
  }

  const blockLabel =
    category === 'TRIM'
      ? 'Блок погонажа'
      : category === 'INTERIOR_DOOR'
        ? 'Серия'
        : category === 'HARDWARE'
          ? 'Группа'
          : category === 'ACCORDION'
            ? 'Раздел'
            : 'Модель';
  const itemLabel =
    category === 'TRIM'
      ? 'Позиция'
      : category === 'HARDWARE'
        ? 'Наименование'
        : category === 'ARCH'
          ? 'Комплектация'
          : 'Модель';
  const colorLabel =
    category === 'STEEL_DOOR'
      ? 'Внутренняя отделка'
      : category === 'ARCH'
        ? 'Отделка'
        : category === 'HARDWARE'
          ? 'Цвет'
          : 'Цвет';
  const showMaterial = category === 'STEEL_DOOR';
  const noteLabel =
    category === 'STEEL_DOOR' ? 'Покраска' : category === 'ACCORDION' ? 'Примечание' : 'Примечание';

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Статус</th>
            <th>{blockLabel}</th>
            <th>{itemLabel}</th>
            <th>{colorLabel}</th>
            {showMaterial ? <th>Внешняя</th> : null}
            {category !== 'HARDWARE' && category !== 'ARCH' ? <th>{noteLabel}</th> : null}
            <th>Размеры</th>
            <th>Было</th>
            <th>Стало</th>
            <th>Δ</th>
            {category === 'TRIM' ? <th>Справочник</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowKey}>
              <td>
                <span
                  className={`${styles.badge} ${
                    row.status === 'changed'
                      ? styles.badgeChanged
                      : row.status === 'added'
                        ? styles.badgeAdded
                        : row.status === 'removed'
                          ? styles.badgeRemoved
                          : styles.badgeUnchanged
                  }`}
                >
                  {statusLabel(row.status)}
                </span>
              </td>
              <td>{row.blockTitle}</td>
              <td>{row.itemName}</td>
              <td>{row.color || '—'}</td>
              {showMaterial ? <td>{row.material || '—'}</td> : null}
              {category !== 'HARDWARE' && category !== 'ARCH' ? (
                <td>{row.variantNote || '—'}</td>
              ) : null}
              <td>{row.size || '—'}</td>
              <td>{formatPrice(row.previousPrice)}</td>
              <td>{formatPrice(row.currentPrice)}</td>
              <td>
                {row.delta === null ? (
                  '—'
                ) : (
                  <span className={row.delta > 0 ? styles.deltaUp : styles.deltaDown}>
                    {row.delta > 0 ? '+' : ''}
                    {row.delta.toLocaleString('ru-RU')} ₽
                  </span>
                )}
              </td>
              {category === 'TRIM' ? (
                <td>
                  {row.catalogItemLabel ? (
                    <span className={styles.mappedYes}>{row.catalogItemLabel}</span>
                  ) : (
                    <span className={styles.mappedNo}>не привязано</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
