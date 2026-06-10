'use client';

import type { RefObject } from 'react';

import Link from 'next/link';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import cdHub from '../../../styles/contracts-list-hub.module.css';
import cdDocPreview from '../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import type { EstimateEmbedSection } from '../estimates/packageEstimateDocPrintEmbedHtml';
import { applyPackageContractDiscountToAmount } from '../form/packageContractDiscount';
import type { PackageFormData } from '../form/packageForm';
import {
  PACKAGE_BLOCK,
  PACKAGE_DATA_COMPACT,
  PACKAGE_FORM_GRID,
  PACKAGE_HINT,
  PACKAGE_SECTION_CARD,
  PACKAGE_SECTION_FIELDS,
  PACKAGE_SECTION_HEADER,
  PACKAGE_SECTION_TITLE,
  PACKAGE_SECTION_TITLE_MAIN,
  PACKAGE_TAB_COMPACT,
} from '../ui/packageTabClassNames';
import attachStyles from './PackageEstimateAttach.module.css';
import { PackageEstimateSignaturesBlock, formatPackageMoneyValue } from './estimateTabUi';
import { PackageLockNotice, packageLockNoticeMessage } from './packageLockNoticeUi';

const ESTIMATE_TAB_COMPACT = PACKAGE_TAB_COMPACT;
const ESTIMATE_BLOCK = PACKAGE_BLOCK;
const ESTIMATE_DATA_COMPACT = PACKAGE_DATA_COMPACT;
const ESTIMATE_FORM_GRID = PACKAGE_FORM_GRID;
const ESTIMATE_SECTION_CARD = PACKAGE_SECTION_CARD;
const ESTIMATE_SECTION_FIELDS = PACKAGE_SECTION_FIELDS;
const ESTIMATE_SECTION_HEADER = PACKAGE_SECTION_HEADER;
const ESTIMATE_SECTION_TITLE = PACKAGE_SECTION_TITLE;
const ESTIMATE_SECTION_TITLE_MAIN = PACKAGE_SECTION_TITLE_MAIN;
const ESTIMATE_HINT = PACKAGE_HINT;
const ESTIMATE_TAB_HINT = `${ESTIMATE_HINT} ${attachStyles.estimateTabHint}`;

export type EstimateUsageEntry = { contractNumber: string; contractDate: string };

export type PackageEstimateTabProps = {
  form: PackageFormData;
  contractAndEstimateLocked: boolean;
  isProductDirectionPackage: boolean;
  linkedCrmCustomerId: string | null;
  estimateAppendixContractRef: { num: string; date: string };
  contractEstimateObjectKey: string;
  estimateAttachGroupKey: string;
  setEstimateAttachGroupKey: React.Dispatch<React.SetStateAction<string>>;
  estimatePresetToAttach: string;
  setEstimatePresetToAttach: React.Dispatch<React.SetStateAction<string>>;
  attachEstimatePickMeta: {
    hasUngrouped: boolean;
    groupsOrdered: ContractEstimateGroup[];
  };
  attachableForSelectedGroup: ContractEstimatePreset[];
  attachableEstimatePresets: ContractEstimatePreset[];
  estimatePresets: ContractEstimatePreset[];
  estimateUsageById: Map<string, EstimateUsageEntry[]>;
  draggingEstimatePresetId: string | null;
  setDraggingEstimatePresetId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedEstimateSections: EstimateEmbedSection[];
  contractDiscountPercentParsed: number;
  estimatePrintSheetRef: RefObject<HTMLElement | null>;
  onEstimateObjectChange: (groupKey: string) => void;
  onAttachPreset: (presetId: string) => void;
  onMovePreset: (sourceId: string, targetId: string) => void;
  onRemovePreset: (presetId: string) => void;
};

export function PackageEstimateTab({
  form,
  contractAndEstimateLocked,
  isProductDirectionPackage,
  linkedCrmCustomerId,
  estimateAppendixContractRef,
  contractEstimateObjectKey,
  estimateAttachGroupKey,
  setEstimateAttachGroupKey,
  estimatePresetToAttach,
  setEstimatePresetToAttach,
  attachEstimatePickMeta,
  attachableForSelectedGroup,
  attachableEstimatePresets,
  estimatePresets,
  estimateUsageById,
  draggingEstimatePresetId,
  setDraggingEstimatePresetId,
  selectedEstimateSections,
  contractDiscountPercentParsed,
  estimatePrintSheetRef,
  onEstimateObjectChange,
  onAttachPreset,
  onMovePreset,
  onRemovePreset,
}: PackageEstimateTabProps) {
  return (
    <div
      className={`${ESTIMATE_BLOCK} ${ESTIMATE_DATA_COMPACT} ${ESTIMATE_TAB_COMPACT}${isProductDirectionPackage ? ` ${cdProduct.windowsContractTabTypography}` : ''}`}
    >
      <div className={ESTIMATE_FORM_GRID}>
        <div className={ESTIMATE_SECTION_CARD}>
          {contractAndEstimateLocked ? (
            <PackageLockNotice>
              {packageLockNoticeMessage('estimate', {
                productDirection: isProductDirectionPackage,
              })}
            </PackageLockNotice>
          ) : null}
          <div className={ESTIMATE_SECTION_HEADER}>
            <h3 className={`${ESTIMATE_SECTION_TITLE} ${ESTIMATE_SECTION_TITLE_MAIN}`}>
              {isProductDirectionPackage ? 'Счёт-заказ' : 'Смета'}
            </h3>
          </div>
          <p className={ESTIMATE_HINT} style={{ marginTop: 0 }}>
            {isProductDirectionPackage
              ? 'Прикрепляются расчёты заказчика из раздела «Расчёты» (тот же, что выбран в блоке «Данные»). Объект выбирается здесь: все расчёты счёта-заказа должны относиться к одному объекту. После первого прикрепления объект фиксируется.'
              : 'Объект выбирается только здесь: все расчёты основной сметы и доп. соглашений должны относиться к одному объекту. После первого прикреплённого расчёта объект фиксируется автоматически.'}
          </p>
          {isProductDirectionPackage &&
          !linkedCrmCustomerId?.trim() &&
          !contractAndEstimateLocked ? (
            <p className={ESTIMATE_TAB_HINT} role="status">
              Сначала выберите заказчика в блоке «Поиск заказчика в базе» на вкладке «Данные» —
              тогда появятся его расчёты для прикрепления.
            </p>
          ) : null}
          <div className={ESTIMATE_SECTION_FIELDS}>
            <div
              className={`${attachStyles.estimatePickAndAttachedRow} ${cdEstimateTab.fieldSpanAll}`}
            >
              <div className={attachStyles.estimatePickColumn}>
                <div className={attachStyles.estimateSelectsRow}>
                  <div className={cdEstimateTab.field}>
                    <label htmlFor="estimate_group_select">Объект</label>
                    <select
                      id="estimate_group_select"
                      value={
                        (form.estimate.selectedPresetIds?.length ?? 0) > 0
                          ? contractEstimateObjectKey
                          : estimateAttachGroupKey
                      }
                      disabled={
                        contractAndEstimateLocked ||
                        (form.estimate.selectedPresetIds?.length ?? 0) > 0
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setEstimateAttachGroupKey(v);
                        setEstimatePresetToAttach('');
                        if (
                          !contractAndEstimateLocked &&
                          (form.estimate.selectedPresetIds?.length ?? 0) === 0
                        ) {
                          onEstimateObjectChange(v);
                        }
                      }}
                    >
                      <option value="">— объект —</option>
                      {attachEstimatePickMeta.hasUngrouped ? (
                        <option value="__ungrouped__">Вне объекта</option>
                      ) : null}
                      {attachEstimatePickMeta.groupsOrdered.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={cdEstimateTab.field}>
                    <label htmlFor="estimate_select">Расчёт</label>
                    <select
                      id="estimate_select"
                      value={estimatePresetToAttach}
                      disabled={
                        contractAndEstimateLocked ||
                        !((form.estimate.selectedPresetIds?.length ?? 0) > 0
                          ? contractEstimateObjectKey
                          : estimateAttachGroupKey || contractEstimateObjectKey)
                      }
                      onChange={(e) => setEstimatePresetToAttach(e.target.value)}
                    >
                      <option value="">
                        {(form.estimate.selectedPresetIds?.length ?? 0) > 0
                          ? '— расчёт —'
                          : estimateAttachGroupKey || contractEstimateObjectKey
                            ? '— расчёт —'
                            : '— сначала выберите объект —'}
                      </option>
                      {attachableForSelectedGroup.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.title} · {preset.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={attachStyles.estimateAttachBlock}>
                  <div className={attachStyles.estimateAttachActionsRow}>
                    <button
                      type="button"
                      className={`${cdWorkspace.primaryBtn} ${attachStyles.estimateAttachPrimaryBtn}`}
                      disabled={contractAndEstimateLocked || !estimatePresetToAttach}
                      onClick={() => {
                        onAttachPreset(estimatePresetToAttach);
                        setEstimatePresetToAttach('');
                      }}
                    >
                      Прикрепить
                    </button>
                  </div>
                  {attachableEstimatePresets.length === 0 ? (
                    <p className={ESTIMATE_TAB_HINT}>
                      {isProductDirectionPackage && !linkedCrmCustomerId?.trim()
                        ? 'Выберите заказчика на вкладке «Данные».'
                        : isProductDirectionPackage
                          ? 'Нет свободных расчётов этого заказчика для прикрепления (проверьте раздел «Расчёты» и статус «В работе»).'
                          : 'Нет свободных расчётов для прикрепления.'}
                    </p>
                  ) : (
                    <p className={ESTIMATE_TAB_HINT}>
                      Сначала объект, затем расчёт → «Прикрепить». Нельзя смешивать расчёты разных
                      объектов. Справа — порядок{' '}
                      {isProductDirectionPackage ? 'в счёте-заказе' : 'в смете'} (перетаскивание).
                    </p>
                  )}
                </div>
              </div>
              <aside className={attachStyles.estimateAttachedColumn}>
                <div className={attachStyles.estimateAttachedColumnTitle}>Прикреплённые</div>
                {(form.estimate.selectedPresetIds?.length ?? 0) > 0 ? (
                  <div className={attachStyles.estimateAttachedPresetList}>
                    {(form.estimate.selectedPresetIds ?? []).map((presetId) => {
                      const preset = estimatePresets.find((x) => x.id === presetId);
                      const usageCount = estimateUsageById.get(presetId)?.length ?? 0;
                      return (
                        <div
                          key={presetId}
                          draggable={!contractAndEstimateLocked}
                          onDragStart={() => {
                            if (!contractAndEstimateLocked) setDraggingEstimatePresetId(presetId);
                          }}
                          onDragEnd={() => setDraggingEstimatePresetId(null)}
                          onDragOver={(e) => {
                            if (!contractAndEstimateLocked) e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (contractAndEstimateLocked) return;
                            if (draggingEstimatePresetId) {
                              onMovePreset(draggingEstimatePresetId, presetId);
                            }
                            setDraggingEstimatePresetId(null);
                          }}
                          className={attachStyles.estimateAttachedPresetRow}
                          style={{
                            opacity: draggingEstimatePresetId === presetId ? 0.6 : 1,
                          }}
                        >
                          <div className={attachStyles.estimateAttachedPresetMain}>
                            <strong>{preset?.title ?? presetId}</strong>
                            <span className={attachStyles.estimateAttachedPresetMeta}>
                              {' '}
                              · {preset?.categoryName ?? '—'}
                              {usageCount > 0 ? ` · ещё в пакетах: ${usageCount}` : null}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={`${cdWorkspace.secondaryBtn} ${attachStyles.estimateAttachedRemoveBtn}`}
                            aria-label="Убрать расчёт из сметы"
                            title="Убрать"
                            disabled={contractAndEstimateLocked}
                            onClick={() => onRemovePreset(presetId)}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={attachStyles.estimateAttachedEmpty}>Пока нет</p>
                )}
              </aside>
            </div>
            {form.estimate.selectedPresetIds?.length &&
            !(form.estimate.selectedPresetIds ?? []).every(
              (id) => (estimateUsageById.get(id)?.length ?? 0) === 0
            ) ? (
              <p className={`${ESTIMATE_TAB_HINT} ${attachStyles.estimateTabHintFullWidth}`}>
                Часть расчётов уже прикреплена в других пакетах:{' '}
                {[
                  ...new Set(
                    (form.estimate.selectedPresetIds ?? [])
                      .flatMap((id) => estimateUsageById.get(id) ?? [])
                      .map((u) => `№ ${u.contractNumber} от ${u.contractDate}`)
                  ),
                ].join('; ')}
              </p>
            ) : null}
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
                          ;&nbsp;&nbsp;&nbsp;&nbsp;Помещений:{' '}
                          {form.estimate.snapshot?.rooms.length ?? 0}
                        </p>
                      )}
                      <section className={cdDocPreview.estimateA4Summary}>
                        {selectedEstimateSections.length > 0 ? (
                          <>
                            <h5 className={cdDocPreview.estimateA4SummaryTitle}>
                              Итоги по категориям
                            </h5>
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
                            Скидка по договору:{' '}
                            {String(contractDiscountPercentParsed).replace('.', ',')}%
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
                          {isProductDirectionPackage ? 'Итого по счёт-заказу:' : 'Итого по смете:'}{' '}
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
            <p
              className={`${ESTIMATE_HINT} ${cdEstimateTab.fieldSpanAll} ${attachStyles.estimateTabHintFullWidth}`}
            >
              Создание и редактирование расчётов выполняется в разделе{' '}
              <Link className={cdHub.link} href="/admin/contract-documents/estimates">
                «Расчёты»
              </Link>
              . В таблице сметы суммы по строкам — без скидки по договору; скидка показывается
              только в итоговом блоке. Стоимость позиций со скидкой — в «Заказ-наряды» → «Итог.
              заказ-наряд».
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
