'use client';

import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import styles from '../ContractDocuments.module.css';
import type { RepairAddendumSlotEstimateBlock } from './repairPackageForm';

type EstimateUsageRow = {
  packageId: string;
  packageTitle: string;
  contractNumber: string;
  contractDate: string;
};

export function RepairAddendumEstimateBlock({
  slotOrdinal,
  slot,
  documentDate,
  onDocumentDateChange,
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
  onMarkSigned,
  onMarkPaid,
  canUnmarkSigned,
  onUnmarkSigned,
  canUnmarkPaid,
  onUnmarkPaid,
}: {
  slotOrdinal: number;
  slot: RepairAddendumSlotEstimateBlock;
  documentDate: string;
  onDocumentDateChange: (value: string) => void;
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
  onMarkSigned: () => void;
  onMarkPaid: () => void;
  canUnmarkSigned: boolean;
  onUnmarkSigned: () => void;
  canUnmarkPaid: boolean;
  onUnmarkPaid: () => void;
}) {
  const readOnly = slot.status === 'SIGNED' || slot.status === 'PAID';
  const hasAnyAttachedPresets =
    (slot.selectedPresetIds?.length ?? 0) > 0 || (slot.excludedSelectedPresetIds?.length ?? 0) > 0;

  return (
    <div className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact}`}>
      <div className={styles.formGrid}>
        <div className={styles.sectionCard}>
          <div className={styles.estimateSectionHeader}>
            <h3 className={`${styles.sectionTitle} ${styles.estimateSectionTitle}`}>
              Дополнительное соглашение №{slotOrdinal}
            </h3>
            {slot.status === 'OPEN' ? (
              <div className={styles.repairAddendumHeaderCornerActions}>
                <button
                  type="button"
                  className={styles.repairAddendumMarkSignedProminentBtn}
                  onClick={onMarkSigned}
                  disabled={!hasAnyAttachedPresets}
                  title={
                    !hasAnyAttachedPresets ? 'Сначала прикрепите хотя бы один расчёт' : undefined
                  }
                >
                  Д/с №{slotOrdinal} подписано
                </button>
              </div>
            ) : null}
          </div>
          <div className={`${styles.field} ${styles.repairAddendumDateFieldRow}`}>
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
          <p className={styles.hint}>
            Объект задаётся только на вкладке «Смета». Здесь доступны свободные расчёты того же
            объекта, что и у договорной сметы.
          </p>
          {contractEstimateObjectLabel ? (
            <p className={`${styles.hint} ${styles.estimateTabHint}`}>
              Объект по смете договора: <strong>{contractEstimateObjectLabel}</strong>
            </p>
          ) : (
            <p className={`${styles.hint} ${styles.estimateTabHint}`}>
              Сначала на вкладке «Смета» выберите объект и прикрепите расчёты к договору — иначе
              нельзя определить объект для Д/с.
            </p>
          )}
          <div className={styles.sectionFields}>
            <div className={`${styles.estimatePickAndAttachedRow} ${styles.fieldSpanAll}`}>
              <div className={styles.estimatePickColumn}>
                <div className={styles.estimateSelectsRow}>
                  <div className={`${styles.field} ${styles.fieldSpanAll}`}>
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
                          ? '— сначала смета договора —'
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
                <div className={styles.estimateAttachBlock}>
                  <div className={styles.estimateAttachActionsRow}>
                    <button
                      type="button"
                      className={`${styles.primaryBtn} ${styles.estimateAttachPrimaryBtn}`}
                      disabled={readOnly || !presetToAttach}
                      onClick={() => {
                        onAttachPreset();
                      }}
                    >
                      Добавить в раздел "Смета дополнительных..."
                    </button>
                    {slot.status === 'SIGNED' ? (
                      <>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={onMarkPaid}
                          title={`Присвоить статус «Д/с №${slotOrdinal} оплачено»`}
                        >
                          Д/с №{slotOrdinal} оплачено
                        </button>
                        {canUnmarkSigned ? (
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={onUnmarkSigned}
                            title="Отменить статус «Д/с подписано» (доступно 30 секунд)"
                          >
                            Отменить статус «Д/с подписано»
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    {slot.status === 'PAID' ? (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
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
                    <p className={`${styles.hint} ${styles.estimateTabHint}`}>
                      Нет свободных расчётов этого объекта для раздела дополнительных работ.
                    </p>
                  ) : null}
                </div>
              </div>
              <aside className={styles.estimateAttachedColumn}>
                <div className={styles.estimateAttachedColumnTitle}>
                  Раздел 1: Смета дополнительных работ
                </div>
                {(slot.selectedPresetIds?.length ?? 0) > 0 ? (
                  <div className={styles.estimateAttachedPresetList}>
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
                          className={styles.estimateAttachedPresetRow}
                          style={{
                            opacity: draggingPresetId === presetId ? 0.6 : 1,
                          }}
                        >
                          <div className={styles.estimateAttachedPresetMain}>
                            <strong>{preset?.title ?? presetId}</strong>
                            <span className={styles.estimateAttachedPresetMeta}>
                              {' '}
                              · {preset?.categoryName ?? '—'}
                              {usageCount > 0 ? ` · ещё в пакетах: ${usageCount}` : null}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={`${styles.secondaryBtn} ${styles.estimateAttachedRemoveBtn}`}
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
                  <p className={styles.estimateAttachedEmpty}>Пока нет</p>
                )}
              </aside>
            </div>
            {slot.selectedPresetIds?.length &&
            !(slot.selectedPresetIds ?? []).every(
              (id) => (estimateUsageById.get(id)?.length ?? 0) === 0
            ) ? (
              <p
                className={`${styles.hint} ${styles.estimateTabHint} ${styles.estimateTabHintFullWidth}`}
              >
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
            <div className={`${styles.estimatePickAndAttachedRow} ${styles.fieldSpanAll}`}>
              <div className={styles.estimatePickColumn}>
                <div className={styles.estimateSelectsRow}>
                  <div className={`${styles.field} ${styles.fieldSpanAll}`}>
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
                          ? '— сначала смета договора —'
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
                <div className={styles.estimateAttachBlock}>
                  <div className={styles.estimateAttachActionsRow}>
                    <button
                      type="button"
                      className={`${styles.primaryBtn} ${styles.estimateAttachPrimaryBtn}`}
                      disabled={readOnly || !excludedPresetToAttach}
                      onClick={onAttachExcludedPreset}
                    >
                      Добавить в раздел "Непроводимые..."
                    </button>
                  </div>
                  {addendumExcludedAttachablePresets.length === 0 && contractEstimateObjectLabel ? (
                    <p className={`${styles.hint} ${styles.estimateTabHint}`}>
                      Нет свободных расчётов этого объекта для раздела непроводимых работ.
                    </p>
                  ) : null}
                </div>
              </div>
              <aside className={styles.estimateAttachedColumn}>
                <div className={styles.estimateAttachedColumnTitle}>
                  Раздел 2: Непроводимые ремонтно-отделочные работы
                </div>
                {(slot.excludedSelectedPresetIds?.length ?? 0) > 0 ? (
                  <div className={styles.estimateAttachedPresetList}>
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
                          className={styles.estimateAttachedPresetRow}
                          style={{ opacity: draggingExcludedPresetId === presetId ? 0.6 : 1 }}
                        >
                          <div className={styles.estimateAttachedPresetMain}>
                            <strong>{preset?.title ?? presetId}</strong>
                            <span className={styles.estimateAttachedPresetMeta}>
                              {' '}
                              · {preset?.categoryName ?? '—'}
                              {usageCount > 0 ? ` · ещё в пакетах: ${usageCount}` : null}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={`${styles.secondaryBtn} ${styles.estimateAttachedRemoveBtn}`}
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
                  <p className={styles.estimateAttachedEmpty}>Пока нет</p>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
