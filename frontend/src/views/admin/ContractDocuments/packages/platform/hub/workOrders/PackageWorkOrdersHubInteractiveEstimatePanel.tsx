'use client';

import { useMemo } from 'react';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import { PackageInteractiveInstallerPicker } from './PackageInteractiveInstallerPicker';
import { usePackageWorkOrderHub } from './PackageWorkOrderHubContext';
import {
  WO_FORM_GRID,
  WO_INTERACTIVE_TAB,
  WO_SECTION_CARD,
  WO_SECTION_TITLE,
  WO_SECTION_TITLE_MAIN,
  interactiveEstimateRowClassName,
  woPanelRootClass,
} from './packageWorkOrdersHubPanelStyles';

export function PackageWorkOrdersHubInteractiveEstimatePanel() {
  const {
    isWindowsPackage,
    form,
    contractInstallers,
    selectedInstallers,
    selectedInstallersById,
    activeInstallerId,
    addInstallerToContract,
    removeInstallerFromContract,
    setActiveInstallerId,
    assignInstallerToFinalEstimateRow,
    assignInstallerToFinalEstimateRows,
    interactiveFinalEstimateSections,
    unassignedInteractiveRowsCount,
    formatMoneyValue,
    formatInstallerGradeShort,
  } = usePackageWorkOrderHub();

  const installerAssignedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const assignment of Object.values(form.finalEstimateInstallerAssignments ?? {})) {
      const installerId = assignment.installerId?.trim() ?? '';
      if (!installerId) continue;
      counts.set(installerId, (counts.get(installerId) ?? 0) + 1);
    }
    return counts;
  }, [form.finalEstimateInstallerAssignments]);

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
          <PackageInteractiveInstallerPicker
            allInstallers={contractInstallers}
            emptyListHint={
              isWindowsPackage
                ? 'Нет мастеров по направлению «Окна». Добавьте их в CRM → Мастера.'
                : undefined
            }
            selectedInstallers={selectedInstallers}
            activeInstallerId={activeInstallerId}
            installerAssignedCounts={installerAssignedCounts}
            onAddInstaller={addInstallerToContract}
            onRemoveInstaller={removeInstallerFromContract}
            onActivateInstaller={setActiveInstallerId}
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
                    Boolean(activeInstallerId) &&
                    sectionRowKeys.length > 0 &&
                    sectionRowKeys.every(
                      (rowKey) =>
                        form.finalEstimateInstallerAssignments[rowKey]?.installerId ===
                        activeInstallerId
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
                        disabled={!activeInstallerId}
                        onClick={() =>
                          assignInstallerToFinalEstimateRows(sectionRowKeys, activeInstallerId)
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
                        disabled={!activeInstallerId}
                        onClick={() =>
                          assignInstallerToFinalEstimateRows(
                            room.lines.map((line) => line.key),
                            activeInstallerId
                          )
                        }
                      >
                        {Boolean(activeInstallerId) &&
                        room.lines.length > 0 &&
                        room.lines.every(
                          (line) =>
                            form.finalEstimateInstallerAssignments[line.key]?.installerId ===
                            activeInstallerId
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
                              activeInstallerId,
                              cdEstimatesList
                            )}
                            onClick={() => {
                              if (!activeInstallerId) return;
                              assignInstallerToFinalEstimateRow(line.key, activeInstallerId);
                            }}
                            title={
                              activeInstallerId
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
                                    {selectedInstallersById.get(line.installerId)?.fullName ??
                                      'Назначен'}
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
