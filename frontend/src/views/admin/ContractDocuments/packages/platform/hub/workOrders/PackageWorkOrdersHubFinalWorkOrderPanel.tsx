'use client';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import { buildWorkOrderInstallationMetaLines } from '../../workOrders/workOrderInstallationMeta';
import { PackageWorkOrderGradeButtons } from './PackageWorkOrderGradeButtons';
import { usePackageWorkOrderHub } from './PackageWorkOrderHubContext';
import hubStyles from './PackageWorkOrdersHubModal.module.css';
import {
  WO_A4_WRAP,
  WO_FORM_GRID,
  WO_HINT,
  WO_SECTION_CARD,
  WO_SECTION_TITLE,
  WO_SECTION_TITLE_MAIN,
  woPanelRootClass,
} from './packageWorkOrdersHubPanelStyles';

export function PackageWorkOrdersHubFinalWorkOrderPanel() {
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
  } = usePackageWorkOrderHub();

  const installationMeta = linkedInstallationSchedule
    ? buildWorkOrderInstallationMetaLines(linkedInstallationSchedule)
    : null;

  return (
    <div className={woPanelRootClass(isWindowsPackage)}>
      {!isWindowsPackage ? (
        <div
          className={`${WO_FORM_GRID} ${cdEstimatesList.workOrderParamsBar}`}
          style={{ gap: '2px 6px', display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap' }}
        >
          <PackageWorkOrderGradeButtons
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
          <div className={`${cdChrome.tabBar} ${hubStyles.finalDocTabBar}`}>
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
