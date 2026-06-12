'use client';

import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import { formatWindowsAddendumMoney } from '../../../families/product-like/addendum/addendumSpecification';
import attachStyles from '../estimateTab/PackageEstimateAttach.module.css';
import type { PackageAddendumEstimateBlockProps } from './PackageAddendumEstimateBlockProps';
import { ADDENDUM_FIELD, ADDENDUM_TAB_HINT } from './packageAddendumEstimateBlockStyles';

type PackageAddendumExcludedWorksSectionProps = Pick<
  PackageAddendumEstimateBlockProps,
  | 'slotOrdinal'
  | 'slot'
  | 'isWindowsPackage'
  | 'contractEstimateObjectLabel'
  | 'addendumExcludedAttachablePresets'
  | 'excludedPresetToAttach'
  | 'setExcludedPresetToAttach'
  | 'onAttachExcludedPreset'
  | 'onRemoveExcludedPreset'
  | 'onReorderExcludedPresets'
  | 'estimatePresets'
  | 'estimateUsageById'
  | 'draggingExcludedPresetId'
  | 'setDraggingExcludedPresetId'
>;

export function PackageAddendumExcludedWorksSection({
  slotOrdinal,
  slot,
  isWindowsPackage = false,
  contractEstimateObjectLabel,
  addendumExcludedAttachablePresets,
  excludedPresetToAttach,
  setExcludedPresetToAttach,
  onAttachExcludedPreset,
  onRemoveExcludedPreset,
  onReorderExcludedPresets,
  estimatePresets,
  estimateUsageById,
  draggingExcludedPresetId,
  setDraggingExcludedPresetId,
}: PackageAddendumExcludedWorksSectionProps) {
  const readOnly = slot.status === 'SIGNED' || slot.status === 'PAID';
  const excludedSectionTitle = isWindowsPackage
    ? 'Непроводимые работы'
    : 'Раздел 2: Непроводимые ремонтно-отделочные работы';
  const attachExcludedLabel = isWindowsPackage
    ? 'Добавить в раздел «Непроводимые работы»'
    : 'Добавить в раздел "Непроводимые..."';

  return (
    <div className={`${attachStyles.estimatePickAndAttachedRow} ${cdEstimateTab.fieldSpanAll}`}>
      <div className={attachStyles.estimatePickColumn}>
        <div className={attachStyles.estimateSelectsRow}>
          <div className={`${ADDENDUM_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
            <label htmlFor={`addendum_${slotOrdinal}_excluded_preset`}>
              Расчёт для непроводимых работ
            </label>
            <select
              id={`addendum_${slotOrdinal}_excluded_preset`}
              value={excludedPresetToAttach}
              disabled={readOnly || !contractEstimateObjectLabel}
              onChange={(e) => setExcludedPresetToAttach(e.target.value)}
            >
              <option value="">
                {!contractEstimateObjectLabel
                  ? isWindowsPackage
                    ? '— сначала счёт-заказ договора —'
                    : '— сначала смета договора —'
                  : '— расчёт непроводимых работ —'}
              </option>
              {addendumExcludedAttachablePresets.map((preset) => (
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
              disabled={readOnly || !excludedPresetToAttach}
              onClick={onAttachExcludedPreset}
            >
              {attachExcludedLabel}
            </button>
          </div>
          {addendumExcludedAttachablePresets.length === 0 && contractEstimateObjectLabel ? (
            <p className={ADDENDUM_TAB_HINT}>
              Нет свободных расчётов этого объекта для раздела непроводимых работ.
            </p>
          ) : null}
        </div>
      </div>
      <aside className={attachStyles.estimateAttachedColumn}>
        <div className={attachStyles.estimateAttachedColumnTitle}>{excludedSectionTitle}</div>
        {(slot.excludedSelectedPresetIds?.length ?? 0) > 0 ? (
          <div className={attachStyles.estimateAttachedPresetList}>
            {(slot.excludedSelectedPresetIds ?? []).map((presetId) => {
              const preset = estimatePresets.find((x) => x.id === presetId);
              const usageCount = estimateUsageById.get(presetId)?.length ?? 0;
              return (
                <div
                  key={presetId}
                  draggable={!readOnly}
                  onDragStart={() => {
                    if (!readOnly) setDraggingExcludedPresetId(presetId);
                  }}
                  onDragEnd={() => setDraggingExcludedPresetId(null)}
                  onDragOver={(e) => {
                    if (!readOnly) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (readOnly) return;
                    if (draggingExcludedPresetId) {
                      onReorderExcludedPresets(draggingExcludedPresetId, presetId);
                    }
                    setDraggingExcludedPresetId(null);
                  }}
                  className={attachStyles.estimateAttachedPresetRow}
                  style={{ opacity: draggingExcludedPresetId === presetId ? 0.6 : 1 }}
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
                    aria-label="Убрать расчёт из раздела непроводимых работ"
                    title="Убрать"
                    disabled={readOnly}
                    onClick={() => onRemoveExcludedPreset(presetId)}
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
        {isWindowsPackage && (slot.excludedSelectedPresetIds?.length ?? 0) > 0 ? (
          <p className={cdProduct.windowsAddendumSpecSectionTotal}>
            Итого по разделу (уменьшение): −
            {formatWindowsAddendumMoney(slot.excludedSnapshot?.total ?? 0)} руб.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
