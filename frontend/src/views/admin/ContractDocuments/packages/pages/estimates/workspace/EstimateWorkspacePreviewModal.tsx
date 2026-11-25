'use client';

import { useEffect, useMemo, useState } from 'react';

import { Modal } from '@/shared/ui/Modal';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import type { EstimateSnapshotRoom } from '../../../platform/estimates/applyEstimatePresetIds';
import {
  type EstimatePreviewGroupMode,
  buildEstimateRoomSections,
  readStoredEstimatePreviewGroupMode,
  storeEstimatePreviewGroupMode,
  subscribeEstimatePreviewGroupMode,
} from '../../../platform/estimates/estimatePreviewGrouping';
import { formatMoneyWholeGrouped } from '../../../platform/form/moneyWhole';
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
};

/** Таблица позиций одного помещения (снимка категории) — общая для обоих вариантов отображения. */
function EstimatePreviewLinesTable({ lines }: { lines: EstimateSnapshotRoom['lines'] }) {
  return (
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
        {lines.map((line, lineIndex) => (
          <tr key={`${line.name}-${lineIndex}`}>
            <td>{lineIndex + 1}</td>
            <td>{line.name}</td>
            <td>{line.unit}</td>
            <td>{line.quantity}</td>
            <td>{formatMoneyWholeGrouped(line.price)}</td>
            <td>{formatMoneyWholeGrouped(line.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Предпросмотр расчёта в виде объединённой сметы/счёт-заказа договора — тот же лист A4,
 * что на вкладке «Смета» / «Счёт-заказ» после прикрепления расчёта (без номера договора:
 * он появится в пакете).
 *
 * Вариант отображения (по умолчанию — первично по помещениям): переключатель над листом,
 * выбор запоминается и применяется к предпросмотрам в этом разделе.
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
}: EstimateWorkspacePreviewModalProps) {
  const [groupMode, setGroupMode] = useState<EstimatePreviewGroupMode>(() =>
    readStoredEstimatePreviewGroupMode()
  );

  // Синхронизация с переключателем на вкладке «Смета» пакета (и другими экземплярами).
  useEffect(() => subscribeEstimatePreviewGroupMode(setGroupMode), []);

  const roomSections = useMemo(
    () => (model ? buildEstimateRoomSections(model.sections) : []),
    [model]
  );

  const selectGroupMode = (mode: EstimatePreviewGroupMode) => {
    setGroupMode(mode);
    storeEstimatePreviewGroupMode(mode);
  };

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
            <div className={previewStyles.topBar}>
              <p className={previewStyles.hint}>
                Вид — как у прикреплённого расчёта на вкладке «Смета» (для ремонта) или «Счёт-заказ»
                (продуктовое направление) договора. Номер договора и скидка появятся после
                прикрепления расчёта к пакету.
              </p>
              <div
                className={previewStyles.modeSwitch}
                role="group"
                aria-label="Вариант отображения сметы"
              >
                <button
                  type="button"
                  className={
                    groupMode === 'byRooms'
                      ? `${previewStyles.modeSwitchButton} ${previewStyles.modeSwitchButtonActive}`
                      : previewStyles.modeSwitchButton
                  }
                  aria-pressed={groupMode === 'byRooms'}
                  onClick={() => selectGroupMode('byRooms')}
                >
                  Первично по помещениям
                </button>
                <button
                  type="button"
                  className={
                    groupMode === 'byCategories'
                      ? `${previewStyles.modeSwitchButton} ${previewStyles.modeSwitchButtonActive}`
                      : previewStyles.modeSwitchButton
                  }
                  aria-pressed={groupMode === 'byCategories'}
                  onClick={() => selectGroupMode('byCategories')}
                >
                  Первично по категориям
                </button>
              </div>
            </div>
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
                {groupMode === 'byRooms' && roomSections.length > 0 ? (
                  roomSections.map((roomSection, roomIndex) => (
                    <section
                      key={`${roomSection.roomName}-${roomIndex}`}
                      className={cdDocPreview.estimateA4CategorySection}
                    >
                      <p className={cdDocPreview.estimateA4Meta}>
                        Помещение: <strong>{roomSection.roomName}</strong>
                        ;&nbsp;&nbsp;&nbsp;&nbsp;Категорий: {roomSection.categories.length}
                      </p>
                      {roomSection.categories.map((block, blockIndex) => (
                        <section
                          key={`${roomSection.roomName}-${block.categoryName}-${blockIndex}`}
                          className={cdDocPreview.estimateA4Room}
                        >
                          <div
                            className={`${cdDocPreview.estimateA4RoomHeader} ${cdDocPreview.estimateA4SecondaryRoomHeader}`}
                          >
                            <span>
                              {blockIndex + 1}. {block.categoryName}
                            </span>
                            <strong>{formatMoneyWholeGrouped(block.room.total)} руб.</strong>
                          </div>
                          <EstimatePreviewLinesTable lines={block.room.lines} />
                        </section>
                      ))}
                    </section>
                  ))
                ) : model.sections.length > 0 ? (
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
                          <div
                            className={`${cdDocPreview.estimateA4RoomHeader} ${cdDocPreview.estimateA4SecondaryRoomHeader}`}
                          >
                            <span>
                              {roomIndex + 1}. {room.name}
                            </span>
                            <strong>{formatMoneyWholeGrouped(room.total)} руб.</strong>
                          </div>
                          <EstimatePreviewLinesTable lines={room.lines} />
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
                  {groupMode === 'byRooms' && roomSections.length > 0 ? (
                    <>
                      <h5 className={cdDocPreview.estimateA4SummaryTitle}>Итоги по помещениям</h5>
                      <ul className={cdDocPreview.estimateA4SummaryList}>
                        {roomSections.map((roomSection, roomIndex) => (
                          <li key={`room-summary-${roomSection.roomName}-${roomIndex}`}>
                            <span>{roomSection.roomName}</span>
                            <strong>{formatMoneyWholeGrouped(roomSection.total)} руб.</strong>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : model.sections.length > 0 ? (
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
                              <strong>{formatMoneyWholeGrouped(categoryTotal)} руб.</strong>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : null}
                </section>
                <p className={cdDocPreview.estimateA4Total}>
                  Итого по смете:{' '}
                  <strong>{formatMoneyWholeGrouped(model.snapshot.total)} руб.</strong>
                </p>
              </article>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
