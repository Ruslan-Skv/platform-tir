'use client';

import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

import { useState } from 'react';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import {
  PACKAGE_TAB_A4,
  PACKAGE_TAB_BTN,
  PACKAGE_TAB_BTN_SECONDARY,
  PACKAGE_TAB_CARD,
  PACKAGE_TAB_HEAD,
  PACKAGE_TAB_HINT,
  PACKAGE_TAB_TITLE,
  PACKAGE_TAB_TOOLBAR_ROW,
} from '../../ui/packageTabClassNames';
import { downloadPackageWorkOrderHubTabPdf } from '../../workOrders/packageWorkOrderHubPrint';
import { buildWorkOrderInstallationMetaLines } from '../../workOrders/workOrderInstallationMeta';
import { PackageWorkOrderGradeButtons } from './PackageWorkOrderGradeButtons';
import { usePackageWorkOrderHub } from './PackageWorkOrderHubContext';
import hubStyles from './PackageWorkOrdersHubModal.module.css';
import {
  WO_A4_WRAP,
  WO_FORM_GRID,
  WO_SECTION_CARD,
  WO_SUB_TAB_BAR,
  woPanelRootClass,
} from './packageWorkOrdersHubPanelStyles';

export function PackageWorkOrdersHubFinalWorkOrderPanel() {
  const hub = usePackageWorkOrderHub();
  const {
    isWindowsPackage,
    form,
    updateWorkOrder,
    activeFinalWorkOrderDocId,
    setActiveFinalWorkOrderDocId,
    finalWorkOrderComputed,
    finalWorkOrderCategorySections,
    perInstallerWorkOrders,
    activeInstallerWorkOrder,
    estimateAppendixContractRef,
    linkedInstallationSchedule,
    formatMoneyValue,
    formatMoneyRubShort,
    formatInstallerNameShort,
    formatInstallerGradeShort,
  } = hub;

  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const installationMeta = linkedInstallationSchedule
    ? buildWorkOrderInstallationMetaLines(linkedInstallationSchedule)
    : null;

  const downloadActivePdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      await downloadPackageWorkOrderHubTabPdf('finalWorkOrder', hub);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Не удалось сформировать PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className={woPanelRootClass(isWindowsPackage)}>
      <div className={WO_FORM_GRID}>
        <div className={`${WO_SECTION_CARD} ${PACKAGE_TAB_CARD}`}>
          <div className={PACKAGE_TAB_HEAD}>
            <h3 className={PACKAGE_TAB_TITLE}>Итоговый заказ-наряд</h3>
            {/* div, а не p: правила компактной типографики товарных вкладок задают 12px именно для p. */}
            <div className={PACKAGE_TAB_HINT}>
              {isWindowsPackage
                ? 'Формируется из счёт-заказа и доп. соглашений с учётом назначенных мастеров.'
                : 'Формируется из итоговой сметы: включает все проводимые работы по основной смете и доп. соглашениям, с вычетом работ из блока «Непроводимые ремонтно-отделочные работы».'}
            </div>
          </div>
          <div className={PACKAGE_TAB_TOOLBAR_ROW}>
            {!isWindowsPackage ? (
              <PackageWorkOrderGradeButtons
                value={form.workOrder.gradeIncreasePercent}
                onChange={(gradeIncreasePercent) =>
                  updateWorkOrder('gradeIncreasePercent', gradeIncreasePercent)
                }
              />
            ) : null}
            <div className={`${WO_SUB_TAB_BAR} ${hubStyles.finalDocTabBar}`} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeFinalWorkOrderDocId === 'common'}
                className={`${cdChrome.tab} ${activeFinalWorkOrderDocId === 'common' ? cdChrome.tabActive : ''}`}
                onClick={() => setActiveFinalWorkOrderDocId('common')}
              >
                Общий заказ-наряд
              </button>
              {perInstallerWorkOrders.map((doc) => (
                <button
                  key={doc.installer.id}
                  type="button"
                  role="tab"
                  aria-selected={activeFinalWorkOrderDocId === doc.installer.id}
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
            <button
              type="button"
              className={`${PACKAGE_TAB_BTN} ${PACKAGE_TAB_BTN_SECONDARY}`}
              onClick={() => void downloadActivePdf()}
              disabled={pdfBusy}
              title="Скачать PDF открытого заказ-наряда (общего или выбранного мастера)"
            >
              <ArrowDownTrayIcon className={hubStyles.headerIcon} aria-hidden />
              <span>{pdfBusy ? 'Готовим PDF…' : 'Скачать PDF'}</span>
            </button>
          </div>
          {pdfError ? (
            <p className={hubStyles.panelError} role="alert">
              {pdfError}
            </p>
          ) : null}
          <div className={`${WO_A4_WRAP} ${PACKAGE_TAB_A4}`}>
            <article className={cdDocPreview.estimateA4Sheet} data-print-target="work-order-sheet">
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
                <p style={{ margin: installationMeta ? '0 0 3px' : 0 }}>
                  <strong>Телефон заказчика:</strong> {form.customer.phone || '—'}
                </p>
                {installationMeta ? (
                  <>
                    <p style={{ margin: '0 0 3px' }}>
                      <strong>Дата и время монтажа:</strong> {installationMeta.dateTime}
                    </p>
                    {installationMeta.installer ? (
                      <p style={{ margin: '0 0 3px' }}>
                        <strong>Монтажник:</strong> {installationMeta.installer}
                      </p>
                    ) : null}
                    {installationMeta.contacts.map((line, index) => (
                      <p
                        key={`${line}-${index}`}
                        style={{
                          margin: index === installationMeta.contacts.length - 1 ? 0 : '0 0 3px',
                        }}
                      >
                        {line.includes(':') ? (
                          <>
                            <strong>{line.slice(0, line.indexOf(':') + 1)}</strong>
                            {line.slice(line.indexOf(':') + 1)}
                          </>
                        ) : (
                          line
                        )}
                      </p>
                    ))}
                  </>
                ) : null}
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
