'use client';

import { Modal } from '@/shared/ui/Modal';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import {
  PackageEstimateSignaturesBlock,
  formatPackageMoneyValue,
} from '../../../platform/editor/estimateTab/estimateTabUi';
import previewStyles from './EstimateWorkspacePreviewModal.module.css';
import type { EstimateWorkspacePreviewModel } from './estimateWorkspacePreview';

export type EstimateWorkspacePreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  model: EstimateWorkspacePreviewModel | null;
  estimateName: string;
  customerName: string;
  objectAddress: string;
  /** Директор из карточек подписантов — для блока подписей как в договоре. */
  directorName: string;
};

/**
 * Предпросмотр расчёта в виде объединённой сметы/счёт-заказа договора — тот же лист A4,
 * что на вкладке «Смета» / «Счёт-заказ» после прикрепления расчёта (без номера договора:
 * он появится в пакете).
 */
export function EstimateWorkspacePreviewModal({
  isOpen,
  onClose,
  loading,
  error,
  model,
  estimateName,
  customerName,
  objectAddress,
  directorName,
}: EstimateWorkspacePreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Предпросмотр расчёта" size="xl" alignTop>
      <div className={previewStyles.shell}>
        {loading ? (
          <p className={cdDocPreview.hint}>
            Собираем предпросмотр — цены позиций запрашиваются у калькулятора…
          </p>
        ) : error ? (
          <p className={cdDocPreview.hint}>{error}</p>
        ) : model ? (
          <>
            <p className={previewStyles.hint}>
              Вид — как у прикреплённого расчёта на вкладке «Смета» (для ремонта) или «Счёт-заказ»
              (продуктовое направление) договора. Номер договора и скидка появятся после
              прикрепления расчёта к пакету.
            </p>
            <div className={cdDocPreview.estimateA4Wrap}>
              <article
                className={`${cdDocPreview.estimateA4Sheet} ${previewStyles.sheet}`}
                data-estimate-preview-sheet
              >
                <p className={cdDocPreview.estimateA4AppendixRef}>
                  Расчёт: {estimateName.trim() || 'без названия'}
                </p>
                <h4 className={cdDocPreview.estimateA4Title}>Смета работ</h4>
                <p className={cdDocPreview.estimateA4Meta}>
                  Заказчик: <strong>{customerName.trim() || '—'}</strong>
                </p>
                <p className={cdDocPreview.estimateA4Meta}>
                  Объект: <strong>{objectAddress.trim() || '—'}</strong>
                </p>
                {model.sections.length > 0 ? (
                  model.sections.map((section) => (
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
                    ;&nbsp;&nbsp;&nbsp;&nbsp;Помещений: {model.snapshot.rooms.length}
                  </p>
                )}
                <section className={cdDocPreview.estimateA4Summary}>
                  {model.sections.length > 0 ? (
                    <>
                      <h5 className={cdDocPreview.estimateA4SummaryTitle}>Итоги по категориям</h5>
                      <ul className={cdDocPreview.estimateA4SummaryList}>
                        {model.sections.map((section) => {
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
                <p className={cdDocPreview.estimateA4Total}>
                  Итого по смете:{' '}
                  <strong>{formatPackageMoneyValue(model.snapshot.total)} руб.</strong>
                </p>
                <PackageEstimateSignaturesBlock
                  directorName={directorName || '—'}
                  customerFullName={customerName.trim() || '—'}
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
                  directorName={directorName || '—'}
                  customerFullName={customerName.trim() || '—'}
                />
              </article>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
