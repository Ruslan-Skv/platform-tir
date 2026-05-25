'use client';

import { useMemo } from 'react';

import styles from '../ContractDocuments.module.css';
import { useRepairContractWorkOrderHub } from './RepairContractWorkOrderHubContext';
import { RepairInteractiveInstallerPicker } from './RepairInteractiveInstallerPicker';
import { RepairWorkOrderGradeButtons } from './RepairWorkOrderGradeButtons';
import { isRepairWorkOrderAddendumTab } from './repairDocumentTabs';
import type { RepairWorkOrderHubTabId } from './repairWorkOrderHubTabs';

function interactiveEstimateRowClassName(
  installerId: string,
  activeRepairInstallerId: string,
  rowStyles: typeof styles
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
    form,
    formMergedForTemplate,
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
      <div
        className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact} ${styles.interactiveFinalEstimateTab}`}
      >
        <div className={styles.formGrid}>
          <div className={styles.sectionCard}>
            <div className={styles.interactiveEstimateTitleRow}>
              <h3 className={`${styles.sectionTitle} ${styles.estimateSectionTitle}`}>
                Интерактивная итоговая смета
              </h3>
              <span
                className={`${styles.interactiveUnassignedBadge} ${
                  unassignedInteractiveRowsCount === 0
                    ? styles.interactiveUnassignedBadgeDone
                    : styles.interactiveUnassignedBadgePending
                }`}
                title="Количество неприкреплённых позиций"
              >
                {unassignedInteractiveRowsCount}
              </span>
            </div>
            <RepairInteractiveInstallerPicker
              allInstallers={repairInstallers}
              selectedInstallers={selectedRepairInstallers}
              activeInstallerId={activeRepairInstallerId}
              installerAssignedCounts={installerAssignedCounts}
              onAddInstaller={addRepairInstallerToContract}
              onRemoveInstaller={removeRepairInstallerFromContract}
              onActivateInstaller={setActiveRepairInstallerId}
              formatInstallerGradeShort={formatInstallerGradeShort}
            />

            {interactiveFinalEstimateSections.length === 0 ? (
              <p className={styles.estimateA4Empty}>Нет данных для назначения мастеров.</p>
            ) : (
              interactiveFinalEstimateSections.map((section) => (
                <section
                  key={`interactive-section-${section.categoryName}`}
                  className={`${styles.estimateA4CategorySection} ${styles.interactiveEstimateCategorySection}`}
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
                      <div className={styles.interactiveEstimateCategoryHeader}>
                        <p
                          className={`${styles.estimateA4Meta} ${styles.interactiveEstimateCategoryMeta}`}
                        >
                          Категория работ: <strong>{section.categoryName}</strong>
                          ;&nbsp;&nbsp;&nbsp;&nbsp;Помещений: {section.rooms.length}
                        </p>
                        <button
                          type="button"
                          className={`${styles.secondaryBtn} ${styles.interactiveEstimateAssignBtn}`}
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
                      className={`${styles.estimateA4Room} ${styles.interactiveEstimateRoom}`}
                    >
                      <div
                        className={`${styles.estimateA4RoomHeader} ${styles.interactiveEstimateRoomHeader}`}
                      >
                        <span>
                          {roomIndex + 1}. {room.name}
                        </span>
                        <button
                          type="button"
                          className={`${styles.secondaryBtn} ${styles.interactiveEstimateAssignBtn}`}
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
                        className={`${styles.estimateA4Table} ${styles.interactiveEstimateTable}`}
                      >
                        <thead>
                          <tr>
                            <th>№</th>
                            <th>Работа</th>
                            <th>Кол-во</th>
                            <th className={styles.interactiveEstimateInstallerCol}>Мастер</th>
                          </tr>
                        </thead>
                        <tbody>
                          {room.lines.map((line, lineIndex) => (
                            <tr
                              key={line.key}
                              className={interactiveEstimateRowClassName(
                                line.installerId,
                                activeRepairInstallerId,
                                styles
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
                              <td className={styles.interactiveEstimateInstallerCol}>
                                {line.installerId ? (
                                  <div className={styles.interactiveAssignedInstaller}>
                                    <span className={styles.interactiveAssignedInstallerName}>
                                      {selectedRepairInstallersById.get(line.installerId)
                                        ?.fullName ?? 'Назначен'}
                                    </span>
                                    <button
                                      type="button"
                                      className={`${styles.secondaryBtn} ${styles.interactiveAssignedInstallerClearBtn}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        assignInstallerToFinalEstimateRow(line.key, '');
                                      }}
                                    >
                                      Снять
                                    </button>
                                  </div>
                                ) : (
                                  <span className={styles.interactiveEstimateUnassignedLabel}>
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
      <div className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact}`}>
        <div
          className={`${styles.formGrid} ${styles.workOrderParamsBar}`}
          style={{ gap: '2px 6px', display: 'flex', alignItems: 'flex-end', flexWrap: 'nowrap' }}
        >
          <RepairWorkOrderGradeButtons
            value={form.workOrder.gradeIncreasePercent}
            onChange={(gradeIncreasePercent) =>
              updateWorkOrder('gradeIncreasePercent', gradeIncreasePercent)
            }
          />
        </div>
        <div className={styles.formGrid}>
          <div className={styles.sectionCard}>
            <h3 className={`${styles.sectionTitle} ${styles.estimateSectionTitle}`}>
              Итоговый заказ-наряд
            </h3>
            <p className={styles.hint} style={{ marginTop: 0 }}>
              Формируется из итоговой сметы: включает все проводимые работы по основной смете и доп.
              соглашениям, с вычетом работ из блока «Непроводимые ремонтно-отделочные работы».
            </p>
            <div
              className={styles.tabBar}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}
            >
              <button
                type="button"
                className={`${styles.tab} ${activeFinalWorkOrderDocId === 'common' ? styles.tabActive : ''}`}
                onClick={() => setActiveFinalWorkOrderDocId('common')}
              >
                Общий заказ-наряд
              </button>
              {perInstallerWorkOrders.map((doc) => (
                <button
                  key={doc.installer.id}
                  type="button"
                  className={`${styles.tab} ${
                    activeFinalWorkOrderDocId === doc.installer.id ? styles.tabActive : ''
                  }`}
                  onClick={() => setActiveFinalWorkOrderDocId(doc.installer.id)}
                >
                  {formatInstallerNameShort(doc.installer.fullName)} (
                  {formatInstallerGradeShort(doc.installer.grade)})
                </button>
              ))}
            </div>
            <div className={styles.estimateA4Wrap}>
              <article className={styles.estimateA4Sheet} data-print-target="work-order-sheet">
                <div className={styles.estimateA4Meta} style={{ marginBottom: 10 }}>
                  <p style={{ margin: '0 0 3px' }}>
                    <strong>Договор:</strong> № {estimateAppendixContractRef.num} от{' '}
                    {estimateAppendixContractRef.date}
                  </p>
                  <p style={{ margin: '0 0 3px' }}>
                    <strong>Адрес:</strong> {formMergedForTemplate.object.objectAddress || '—'}
                  </p>
                  <p style={{ margin: '0 0 3px' }}>
                    <strong>Заказчик:</strong> {formMergedForTemplate.customer.fullName || '—'}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Телефон заказчика:</strong>{' '}
                    {formMergedForTemplate.customer.phone || '—'}
                  </p>
                </div>
                {finalWorkOrderComputed.rooms.length === 0 ? (
                  <p className={styles.estimateA4Empty}>Нет данных для итогового заказ-наряда.</p>
                ) : activeInstallerWorkOrder ? (
                  <>
                    <h4 className={styles.estimateA4Title}>
                      Заказ-наряд мастера: {activeInstallerWorkOrder.installer.fullName} (
                      {formatInstallerGradeShort(activeInstallerWorkOrder.installer.grade)})
                    </h4>
                    {activeInstallerWorkOrder.categories.map((section) => (
                      <section
                        key={`installer-doc-category-${activeInstallerWorkOrder.installer.id}-${section.categoryName}`}
                        className={styles.estimateA4CategorySection}
                      >
                        <p className={styles.estimateA4Meta}>
                          Категория работ: <strong>{section.categoryName}</strong>
                        </p>
                        {section.rooms.map((room, roomIndex) => (
                          <section
                            key={`installer-doc-room-${activeInstallerWorkOrder.installer.id}-${section.categoryName}-${room.name}-${roomIndex}`}
                            className={styles.estimateA4Room}
                          >
                            <div className={styles.estimateA4RoomHeader}>
                              <span>
                                {roomIndex + 1}. {room.name}
                              </span>
                              <strong>{formatMoneyValue(room.adjustedTotal)} руб.</strong>
                            </div>
                            <table className={styles.estimateA4Table}>
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
                    <p className={styles.estimateA4Total}>
                      Итого по мастеру:{' '}
                      <strong>{formatMoneyValue(activeInstallerWorkOrder.total)} руб.</strong>
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className={styles.estimateA4Title}>Итоговый заказ-наряд</h4>
                    {finalWorkOrderCategorySections.map((section) => (
                      <section
                        key={`final-work-order-category-${section.categoryName}`}
                        className={styles.estimateA4CategorySection}
                      >
                        <p className={styles.estimateA4Meta}>
                          Категория работ: <strong>{section.categoryName}</strong>
                        </p>
                        {section.rooms.map((room, roomIndex) => (
                          <section
                            key={`final-work-order-room-${section.categoryName}-${room.name}-${roomIndex}`}
                            className={styles.estimateA4Room}
                          >
                            <div className={styles.estimateA4RoomHeader}>
                              <span>
                                {roomIndex + 1}. {room.name}
                              </span>
                              <strong>{formatMoneyValue(room.adjustedTotal)} руб.</strong>
                            </div>
                            <table className={styles.estimateA4Table}>
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
                    <p className={styles.estimateA4Total}>
                      Итого по итоговому заказ-наряду:{' '}
                      <strong>{formatMoneyValue(finalWorkOrderComputed.total)} руб.</strong>
                    </p>
                    {finalWorkOrderComputed.installerTotals.length > 0 ? (
                      <section className={styles.estimateA4Room}>
                        <div className={styles.estimateA4RoomHeader}>
                          <span>Итоги по мастерам</span>
                        </div>
                        <div className={styles.estimateA4Meta}>
                          {finalWorkOrderComputed.installerTotals.map((row) => (
                            <p key={row.installer.id} style={{ margin: '0 0 4px' }}>
                              {formatInstallerNameShort(row.installer.fullName)} (
                              {formatInstallerGradeShort(row.installer.grade)}, {row.lineCount}
                              шт.) - {formatMoneyRubShort(row.total)}руб.
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
      <div className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact}`}>
        <div
          className={`${styles.formGrid} ${styles.workOrderParamsBar}`}
          style={{ gap: '2px 6px', display: 'flex', alignItems: 'flex-end', flexWrap: 'nowrap' }}
        >
          <RepairWorkOrderGradeButtons
            value={form.workOrder.gradeIncreasePercent}
            onChange={(gradeIncreasePercent) =>
              updateWorkOrder('gradeIncreasePercent', gradeIncreasePercent)
            }
          />
          <label
            className={`${styles.managerQuestionnaireNeedRow} ${styles.repairWorkOrderShowAmountsLabel}`}
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
        <div className={styles.estimateA4Wrap}>
          <article className={styles.estimateA4Sheet}>
            <div
              className={styles.contractA4Preview}
              dangerouslySetInnerHTML={{ __html: renderedDoc }}
            />
          </article>
        </div>
      </div>
    );
  }

  return null;
}
