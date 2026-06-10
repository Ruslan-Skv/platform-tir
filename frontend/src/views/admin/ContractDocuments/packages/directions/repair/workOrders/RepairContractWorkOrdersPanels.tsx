'use client';

import { useMemo } from 'react';

import cdBase from '../../../../styles/base.module.css';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdInteractiveEstimate from '../../../../styles/interactive-estimate.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import cdWindows from '../../../../styles/windows-package.module.css';
import { useRepairContractWorkOrderHub } from '../../../shared/hub/RepairContractWorkOrderHubContext';
import { isRepairWorkOrderAddendumTab } from '../documents/repairDocumentTabs';
import { RepairInteractiveInstallerPicker } from './RepairInteractiveInstallerPicker';
import { RepairWorkOrderGradeButtons } from './RepairWorkOrderGradeButtons';
import type { RepairWorkOrderHubTabId } from './repairWorkOrderHubTabs';

const WO_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdWindows.estimateTabCompact}`;
const WO_BLOCK = `${cdDataTab.blockData} ${cdWindows.blockData}`;
const WO_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact}`;
const WO_FORM_GRID = `${cdDataTab.formGrid} ${cdWindows.formGrid}`;
const WO_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
const WO_SECTION_TITLE = cdEstimateTab.sectionTitle;
const WO_SECTION_TITLE_MAIN = `${cdTemplates.estimateSectionTitle} ${cdEstimateTab.estimateSectionTitle}`;
const WO_HINT = `${cdDocPreview.hint} ${cdTemplates.hint}`;
const WO_A4_WRAP = `${cdDocPreview.estimateA4Wrap} ${cdEstimateTab.estimateA4Wrap}`;
const WO_INTERACTIVE_TAB = `${cdInteractiveEstimate.interactiveFinalEstimateTab} ${cdBase.interactiveFinalEstimateTab}`;

function woPanelRootClass(isWindowsPackage: boolean, extra = ''): string {
  const windowsTypography = isWindowsPackage ? ` ${cdWindows.windowsContractTabTypography}` : '';
  const extraClass = extra ? ` ${extra}` : '';
  return `${WO_BLOCK} ${WO_DATA_COMPACT} ${WO_TAB_COMPACT}${windowsTypography}${extraClass}`;
}

function interactiveEstimateRowClassName(
  installerId: string,
  activeRepairInstallerId: string,
  rowStyles: typeof cdEstimatesList
): string {
  const parts = [rowStyles.interactiveEstimateRow];
  if (!installerId) {
    parts.push(rowStyles.interactiveEstimateRowUnassigned);
  } else {
    parts.push(rowStyles.interactiveEstimateRowAssigned);
    if (activeRepairInstallerId && installerId === activeRepairInstallerId) {
      parts.push(rowStyles.interactiveEstimateRowActiveInstaller);
    }
  }
  return parts.join(' ');
}

export type RepairContractWorkOrdersPanelsProps = {
  panelTab: RepairWorkOrderHubTabId;
};

export function RepairContractWorkOrdersPanels({ panelTab }: RepairContractWorkOrdersPanelsProps) {
  const ctx = useRepairContractWorkOrderHub();
  const {
    isWindowsPackage,
    form,
    updateWorkOrder,
    getTemplatePreviewHtml,
    repairInstallers,
    selectedRepairInstallers,
    selectedRepairInstallersById,
    activeRepairInstallerId,
    addRepairInstallerToContract,
    removeRepairInstallerFromContract,
    setActiveRepairInstallerId,
    assignInstallerToFinalEstimateRow,
    assignInstallerToFinalEstimateRows,
    interactiveFinalEstimateSections,
    unassignedInteractiveRowsCount,
    activeFinalWorkOrderDocId,
    setActiveFinalWorkOrderDocId,
    finalWorkOrderComputed,
    finalWorkOrderCategorySections,
    perInstallerWorkOrders,
    activeInstallerWorkOrder,
    estimateAppendixContractRef,
    formatMoneyValue,
    formatMoneyRubShort,
    formatInstallerNameShort,
    formatInstallerGradeShort,
  } = ctx;

  const installerAssignedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const assignment of Object.values(form.finalEstimateInstallerAssignments ?? {})) {
      const installerId = assignment.installerId?.trim() ?? '';
      if (!installerId) continue;
      counts.set(installerId, (counts.get(installerId) ?? 0) + 1);
    }
    return counts;
  }, [form.finalEstimateInstallerAssignments]);

  const renderedDoc = getTemplatePreviewHtml(panelTab);

  if (panelTab === 'interactiveFinalEstimate') {
    return (
      <div className={woPanelRootClass(isWindowsPackage, WO_INTERACTIVE_TAB)}>
        <div className={WO_FORM_GRID}>
          <div className={WO_SECTION_CARD}>
            <div className={cdEstimatesList.interactiveEstimateTitleRow}>
              <h3 className={`${WO_SECTION_TITLE} ${WO_SECTION_TITLE_MAIN}`}>
                {isWindowsPackage ? 'Интерактивный счёт-заказ' : 'Интерактивная итоговая смета'}
              </h3>
              <span
                className={`${cdEstimatesList.interactiveUnassignedBadge} ${
                  unassignedInteractiveRowsCount === 0
                    ? cdEstimatesList.interactiveUnassignedBadgeDone
                    : cdEstimatesList.interactiveUnassignedBadgePending
                }`}
                title="Количество неприкреплённых позиций"
              >
                {unassignedInteractiveRowsCount}
              </span>
            </div>
            <RepairInteractiveInstallerPicker
              allInstallers={repairInstallers}
              emptyListHint={
                isWindowsPackage
                  ? 'Нет мастеров по направлению «Окна». Добавьте их в CRM → Мастера.'
                  : undefined
              }
              selectedInstallers={selectedRepairInstallers}
              activeInstallerId={activeRepairInstallerId}
              installerAssignedCounts={installerAssignedCounts}
              onAddInstaller={addRepairInstallerToContract}
              onRemoveInstaller={removeRepairInstallerFromContract}
              onActivateInstaller={setActiveRepairInstallerId}
              formatInstallerGradeShort={formatInstallerGradeShort}
            />

            {interactiveFinalEstimateSections.length === 0 ? (
              <p className={cdDocPreview.estimateA4Empty}>Нет данных для назначения мастеров.</p>
            ) : (
              interactiveFinalEstimateSections.map((section) => (
                <section
                  key={`interactive-section-${section.categoryName}`}
                  className={`${cdDocPreview.estimateA4CategorySection} ${cdEstimatesList.interactiveEstimateCategorySection}`}
                >
                  {(() => {
                    const sectionRowKeys = section.rooms.flatMap((room) =>
                      room.lines.map((line) => line.key)
                    );
                    const isSectionAssignedToActive =
                      Boolean(activeRepairInstallerId) &&
                      sectionRowKeys.length > 0 &&
                      sectionRowKeys.every(
                        (rowKey) =>
                          form.finalEstimateInstallerAssignments[rowKey]?.installerId ===
                          activeRepairInstallerId
                      );
                    return (
                      <div className={cdEstimatesList.interactiveEstimateCategoryHeader}>
                        <p
                          className={`${cdDocPreview.estimateA4Meta} ${cdEstimatesList.interactiveEstimateCategoryMeta}`}
                        >
                          Категория работ: <strong>{section.categoryName}</strong>
                          ;&nbsp;&nbsp;&nbsp;&nbsp;Помещений: {section.rooms.length}
                        </p>
                        <button
                          type="button"
                          className={`${cdWorkspace.secondaryBtn} ${cdEstimatesList.interactiveEstimateAssignBtn}`}
                          disabled={!activeRepairInstallerId}
                          onClick={() =>
                            assignInstallerToFinalEstimateRows(
                              sectionRowKeys,
                              activeRepairInstallerId
                            )
                          }
                        >
                          {isSectionAssignedToActive
                            ? 'Снять активного с категории'
                            : 'Назначить активного на категорию'}
                        </button>
                      </div>
                    );
                  })()}
                  {section.rooms.map((room, roomIndex) => (
                    <section
                      key={`interactive-room-${section.categoryName}-${room.name}-${roomIndex}`}
                      className={`${cdDocPreview.estimateA4Room} ${cdEstimatesList.interactiveEstimateRoom}`}
                    >
                      <div
                        className={`${cdDocPreview.estimateA4RoomHeader} ${cdEstimatesList.interactiveEstimateRoomHeader}`}
                      >
                        <span>
                          {roomIndex + 1}. {room.name}
                        </span>
                        <button
                          type="button"
                          className={`${cdWorkspace.secondaryBtn} ${cdEstimatesList.interactiveEstimateAssignBtn}`}
                          disabled={!activeRepairInstallerId}
                          onClick={() =>
                            assignInstallerToFinalEstimateRows(
                              room.lines.map((line) => line.key),
                              activeRepairInstallerId
                            )
                          }
                        >
                          {Boolean(activeRepairInstallerId) &&
                          room.lines.length > 0 &&
                          room.lines.every(
                            (line) =>
                              form.finalEstimateInstallerAssignments[line.key]?.installerId ===
                              activeRepairInstallerId
                          )
                            ? 'Снять активного с помещения'
                            : 'Назначить активного на помещение'}
                        </button>
                      </div>
                      <table
                        className={`${cdDocPreview.estimateA4Table} ${cdEstimatesList.interactiveEstimateTable}`}
                      >
                        <thead>
                          <tr>
                            <th>№</th>
                            <th>Работа</th>
                            <th>Кол-во</th>
                            <th className={cdEstimatesList.interactiveEstimateInstallerCol}>
                              Мастер
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {room.lines.map((line, lineIndex) => (
                            <tr
                              key={line.key}
                              className={interactiveEstimateRowClassName(
                                line.installerId,
                                activeRepairInstallerId,
                                cdEstimatesList
                              )}
                              onClick={() => {
                                if (!activeRepairInstallerId) return;
                                assignInstallerToFinalEstimateRow(
                                  line.key,
                                  activeRepairInstallerId
                                );
                              }}
                              title={
                                activeRepairInstallerId
                                  ? 'Нажмите, чтобы назначить активного мастера на позицию'
                                  : 'Сначала выберите активного мастера'
                              }
                            >
                              <td>{lineIndex + 1}</td>
                              <td>{line.workName}</td>
                              <td>{formatMoneyValue(line.quantity)}</td>
                              <td className={cdEstimatesList.interactiveEstimateInstallerCol}>
                                {line.installerId ? (
                                  <div className={cdEstimatesList.interactiveAssignedInstaller}>
                                    <span
                                      className={cdEstimatesList.interactiveAssignedInstallerName}
                                    >
                                      {selectedRepairInstallersById.get(line.installerId)
                                        ?.fullName ?? 'Назначен'}
                                    </span>
                                    <button
                                      type="button"
                                      className={`${cdWorkspace.secondaryBtn} ${cdEstimatesList.interactiveAssignedInstallerClearBtn}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        assignInstallerToFinalEstimateRow(line.key, '');
                                      }}
                                    >
                                      Снять
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    className={cdEstimatesList.interactiveEstimateUnassignedLabel}
                                  >
                                    Не назначен
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  ))}
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (panelTab === 'finalWorkOrder') {
    return (
      <div className={woPanelRootClass(isWindowsPackage)}>
        {!isWindowsPackage ? (
          <div
            className={`${WO_FORM_GRID} ${cdEstimatesList.workOrderParamsBar}`}
            style={{ gap: '2px 6px', display: 'flex', alignItems: 'flex-end', flexWrap: 'nowrap' }}
          >
            <RepairWorkOrderGradeButtons
              value={form.workOrder.gradeIncreasePercent}
              onChange={(gradeIncreasePercent) =>
                updateWorkOrder('gradeIncreasePercent', gradeIncreasePercent)
              }
            />
          </div>
        ) : null}
        <div className={WO_FORM_GRID}>
          <div className={WO_SECTION_CARD}>
            <h3 className={`${WO_SECTION_TITLE} ${WO_SECTION_TITLE_MAIN}`}>Итоговый заказ-наряд</h3>
            <p className={WO_HINT} style={{ marginTop: 0 }}>
              {isWindowsPackage
                ? 'Формируется из счёт-заказа и доп. соглашений с учётом назначенных мастеров.'
                : 'Формируется из итоговой сметы: включает все проводимые работы по основной смете и доп. соглашениям, с вычетом работ из блока «Непроводимые ремонтно-отделочные работы».'}
            </p>
            <div
              className={cdChrome.tabBar}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}
            >
              <button
                type="button"
                className={`${cdChrome.tab} ${activeFinalWorkOrderDocId === 'common' ? cdChrome.tabActive : ''}`}
                onClick={() => setActiveFinalWorkOrderDocId('common')}
              >
                Общий заказ-наряд
              </button>
              {perInstallerWorkOrders.map((doc) => (
                <button
                  key={doc.installer.id}
                  type="button"
                  className={`${cdChrome.tab} ${
                    activeFinalWorkOrderDocId === doc.installer.id ? cdChrome.tabActive : ''
                  }`}
                  onClick={() => setActiveFinalWorkOrderDocId(doc.installer.id)}
                >
                  {formatInstallerNameShort(doc.installer.fullName)}
                  {!isWindowsPackage ? ` (${formatInstallerGradeShort(doc.installer.grade)})` : ''}
                </button>
              ))}
            </div>
            <div className={WO_A4_WRAP}>
              <article
                className={cdDocPreview.estimateA4Sheet}
                data-print-target="work-order-sheet"
              >
                <div className={cdDocPreview.estimateA4Meta} style={{ marginBottom: 10 }}>
                  <p style={{ margin: '0 0 3px' }}>
                    <strong>Договор:</strong> № {estimateAppendixContractRef.num} от{' '}
                    {estimateAppendixContractRef.date}
                  </p>
                  <p style={{ margin: '0 0 3px' }}>
                    <strong>Адрес:</strong> {form.object.objectAddress || '—'}
                  </p>
                  <p style={{ margin: '0 0 3px' }}>
                    <strong>Заказчик:</strong> {form.customer.fullName || '—'}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Телефон заказчика:</strong> {form.customer.phone || '—'}
                  </p>
                </div>
                {finalWorkOrderComputed.rooms.length === 0 ? (
                  <p className={cdDocPreview.estimateA4Empty}>
                    Нет данных для итогового заказ-наряда.
                  </p>
                ) : activeInstallerWorkOrder ? (
                  <>
                    <h4 className={cdDocPreview.estimateA4Title}>
                      Заказ-наряд мастера: {activeInstallerWorkOrder.installer.fullName}
                      {!isWindowsPackage
                        ? ` (${formatInstallerGradeShort(activeInstallerWorkOrder.installer.grade)})`
                        : ''}
                    </h4>
                    {activeInstallerWorkOrder.categories.map((section) => (
                      <section
                        key={`installer-doc-category-${activeInstallerWorkOrder.installer.id}-${section.categoryName}`}
                        className={cdDocPreview.estimateA4CategorySection}
                      >
                        <p className={cdDocPreview.estimateA4Meta}>
                          Категория работ: <strong>{section.categoryName}</strong>
                        </p>
                        {section.rooms.map((room, roomIndex) => (
                          <section
                            key={`installer-doc-room-${activeInstallerWorkOrder.installer.id}-${section.categoryName}-${room.name}-${roomIndex}`}
                            className={cdDocPreview.estimateA4Room}
                          >
                            <div className={cdDocPreview.estimateA4RoomHeader}>
                              <span>
                                {roomIndex + 1}. {room.name}
                              </span>
                              <strong>{formatMoneyValue(room.adjustedTotal)} руб.</strong>
                            </div>
                            <table className={cdDocPreview.estimateA4Table}>
                              <thead>
                                <tr>
                                  <th>№</th>
                                  <th>Вид работ</th>
                                  <th>Кол-во</th>
                                  {form.workOrder.showLineAmounts ? <th>Стоимость</th> : null}
                                </tr>
                              </thead>
                              <tbody>
                                {room.lines.map((line, lineIndex) => (
                                  <tr
                                    key={`${line.key}-installer-doc-${activeInstallerWorkOrder.installer.id}`}
                                  >
                                    <td>{lineIndex + 1}</td>
                                    <td>{line.workName}</td>
                                    <td>
                                      {formatMoneyValue(line.quantity)} {line.unit || ''}
                                    </td>
                                    {form.workOrder.showLineAmounts ? (
                                      <td>{formatMoneyValue(line.adjustedAmount)}</td>
                                    ) : null}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </section>
                        ))}
                      </section>
                    ))}
                    <p className={cdDocPreview.estimateA4Total}>
                      Итого по мастеру:{' '}
                      <strong>{formatMoneyValue(activeInstallerWorkOrder.total)} руб.</strong>
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className={cdDocPreview.estimateA4Title}>Итоговый заказ-наряд</h4>
                    {finalWorkOrderCategorySections.map((section) => (
                      <section
                        key={`final-work-order-category-${section.categoryName}`}
                        className={cdDocPreview.estimateA4CategorySection}
                      >
                        <p className={cdDocPreview.estimateA4Meta}>
                          Категория работ: <strong>{section.categoryName}</strong>
                        </p>
                        {section.rooms.map((room, roomIndex) => (
                          <section
                            key={`final-work-order-room-${section.categoryName}-${room.name}-${roomIndex}`}
                            className={cdDocPreview.estimateA4Room}
                          >
                            <div className={cdDocPreview.estimateA4RoomHeader}>
                              <span>
                                {roomIndex + 1}. {room.name}
                              </span>
                              <strong>{formatMoneyValue(room.adjustedTotal)} руб.</strong>
                            </div>
                            <table className={cdDocPreview.estimateA4Table}>
                              <thead>
                                <tr>
                                  <th>№</th>
                                  <th>Вид работ</th>
                                  <th>Кол-во</th>
                                  {form.workOrder.showLineAmounts ? <th>Стоимость</th> : null}
                                </tr>
                              </thead>
                              <tbody>
                                {room.lines.map((line, lineIndex) => (
                                  <tr key={`${room.name}-${line.workName}-wo-${lineIndex}`}>
                                    <td>{lineIndex + 1}</td>
                                    <td>{line.workName}</td>
                                    <td>
                                      {formatMoneyValue(line.quantity)} {line.unit || ''}
                                    </td>
                                    {form.workOrder.showLineAmounts ? (
                                      <td>{formatMoneyValue(line.adjustedAmount)}</td>
                                    ) : null}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </section>
                        ))}
                      </section>
                    ))}
                    <p className={cdDocPreview.estimateA4Total}>
                      Итого по итоговому заказ-наряду:{' '}
                      <strong>{formatMoneyValue(finalWorkOrderComputed.total)} руб.</strong>
                    </p>
                    {finalWorkOrderComputed.installerTotals.length > 0 ? (
                      <section className={cdDocPreview.estimateA4Room}>
                        <div className={cdDocPreview.estimateA4RoomHeader}>
                          <span>Итоги по мастерам</span>
                        </div>
                        <div className={cdDocPreview.estimateA4Meta}>
                          {finalWorkOrderComputed.installerTotals.map((row) => (
                            <p key={row.installer.id} style={{ margin: '0 0 4px' }}>
                              {formatInstallerNameShort(row.installer.fullName)}
                              {isWindowsPackage
                                ? ` (${row.lineCount} шт.) - ${formatMoneyRubShort(row.total)}руб.`
                                : ` (${formatInstallerGradeShort(row.installer.grade)}, ${row.lineCount} шт.) - ${formatMoneyRubShort(row.total)}руб.`}
                            </p>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </>
                )}
              </article>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (panelTab === 'workOrder' || isRepairWorkOrderAddendumTab(panelTab)) {
    return (
      <div className={woPanelRootClass(isWindowsPackage)}>
        <div
          className={`${WO_FORM_GRID} ${cdEstimatesList.workOrderParamsBar}`}
          style={{ gap: '2px 6px', display: 'flex', alignItems: 'flex-end', flexWrap: 'nowrap' }}
        >
          {!isWindowsPackage ? (
            <RepairWorkOrderGradeButtons
              value={form.workOrder.gradeIncreasePercent}
              onChange={(gradeIncreasePercent) =>
                updateWorkOrder('gradeIncreasePercent', gradeIncreasePercent)
              }
            />
          ) : null}
          <label
            className={`${cdEstimatesList.managerQuestionnaireNeedRow} ${cdEstimatesList.repairWorkOrderShowAmountsLabel}`}
            htmlFor="repair_work_order_show_amounts"
            style={{ margin: 0, fontSize: '0.74rem', whiteSpace: 'nowrap' }}
          >
            <input
              id="repair_work_order_show_amounts"
              type="checkbox"
              checked={form.workOrder.showLineAmounts}
              onChange={(e) => updateWorkOrder('showLineAmounts', e.target.checked)}
            />
            <span>Показывать стоимость в каждой позиции</span>
          </label>
        </div>
        <div className={WO_A4_WRAP}>
          <article className={cdDocPreview.estimateA4Sheet}>
            <div
              className={cdWindows.contractA4Preview}
              dangerouslySetInnerHTML={{ __html: renderedDoc }}
            />
          </article>
        </div>
      </div>
    );
  }

  return null;
}
