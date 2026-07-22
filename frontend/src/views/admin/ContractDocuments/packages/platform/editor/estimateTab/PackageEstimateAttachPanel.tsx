'use client';

import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import attachStyles from './PackageEstimateAttach.module.css';
import type { PackageEstimateTabProps } from './PackageEstimateTab';
import { ESTIMATE_HINT, ESTIMATE_TAB_HINT } from './packageEstimateTabStyles';

export type PackageEstimateAttachPanelProps = Pick<
  PackageEstimateTabProps,
  | 'form'
  | 'contractAndEstimateLocked'
  | 'isProductDirectionPackage'
  | 'linkedCrmCustomerId'
  | 'contractEstimateObjectKey'
  | 'estimateAttachGroupKey'
  | 'setEstimateAttachGroupKey'
  | 'estimatePresetToAttach'
  | 'setEstimatePresetToAttach'
  | 'attachEstimatePickMeta'
  | 'attachableForSelectedGroup'
  | 'attachableEstimatePresets'
  | 'estimatePresets'
  | 'estimateUsageById'
  | 'draggingEstimatePresetId'
  | 'setDraggingEstimatePresetId'
  | 'onEstimateObjectChange'
  | 'onAttachPreset'
  | 'onMovePreset'
  | 'onRemovePreset'
>;

export function PackageEstimateAttachPanel({
  form,
  contractAndEstimateLocked,
  isProductDirectionPackage,
  linkedCrmCustomerId,
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
  onEstimateObjectChange,
  onAttachPreset,
  onMovePreset,
  onRemovePreset,
}: PackageEstimateAttachPanelProps) {
  return (
    <>
      <div
        className={`${attachStyles.estimatePickAndAttachedRow} ${cdEstimateTab.fieldSpanAll} ${attachStyles.estimateAttachWindowsTypography}`}
      >
        <div className={attachStyles.estimatePickColumn}>
          <div className={attachStyles.estimateSelectsRow}>
            <div className={`${cdEstimateTab.field} ${attachStyles.estimateAttachWindowsField}`}>
              <label htmlFor="estimate_group_select">Объект</label>
              <select
                id="estimate_group_select"
                value={
                  (form.estimate.selectedPresetIds?.length ?? 0) > 0
                    ? contractEstimateObjectKey
                    : estimateAttachGroupKey
                }
                disabled={
                  contractAndEstimateLocked || (form.estimate.selectedPresetIds?.length ?? 0) > 0
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
            <div className={`${cdEstimateTab.field} ${attachStyles.estimateAttachWindowsField}`}>
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
              <p className={ESTIMATE_HINT} style={{ marginTop: 0 }}>
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
        <p
          className={`${ESTIMATE_TAB_HINT} ${attachStyles.estimateTabHintFullWidth} ${attachStyles.estimateAttachWindowsTypography}`}
        >
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
    </>
  );
}
