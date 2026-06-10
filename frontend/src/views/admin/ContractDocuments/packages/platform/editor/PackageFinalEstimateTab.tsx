'use client';

import cdDocPreview from '../../../styles/documents-preview.module.css';
import {
  PACKAGE_A4_WRAP,
  PACKAGE_BLOCK,
  PACKAGE_DATA_COMPACT,
  PACKAGE_FORM_GRID,
  PACKAGE_HINT,
  PACKAGE_SECTION_CARD,
  PACKAGE_SECTION_TITLE,
  PACKAGE_SECTION_TITLE_MAIN,
  PACKAGE_TAB_COMPACT,
} from '../ui/packageTabClassNames';
import attachStyles from './PackageEstimateAttach.module.css';
import { formatPackageMoneyValue } from './estimateTabUi';

export type PackageFinalEstimateRoomLine = {
  name: string;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
  excludedQuantity: number;
  includedQuantity: number;
};

export type PackageFinalEstimateRoom = {
  name: string;
  total: number;
  lines: PackageFinalEstimateRoomLine[];
};

export type PackageFinalEstimateTabProps = {
  contractNumberLabel: string;
  contractDateLabel: string;
  rooms: PackageFinalEstimateRoom[];
  totalAmount: number;
  totalAfterDiscount: number;
  contractDiscountPercent: number;
};

const formatMoneyValue = formatPackageMoneyValue;

/** Вкладка «Итог. смета» — только для направления «Ремонт». */
export function PackageFinalEstimateTab({
  contractNumberLabel,
  contractDateLabel,
  rooms,
  totalAmount,
  totalAfterDiscount,
  contractDiscountPercent,
}: PackageFinalEstimateTabProps) {
  return (
    <div className={`${PACKAGE_BLOCK} ${PACKAGE_DATA_COMPACT} ${PACKAGE_TAB_COMPACT}`}>
      <div className={PACKAGE_FORM_GRID}>
        <div className={PACKAGE_SECTION_CARD}>
          <h3 className={`${PACKAGE_SECTION_TITLE} ${PACKAGE_SECTION_TITLE_MAIN}`}>
            Итоговая смета
          </h3>
          <p className={PACKAGE_HINT} style={{ marginTop: 0 }}>
            Итог формируется из основной сметы и всех доп. соглашений. Одинаковые работы в одном
            помещении суммируются, а работы из блока «Непроводимые ремонтно-отделочные работы»
            вычитаются по количеству и сумме. В строках таблицы — суммы без скидки по договору;
            скидка только в итогах ниже; по позициям со скидкой см. «Заказ-наряды» → «Итог.
            заказ-наряд».
          </p>
          <div className={PACKAGE_A4_WRAP}>
            <article
              className={cdDocPreview.estimateA4Sheet}
              data-print-target="final-estimate-sheet"
            >
              <p className={cdDocPreview.estimateA4AppendixRef}>
                Приложение №1 к договору № {contractNumberLabel} от {contractDateLabel}
              </p>
              {rooms.length === 0 ? (
                <p className={cdDocPreview.estimateA4Empty}>Нет данных для итоговой сметы.</p>
              ) : (
                <>
                  <h4 className={cdDocPreview.estimateA4Title}>Итоговая смета работ</h4>
                  <p className={cdDocPreview.estimateA4Meta}>Помещений: {rooms.length}</p>
                  {rooms.map((room, roomIndex) => (
                    <section
                      key={`final-estimate-room-${room.name}-${roomIndex}`}
                      className={cdDocPreview.estimateA4Room}
                    >
                      <div className={cdDocPreview.estimateA4RoomHeader}>
                        <span>
                          {roomIndex + 1}. {room.name}
                        </span>
                        <strong>{formatMoneyValue(room.total)} руб.</strong>
                      </div>
                      <table className={cdDocPreview.estimateA4Table}>
                        <thead>
                          <tr>
                            <th>№</th>
                            <th>Наименование</th>
                            <th>Ед.</th>
                            <th>Кол-во</th>
                            <th>Цена</th>
                            <th>Сумма</th>
                          </tr>
                        </thead>
                        <tbody>
                          {room.lines.map((line, lineIndex) => (
                            <tr key={`${room.name}-${line.name}-${lineIndex}`}>
                              <td>{lineIndex + 1}</td>
                              <td>
                                {line.name}
                                {line.excludedQuantity > 0 ? (
                                  <div className={attachStyles.estimateAttachedPresetMeta}>
                                    Вычет: {formatMoneyValue(line.excludedQuantity)} из{' '}
                                    {formatMoneyValue(line.includedQuantity)}
                                  </div>
                                ) : null}
                              </td>
                              <td>{line.unit || '—'}</td>
                              <td>{formatMoneyValue(line.quantity)}</td>
                              <td>{formatMoneyValue(line.price)}</td>
                              <td>{formatMoneyValue(line.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  ))}
                  {contractDiscountPercent > 0 ? (
                    <>
                      <p className={cdDocPreview.estimateA4Total}>
                        Итого по итоговой смете (без скидки):{' '}
                        <strong>{formatMoneyValue(totalAmount)} руб.</strong>
                      </p>
                      <p className={cdDocPreview.estimateA4DiscountMeta}>
                        Скидка по договору: {String(contractDiscountPercent).replace('.', ',')}%
                      </p>
                      <p className={cdDocPreview.estimateA4Total}>
                        Итого со скидкой:{' '}
                        <strong>{formatMoneyValue(totalAfterDiscount)} руб.</strong>
                      </p>
                    </>
                  ) : (
                    <p className={cdDocPreview.estimateA4Total}>
                      Итого по итоговой смете: <strong>{formatMoneyValue(totalAmount)} руб.</strong>
                    </p>
                  )}
                </>
              )}
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
