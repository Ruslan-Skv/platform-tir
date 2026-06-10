'use client';

import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import cdDataTab from '../../../../styles/data-tab.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import { formatWindowsAddendumMoney } from '../../families/product-like/addendum/addendumSpecification';
import type { PackageAddendumSlotEstimateBlock } from '../form/types';
import attachStyles from './PackageEstimateAttach.module.css';
import { PackageLockNotice, packageLockNoticeMessage } from './packageLockNoticeUi';

const ADDENDUM_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdProduct.estimateTabCompact}`;
const ADDENDUM_BLOCK = `${cdDataTab.blockData} ${cdProduct.blockData}`;
const ADDENDUM_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact}`;
const ADDENDUM_FORM_GRID = `${cdDataTab.formGrid} ${cdProduct.formGrid}`;
const ADDENDUM_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
const ADDENDUM_SECTION_FIELDS = `${cdTemplates.sectionFields} ${cdEstimateTab.sectionFields}`;
const ADDENDUM_SECTION_HEADER = `${cdTemplates.estimateSectionHeader} ${cdEstimateTab.estimateSectionHeader}`;
const ADDENDUM_SECTION_TITLE = `${cdEstimateTab.sectionTitle}`;
const ADDENDUM_SECTION_TITLE_MAIN = `${cdTemplates.estimateSectionTitle} ${cdEstimateTab.estimateSectionTitle}`;
const ADDENDUM_FIELD = `${cdDataTab.field} ${cdEstimateTab.field}`;
const ADDENDUM_HINT = `${cdDocPreview.hint} ${cdTemplates.hint}`;
const ADDENDUM_TAB_HINT = `${ADDENDUM_HINT} ${attachStyles.estimateTabHint}`;
type EstimateUsageRow = {
  packageId: string;
  packageTitle: string;
  contractNumber: string;
  contractDate: string;
};

export function PackageAddendumEstimateBlock({
  slotOrdinal,
  slot,
  isWindowsPackage = false,
  layout = 'full',
  documentDate,
  onDocumentDateChange,
  workPeriodIncreaseDays,
  onWorkPeriodIncreaseDaysChange,
  estimatePresets,
  contractEstimateObjectLabel,
  addendumAttachablePresets,
  addendumExcludedAttachablePresets,
  presetToAttach,
  setPresetToAttach,
  excludedPresetToAttach,
  setExcludedPresetToAttach,
  onAttachPreset,
  onAttachExcludedPreset,
  onRemovePreset,
  onRemoveExcludedPreset,
  onReorderPresets,
  onReorderExcludedPresets,
  estimateUsageById,
  draggingPresetId,
  setDraggingPresetId,
  draggingExcludedPresetId,
  setDraggingExcludedPresetId,
  canUnmarkSigned,
  onUnmarkSigned,
  canUnmarkPaid,
  onUnmarkPaid,
}: {
  slotOrdinal: number;
  slot: PackageAddendumSlotEstimateBlock;
  isWindowsPackage?: boolean;
  /** Внутри вкладки Д/с по «Окна» — только блок счёт-заказа (без шапки и даты). */
  layout?: 'full' | 'accountOrderOnly';
  documentDate: string;
  onDocumentDateChange: (value: string) => void;
  workPeriodIncreaseDays: string;
  onWorkPeriodIncreaseDaysChange: (value: string) => void;
  estimatePresets: ContractEstimatePreset[];
  /** Подпись объекта из вкладки «Смета» (пусто — объект ещё не задан). */
  contractEstimateObjectLabel: string;
  addendumAttachablePresets: ContractEstimatePreset[];
  addendumExcludedAttachablePresets: ContractEstimatePreset[];
  presetToAttach: string;
  setPresetToAttach: (v: string) => void;
  excludedPresetToAttach: string;
  setExcludedPresetToAttach: (v: string) => void;
  onAttachPreset: () => void;
  onAttachExcludedPreset: () => void;
  onRemovePreset: (presetId: string) => void;
  onRemoveExcludedPreset: (presetId: string) => void;
  onReorderPresets: (sourceId: string, targetId: string) => void;
  onReorderExcludedPresets: (sourceId: string, targetId: string) => void;
  estimateUsageById: Map<string, EstimateUsageRow[]>;
  draggingPresetId: string | null;
  setDraggingPresetId: (v: string | null) => void;
  draggingExcludedPresetId: string | null;
  setDraggingExcludedPresetId: (v: string | null) => void;
  canUnmarkSigned: boolean;
  onUnmarkSigned: () => void;
  canUnmarkPaid: boolean;
  onUnmarkPaid: () => void;
}) {
  const readOnly = slot.status === 'SIGNED' || slot.status === 'PAID';
  const accountOrderOnly = layout === 'accountOrderOnly';
  const additionalSectionTitle = isWindowsPackage
    ? 'Дополнительные работы'
    : 'Раздел 1: Смета дополнительных работ';
  const excludedSectionTitle = isWindowsPackage
    ? 'Непроводимые работы'
    : 'Раздел 2: Непроводимые ремонтно-отделочные работы';
  const attachAdditionalLabel = isWindowsPackage
    ? 'Добавить в раздел «Дополнительные работы»'
    : 'Добавить в раздел "Смета дополнительных..."';
  const attachExcludedLabel = isWindowsPackage
    ? 'Добавить в раздел «Непроводимые работы»'
    : 'Добавить в раздел "Непроводимые..."';

  const signedLockNotice = readOnly ? (
    <PackageLockNotice>
      {packageLockNoticeMessage('addendum', { slotOrdinal, productDirection: isWindowsPackage })}
    </PackageLockNotice>
  ) : null;

  const estimateBody = (
    <>
      {!isWindowsPackage && !accountOrderOnly ? (
        <>
          <p className={ADDENDUM_HINT}>
            Объект задаётся только на вкладке «Смета». Здесь доступны свободные расчёты того же
            объекта, что и у договорной сметы.
          </p>
          {contractEstimateObjectLabel ? (
            <p className={ADDENDUM_TAB_HINT}>
              Объект по смете договора: <strong>{contractEstimateObjectLabel}</strong>
            </p>
          ) : (
            <p className={ADDENDUM_TAB_HINT}>
              Сначала на вкладке «Смета» выберите объект и прикрепите расчёты к договору — иначе
              нельзя определить объект для Д/с.
            </p>
          )}
        </>
      ) : null}
      <div className={ADDENDUM_SECTION_FIELDS}>
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
      </div>
    </>
  );

  if (accountOrderOnly) {
    return estimateBody;
  }

  return (
    <div className={`${ADDENDUM_BLOCK} ${ADDENDUM_DATA_COMPACT} ${ADDENDUM_TAB_COMPACT}`}>
      <div className={ADDENDUM_FORM_GRID}>
        <div className={ADDENDUM_SECTION_CARD}>
          <div className={ADDENDUM_SECTION_HEADER}>
            <h3 className={`${ADDENDUM_SECTION_TITLE} ${ADDENDUM_SECTION_TITLE_MAIN}`}>
              Дополнительное соглашение №{slotOrdinal}
            </h3>
          </div>
          {signedLockNotice}
          <div className={cdChrome.packageAddendumMetaInlineRow}>
            <div className={`${ADDENDUM_FIELD} ${cdChrome.packageAddendumDateFieldRow}`}>
              <label htmlFor={`repair_addendum_date_${slotOrdinal}`}>
                Дата доп. соглашения (в шапке слева)
              </label>
              <input
                id={`repair_addendum_date_${slotOrdinal}`}
                type="text"
                value={documentDate}
                onChange={(e) => onDocumentDateChange(e.target.value)}
                placeholder="напр. 04.05.2026"
                autoComplete="off"
                disabled={readOnly}
              />
            </div>
            <div
              className={`${ADDENDUM_FIELD} ${cdChrome.packageAddendumWorkPeriodIncreaseFieldRow}`}
            >
              <label htmlFor={`repair_addendum_work_period_increase_${slotOrdinal}`}>
                Увеличение срока по договору
              </label>
              <input
                id={`repair_addendum_work_period_increase_${slotOrdinal}`}
                type="number"
                inputMode="numeric"
                value={workPeriodIncreaseDays}
                onChange={(e) => onWorkPeriodIncreaseDaysChange(e.target.value)}
                placeholder="дн."
                autoComplete="off"
                disabled={readOnly}
                min={0}
                step={1}
              />
            </div>
          </div>
          {estimateBody}
        </div>
      </div>
    </div>
  );
}
