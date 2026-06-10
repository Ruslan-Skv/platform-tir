'use client';

import cdDataTab from '../../../../styles/data-tab.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import cdWindows from '../../../../styles/windows-package.module.css';
import { formatPackageMoneyValue } from '../../../shared/editor/estimateTabUi';

export type RepairFinalEstimateRoomLine = {
  name: string;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
  excludedQuantity: number;
  includedQuantity: number;
};

export type RepairFinalEstimateRoom = {
  name: string;
  total: number;
  lines: RepairFinalEstimateRoomLine[];
};

export type RepairFinalEstimateTabProps = {
  contractNumberLabel: string;
  contractDateLabel: string;
  rooms: RepairFinalEstimateRoom[];
  totalAmount: number;
  totalAfterDiscount: number;
  contractDiscountPercent: number;
};

const formatMoneyValue = formatPackageMoneyValue;

const FINAL_ESTIMATE_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdWindows.estimateTabCompact}`;
const FINAL_ESTIMATE_BLOCK = `${cdDataTab.blockData} ${cdWindows.blockData}`;
const FINAL_ESTIMATE_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact}`;
const FINAL_ESTIMATE_FORM_GRID = `${cdDataTab.formGrid} ${cdWindows.formGrid}`;
const FINAL_ESTIMATE_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
const FINAL_ESTIMATE_SECTION_TITLE = `${cdEstimateTab.sectionTitle}`;
const FINAL_ESTIMATE_SECTION_TITLE_MAIN = `${cdTemplates.estimateSectionTitle} ${cdEstimateTab.estimateSectionTitle}`;
const FINAL_ESTIMATE_HINT = `${cdDocPreview.hint} ${cdTemplates.hint}`;

/** Вкладка «Итог. смета» — только для направления «Ремонт». */
export function RepairFinalEstimateTab({
  contractNumberLabel,
  contractDateLabel,
  rooms,
  totalAmount,
  totalAfterDiscount,
  contractDiscountPercent,
}: RepairFinalEstimateTabProps) {
  return (
    <div
      className={`${FINAL_ESTIMATE_BLOCK} ${FINAL_ESTIMATE_DATA_COMPACT} ${FINAL_ESTIMATE_TAB_COMPACT}`}
    >
      <div className={FINAL_ESTIMATE_FORM_GRID}>
        <div className={FINAL_ESTIMATE_SECTION_CARD}>
          <h3 className={`${FINAL_ESTIMATE_SECTION_TITLE} ${FINAL_ESTIMATE_SECTION_TITLE_MAIN}`}>
            Итоговая смета
          </h3>
          <p className={FINAL_ESTIMATE_HINT} style={{ marginTop: 0 }}>
            Итог формируется из основной сметы и всех доп. соглашений. Одинаковые работы в одном
            помещении суммируются, а работы из блока «Непроводимые ремонтно-отделочные работы»
            вычитаются по количеству и сумме. В строках таблицы — суммы без скидки по договору;
            скидка только в итогах ниже; по позициям со скидкой см. «Заказ-наряды» → «Итог.
            заказ-наряд».
          </p>
          <div className={`${cdDocPreview.estimateA4Wrap} ${cdEstimateTab.estimateA4Wrap}`}>
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
                                  <div className={cdEstimateTab.estimateAttachedPresetMeta}>
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
