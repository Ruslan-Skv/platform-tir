'use client';

import { useEffect, useMemo, useState } from 'react';

import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';
import { Modal } from '@/shared/ui/Modal';

import cdBase from '../../../../styles/base.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import {
  type LinkedCopySplitTarget,
  getLinkedCopyDisabledReason,
  listJoinableSplitBundlesAtObject,
} from '../../../platform/estimates/estimateSplitBundle';
import { resolveSplitBundleId } from '../../../platform/estimates/estimateWorkScopeTree';

export type EstimateCopyKind = 'plain' | 'linked_same' | 'linked_new' | 'linked_join';

export type EstimateCopyChoiceResult =
  | { kind: 'plain' }
  | { kind: 'linked'; target: LinkedCopySplitTarget };

function linkedTargetForCopyKind(
  kind: EstimateCopyKind,
  joinBundleId: string
): LinkedCopySplitTarget | null {
  if (kind === 'linked_same') return { mode: 'same' };
  if (kind === 'linked_new') return { mode: 'new' };
  if (kind === 'linked_join') return { mode: 'join', bundleId: joinBundleId };
  return null;
}

export function EstimateCopyChoiceModal({
  preset,
  allPresets,
  archiveView,
  hasLockedUsage,
  saving,
  onClose,
  onChoose,
}: {
  preset: ContractEstimatePreset;
  allPresets: ContractEstimatePreset[];
  archiveView: boolean;
  hasLockedUsage: boolean;
  saving: boolean;
  onClose: () => void;
  onChoose: (choice: EstimateCopyChoiceResult) => void;
}) {
  const [copyKind, setCopyKind] = useState<EstimateCopyKind>('plain');
  const joinableBundles = useMemo(
    () => listJoinableSplitBundlesAtObject(preset, allPresets),
    [preset, allPresets]
  );
  const [joinBundleId, setJoinBundleId] = useState('');
  const inCurrentBundle = Boolean(resolveSplitBundleId(preset, allPresets));
  const title = preset.title.trim() || 'Расчёт';
  const copyKindLabelId = `estimate-copy-kind-${preset.id}`;

  const activeLinkedTarget = linkedTargetForCopyKind(copyKind, joinBundleId);
  const linkedDisabledReason =
    activeLinkedTarget != null
      ? getLinkedCopyDisabledReason(preset, allPresets, activeLinkedTarget, {
          archiveView,
          hasLockedUsage,
        })
      : null;
  const submitBlocked =
    copyKind !== 'plain' &&
    (Boolean(linkedDisabledReason) || (copyKind === 'linked_join' && !joinBundleId.trim()));

  useEffect(() => {
    setCopyKind('plain');
    setJoinBundleId(joinableBundles[0]?.bundleId ?? '');
  }, [preset.id, joinableBundles]);

  const renderLinkedOption = (
    kind: Exclude<EstimateCopyKind, 'plain'>,
    optionTitle: string,
    optionHint: string,
    target: LinkedCopySplitTarget
  ) => {
    const reason = getLinkedCopyDisabledReason(preset, allPresets, target, {
      archiveView,
      hasLockedUsage,
    });
    return (
      <label className={cdEstimatesList.estimatesCopyChoiceRadioRow} title={reason ?? undefined}>
        <input
          type="radio"
          name={`estimate-copy-${preset.id}`}
          checked={copyKind === kind}
          disabled={saving || Boolean(reason)}
          onChange={() => setCopyKind(kind)}
        />
        <span className={cdEstimatesList.estimatesCopyChoiceRadioText}>
          <strong>{optionTitle}</strong>
          <span>{optionHint}</span>
          {reason ? (
            <span className={cdEstimatesList.estimatesCopyChoiceRadioWarn}>{reason}</span>
          ) : null}
          {kind === 'linked_join' && copyKind === 'linked_join' && joinableBundles.length > 0 ? (
            <select
              className={cdEstimatesList.estimatesCopyChoiceBundleSelect}
              value={joinBundleId}
              disabled={saving || Boolean(reason)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                setJoinBundleId(e.target.value);
              }}
            >
              {joinableBundles.map((b) => (
                <option key={b.bundleId} value={b.bundleId}>
                  {b.label}
                </option>
              ))}
            </select>
          ) : null}
        </span>
      </label>
    );
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        if (saving) return;
        onClose();
      }}
      title="Создать копию расчёта"
      size="md"
      compactOnMobile
    >
      <div
        className={cdBase.estimatesCopyChoiceModalForm}
        data-modal-form
        data-modal-density="compact"
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Расчёт «<strong>{title}</strong>». На одном объекте может быть несколько отдельных связок
          разделения сметы — выберите, куда добавить копию.
        </p>
        <div data-modal-form-group data-modal-span>
          <span id={copyKindLabelId}>Вариант копии</span>
          <div
            className={cdEstimatesList.estimatesCopyChoiceOptions}
            role="radiogroup"
            aria-labelledby={copyKindLabelId}
          >
            <label className={cdEstimatesList.estimatesCopyChoiceRadioRow}>
              <input
                type="radio"
                name={`estimate-copy-${preset.id}`}
                checked={copyKind === 'plain'}
                disabled={saving}
                onChange={() => setCopyKind('plain')}
              />
              <span className={cdEstimatesList.estimatesCopyChoiceRadioText}>
                <strong>Обычная копия</strong>
                <span>Отдельный расчёт без связи при разделении сметы.</span>
              </span>
            </label>
            {renderLinkedOption(
              'linked_same',
              inCurrentBundle
                ? 'Связанная копия — в эту же связку'
                : 'Связанная копия — начать связку',
              inCurrentBundle
                ? 'Ещё один экземпляр в текущей связке; позиции сметы распределяются между расчётами связки.'
                : 'Первый связанный экземпляр: после сохранения отметьте состав в «Разделении сметы» у каждого расчёта.',
              { mode: 'same' }
            )}
            {renderLinkedOption(
              'linked_new',
              'Связанная копия — новая связка',
              'Отдельная связка на том же объекте (другой набор договоров / другая смета). Исходный расчёт остаётся в своей связке.',
              { mode: 'new' }
            )}
            {joinableBundles.length > 0
              ? renderLinkedOption(
                  'linked_join',
                  'Связанная копия — в другую связку на объекте',
                  'Добавить экземпляр в уже существующую связку по этому адресу.',
                  { mode: 'join', bundleId: joinBundleId }
                )
              : null}
          </div>
        </div>
        {submitBlocked && linkedDisabledReason ? (
          <p data-modal-form-error role="alert">
            {linkedDisabledReason}
          </p>
        ) : null}
        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" disabled={saving} onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            data-modal-btn="primary"
            disabled={saving || submitBlocked}
            onClick={() => {
              if (copyKind === 'plain') {
                onChoose({ kind: 'plain' });
                return;
              }
              const target = linkedTargetForCopyKind(copyKind, joinBundleId);
              if (!target) return;
              onChoose({ kind: 'linked', target });
            }}
          >
            {saving ? 'Подождите…' : 'Создать'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
