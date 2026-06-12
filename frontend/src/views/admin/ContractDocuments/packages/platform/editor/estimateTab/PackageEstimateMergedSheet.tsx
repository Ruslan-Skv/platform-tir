'use client';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import { applyPackageContractDiscountToAmount } from '../../form/packageContractDiscount';
import attachStyles from './PackageEstimateAttach.module.css';
import type { PackageEstimateTabProps } from './PackageEstimateTab';
import { PackageEstimateSignaturesBlock, formatPackageMoneyValue } from './estimateTabUi';

export type PackageEstimateMergedSheetProps = Pick<
  PackageEstimateTabProps,
  | 'form'
  | 'isProductDirectionPackage'
  | 'estimateAppendixContractRef'
  | 'selectedEstimateSections'
  | 'contractDiscountPercentParsed'
  | 'estimatePrintSheetRef'
>;

export function PackageEstimateMergedSheet({
  form,
  isProductDirectionPackage,
  estimateAppendixContractRef,
  selectedEstimateSections,
  contractDiscountPercentParsed,
  estimatePrintSheetRef,
}: PackageEstimateMergedSheetProps) {
  return (
    <div
      className={`${cdEstimateTab.field} ${cdEstimateTab.fieldSpanAll} ${attachStyles.estimateSheetField}`}
    >
      <label>Содержимое объединённой сметы</label>
      <div className={`${cdDocPreview.estimateA4Wrap} ${cdEstimateTab.estimateA4Wrap}`}>
        <article
          ref={estimatePrintSheetRef}
          className={cdDocPreview.estimateA4Sheet}
          data-print-target="estimate-sheet"
        >
          <p className={cdDocPreview.estimateA4AppendixRef}>
            Приложение №{isProductDirectionPackage ? 2 : 1} к договору №{' '}
            {estimateAppendixContractRef.num} от {estimateAppendixContractRef.date}
          </p>
          {(form.estimate.snapshot?.rooms?.length ?? 0) > 0 ? (
            <>
              <h4 className={cdDocPreview.estimateA4Title}>
                {isProductDirectionPackage ? 'Счёт-заказ на работы.' : 'Смета работ'}
              </h4>
              {selectedEstimateSections.length > 0 ? (
                selectedEstimateSections.map((section) => (
                  <section
                    key={section.categoryName}
                    className={cdDocPreview.estimateA4CategorySection}
                  >
                    <p className={cdDocPreview.estimateA4Meta}>
                      Категория работ: <strong>{section.categoryName}</strong>
                      ;&nbsp;&nbsp;&nbsp;&nbsp;Помещений: {section.rooms.length}
                    </p>
                    {section.rooms.map((room, roomIndex) => (
                      <section
                        key={`${section.categoryName}-${room.name}-${roomIndex}`}
                        className={cdDocPreview.estimateA4Room}
                      >
                        <div className={cdDocPreview.estimateA4RoomHeader}>
                          <span>
                            {roomIndex + 1}. {room.name}
                          </span>
                          <strong>{formatPackageMoneyValue(room.total)} руб.</strong>
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
                              <tr key={`${line.name}-${lineIndex}`}>
                                <td>{lineIndex + 1}</td>
                                <td>{line.name}</td>
                                <td>{line.unit}</td>
                                <td>{line.quantity}</td>
                                <td>{formatPackageMoneyValue(line.price)}</td>
                                <td>{formatPackageMoneyValue(line.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </section>
                    ))}
                  </section>
                ))
              ) : (
                <p className={cdDocPreview.estimateA4Meta}>
                  Категория работ: <strong>—</strong>
                  ;&nbsp;&nbsp;&nbsp;&nbsp;Помещений: {form.estimate.snapshot?.rooms.length ?? 0}
                </p>
              )}
              <section className={cdDocPreview.estimateA4Summary}>
                {selectedEstimateSections.length > 0 ? (
                  <>
                    <h5 className={cdDocPreview.estimateA4SummaryTitle}>Итоги по категориям</h5>
                    <ul className={cdDocPreview.estimateA4SummaryList}>
                      {selectedEstimateSections.map((section) => {
                        const categoryTotal = section.rooms.reduce(
                          (sum, room) => sum + room.total,
                          0
                        );
                        return (
                          <li key={`category-summary-${section.categoryName}`}>
                            <span>{section.categoryName}</span>
                            <strong>{formatPackageMoneyValue(categoryTotal)} руб.</strong>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : null}
              </section>
              {contractDiscountPercentParsed > 0 ? (
                <>
                  <p className={cdDocPreview.estimateA4Total}>
                    {isProductDirectionPackage
                      ? 'Итого по счёт-заказу (без скидки):'
                      : 'Итого по смете (без скидки):'}{' '}
                    <strong>
                      {formatPackageMoneyValue(form.estimate.snapshot?.total ?? 0)} руб.
                    </strong>
                  </p>
                  <p className={cdDocPreview.estimateA4DiscountMeta}>
                    Скидка по договору: {String(contractDiscountPercentParsed).replace('.', ',')}%
                  </p>
                  <p className={cdDocPreview.estimateA4Total}>
                    Итого со скидкой:{' '}
                    <strong>
                      {formatPackageMoneyValue(
                        applyPackageContractDiscountToAmount(
                          form.estimate.snapshot?.total ?? 0,
                          contractDiscountPercentParsed
                        )
                      )}{' '}
                      руб.
                    </strong>
                  </p>
                </>
              ) : (
                <p className={cdDocPreview.estimateA4Total}>
                  {isProductDirectionPackage ? 'Итого по счёту-заказу:' : 'Итого по смете:'}{' '}
                  <strong>
                    {formatPackageMoneyValue(form.estimate.snapshot?.total ?? 0)} руб.
                  </strong>
                </p>
              )}
              <PackageEstimateSignaturesBlock
                directorName={form.executor.directorName}
                customerFullName={form.customer.fullName}
              />
              <div className={cdDocPreview.estimateA4HandwritingNote}>
                <p className={cdDocPreview.estimateA4HandwritingNoteLabel}>Примечание:</p>
                <div className={cdDocPreview.estimateA4HandwritingLines} aria-hidden>
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className={cdDocPreview.estimateA4HandwritingLine} />
                  ))}
                </div>
              </div>
              <PackageEstimateSignaturesBlock
                directorName={form.executor.directorName}
                customerFullName={form.customer.fullName}
              />
            </>
          ) : (
            <p className={cdDocPreview.estimateA4Empty}>Расчёты не прикреплены.</p>
          )}
        </article>
      </div>
    </div>
  );
}
