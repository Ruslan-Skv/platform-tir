import type {
  PriceListDiffRow,
  SupplierPriceListCategory,
} from '@/shared/api/admin-supplier-price-lists';

import styles from '../SupplierPriceListsPage.module.css';
import { formatPrice, statusLabel } from '../supplier-price-lists-page.utils';

type PriceListDiffTableProps = {
  rows: PriceListDiffRow[];
  category: SupplierPriceListCategory;
};

export function PriceListDiffTable({ rows, category }: PriceListDiffTableProps) {
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
    category === 'STEEL_DOOR' || category === 'ACCORDION' ? 'Примечание' : 'Примечание';

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
