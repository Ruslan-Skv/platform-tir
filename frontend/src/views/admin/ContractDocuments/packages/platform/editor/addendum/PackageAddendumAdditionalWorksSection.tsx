'use client';

import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import { formatWindowsAddendumMoney } from '../../../families/product-like/addendum/addendumSpecification';
import attachStyles from '../estimateTab/PackageEstimateAttach.module.css';
import type { PackageAddendumEstimateBlockProps } from './PackageAddendumEstimateBlockProps';
import { ADDENDUM_FIELD, ADDENDUM_TAB_HINT } from './packageAddendumEstimateBlockStyles';

type PackageAddendumAdditionalWorksSectionProps = Pick<
  PackageAddendumEstimateBlockProps,
  | 'slotOrdinal'
  | 'slot'
  | 'isWindowsPackage'
  | 'contractEstimateObjectLabel'
  | 'addendumAttachablePresets'
  | 'presetToAttach'
  | 'setPresetToAttach'
  | 'onAttachPreset'
  | 'onRemovePreset'
  | 'onReorderPresets'
  | 'estimatePresets'
  | 'estimateUsageById'
  | 'draggingPresetId'
  | 'setDraggingPresetId'
  | 'canUnmarkSigned'
  | 'onUnmarkSigned'
  | 'canUnmarkPaid'
  | 'onUnmarkPaid'
>;

export function PackageAddendumAdditionalWorksSection({
  slotOrdinal,
  slot,
  isWindowsPackage = false,
  contractEstimateObjectLabel,
  addendumAttachablePresets,
  presetToAttach,
  setPresetToAttach,
  onAttachPreset,
  onRemovePreset,
  onReorderPresets,
  estimatePresets,
  estimateUsageById,
  draggingPresetId,
  setDraggingPresetId,
  canUnmarkSigned,
  onUnmarkSigned,
  canUnmarkPaid,
  onUnmarkPaid,
}: PackageAddendumAdditionalWorksSectionProps) {
  const readOnly = slot.status === 'SIGNED' || slot.status === 'PAID';
  const additionalSectionTitle = isWindowsPackage
    ? 'Дополнительные работы'
    : 'Раздел 1: Смета дополнительных работ';
  const attachAdditionalLabel = isWindowsPackage
    ? 'Добавить в раздел «Дополнительные работы»'
    : 'Добавить в раздел "Смета дополнительных..."';

  return (
    <>
      <div className={`${attachStyles.estimatePickAndAttachedRow} ${cdEstimateTab.fieldSpanAll}`}>
        <div className={attachStyles.estimatePickColumn}>
          <div className={attachStyles.estimateSelectsRow}>
            <div className={`${ADDENDUM_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
              <label htmlFor={`addendum_${slotOrdinal}_preset`}>
                Расчёт для дополнительных работ
              </label>
              <select
                id={`addendum_${slotOrdinal}_preset`}
                value={presetToAttach}
                disabled={readOnly || !contractEstimateObjectLabel}
                onChange={(e) => setPresetToAttach(e.target.value)}
              >
                <option value="">
                  {!contractEstimateObjectLabel
                    ? isWindowsPackage
                      ? '— сначала счёт-заказ договора —'
                      : '— сначала смета договора —'
                    : '— расчёт дополнительных работ —'}
                </option>
                {addendumAttachablePresets.map((preset) => (
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
                disabled={readOnly || !presetToAttach}
                onClick={() => {
                  onAttachPreset();
                }}
              >
                {attachAdditionalLabel}
              </button>
              {slot.status === 'SIGNED' && canUnmarkSigned ? (
                <button
                  type="button"
                  className={cdWorkspace.secondaryBtn}
                  onClick={onUnmarkSigned}
                  title="Отменить статус «Д/с подписано» (доступно 30 секунд)"
                >
                  Отменить статус «Д/с подписано»
                </button>
              ) : null}
              {slot.status === 'PAID' ? (
                <button
                  type="button"
                  className={cdWorkspace.secondaryBtn}
                  onClick={onUnmarkPaid}
                  disabled={!canUnmarkPaid}
                  title={
                    canUnmarkPaid
                      ? 'Снять статус «Д/с оплачено» (доступно 24 часа)'
                      : 'Снять статус можно только в течение 24 часов после установки'
                  }
                >
                  Отменить статус «Д/с оплачено»
                </button>
              ) : null}
            </div>
            {addendumAttachablePresets.length === 0 && contractEstimateObjectLabel ? (
              <p className={ADDENDUM_TAB_HINT}>
                Нет свободных расчётов этого объекта для раздела дополнительных работ.
              </p>
            ) : null}
          </div>
        </div>
        <aside className={attachStyles.estimateAttachedColumn}>
          <div className={attachStyles.estimateAttachedColumnTitle}>{additionalSectionTitle}</div>
          {(slot.selectedPresetIds?.length ?? 0) > 0 ? (
            <div className={attachStyles.estimateAttachedPresetList}>
              {(slot.selectedPresetIds ?? []).map((presetId) => {
                const preset = estimatePresets.find((x) => x.id === presetId);
                const usageCount = estimateUsageById.get(presetId)?.length ?? 0;
                return (
                  <div
                    key={presetId}
                    draggable={!readOnly}
                    onDragStart={() => {
                      if (!readOnly) setDraggingPresetId(presetId);
                    }}
                    onDragEnd={() => setDraggingPresetId(null)}
                    onDragOver={(e) => {
                      if (!readOnly) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (readOnly) return;
                      if (draggingPresetId) {
                        onReorderPresets(draggingPresetId, presetId);
                      }
                      setDraggingPresetId(null);
                    }}
                    className={attachStyles.estimateAttachedPresetRow}
                    style={{
                      opacity: draggingPresetId === presetId ? 0.6 : 1,
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
                      aria-label="Убрать расчёт из Д/с"
                      title="Убрать"
                      disabled={readOnly}
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
          {isWindowsPackage && (slot.selectedPresetIds?.length ?? 0) > 0 ? (
            <p className={cdProduct.windowsAddendumSpecSectionTotal}>
              Итого по разделу: +{formatWindowsAddendumMoney(slot.snapshot?.total ?? 0)} руб.
            </p>
          ) : null}
        </aside>
      </div>
      {slot.selectedPresetIds?.length &&
      !(slot.selectedPresetIds ?? []).every(
        (id) => (estimateUsageById.get(id)?.length ?? 0) === 0
      ) ? (
        <p className={`${ADDENDUM_TAB_HINT} ${attachStyles.estimateTabHintFullWidth}`}>
          Часть расчётов уже прикреплена в других пакетах:{' '}
          {[
            ...new Set(
              (slot.selectedPresetIds ?? [])
                .flatMap((id) => estimateUsageById.get(id) ?? [])
                .map((u) => `№ ${u.contractNumber} от ${u.contractDate}`)
            ),
          ].join('; ')}
        </p>
      ) : null}
    </>
  );
}
