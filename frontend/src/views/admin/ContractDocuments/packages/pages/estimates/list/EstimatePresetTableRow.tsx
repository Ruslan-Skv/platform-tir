'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import {
  getBaseSnapshotWithMarkupForPreset,
  getSnapshotForEstimateAttach,
} from '@/views/admin/ContractDocuments/packages/platform/estimates/applyEstimatePresetIds';
import type {
  EstimatePipelineManualTab,
  EstimatePipelineTab,
} from '@/views/admin/ContractDocuments/packages/platform/estimates/estimatePipelineStage';
import { getSplitBundleBadgeFraction } from '@/views/admin/ContractDocuments/packages/platform/estimates/estimateSplitBundle';
import {
  findSplitBundleSnapshotMismatches,
  listPresetsInSplitBundle,
  resolveSplitBundleId,
} from '@/views/admin/ContractDocuments/packages/platform/estimates/estimateWorkScopeTree';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdEstimatesList from '@/views/admin/ContractDocuments/styles/estimates-list.module.css';

import { packageKindUiLabel } from '../../../config/packageDirectionRegistry';
import type { EstimateTrashConfirmState } from '../modals/EstimateTrashConfirmModal';
import { EstimatePresetRowActions } from './EstimatePresetRowActions';
import { EstimatePresetRowMarkupCell } from './EstimatePresetRowMarkupCell';
import { EstimatePresetRowUsageCell } from './EstimatePresetRowUsageCell';
import {
  ESTIMATES_NO_ADDRESS_KEY,
  type EstimatePackageUsage,
  estimateObjectAddressDisplayLabel,
  estimateObjectAddressKey,
  formatEstimateListTableCost,
  isUsageLocked,
  splitBundleCoversAllWorkScopeLines,
} from './estimatesListUtils';

export type EstimatePresetTableRowProps = {
  preset: ContractEstimatePreset;
  childOfAddress?: boolean;
  /** Последний расчёт в раскрытом объекте — скругление низа. */
  lastAddressChild?: boolean;
  /** Расчёт без объекта — карточка со скруглением. */
  standaloneCard?: boolean;
  /** Единственный расчёт объекта — показать адрес объекта в карточке. */
  showObjectAddress?: boolean;
  saving: boolean;
  pipelineTab: EstimatePipelineTab;
  groups: ContractEstimateGroup[];
  items: ContractEstimatePreset[];
  usageByEstimateId: Map<string, EstimatePackageUsage[]>;
  router: AppRouterInstance;
  onPresetPipelineStage: (presetId: string, tab: EstimatePipelineManualTab) => void;
  onPresetMarkupChange: (presetId: string, raw: string) => void;
  onDetachEdit: (estimateId: string, usages: EstimatePackageUsage[]) => void;
  onCopyPreset: (presetId: string) => void;
  onOpenWorkScopeSplit: (presetId: string) => void;
  onTrashPreset: (state: EstimateTrashConfirmState) => void;
  /** Быстрый предпросмотр расчёта в виде сметы договора. */
  onOpenPreview: (presetId: string) => void;
};

export function EstimatePresetTableRow({
  preset: it,
  childOfAddress,
  lastAddressChild,
  standaloneCard,
  showObjectAddress,
  saving,
  pipelineTab,
  groups,
  items,
  usageByEstimateId,
  router,
  onPresetPipelineStage,
  onPresetMarkupChange,
  onDetachEdit,
  onCopyPreset,
  onOpenWorkScopeSplit,
  onTrashPreset,
  onOpenPreview,
}: EstimatePresetTableRowProps) {
  const usages = usageByEstimateId.get(it.id) ?? [];
  const hasLockedUsage = usages.some((u) => isUsageLocked(u));
  const attachSnap = getSnapshotForEstimateAttach(it, groups);
  const fullMarkupSnap = getBaseSnapshotWithMarkupForPreset(it, groups);
  const snapshotTotal = attachSnap?.total;
  const fullSnapshotTotal = fullMarkupSnap?.total;
  const hasSnapshotTotal = typeof snapshotTotal === 'number' && Number.isFinite(snapshotTotal);
  const hasFullSnapshotTotal =
    typeof fullSnapshotTotal === 'number' && Number.isFinite(fullSnapshotTotal);
  const inSplitBundle = Boolean(resolveSplitBundleId(it, items));
  const showFullEstimateTotalInParens =
    inSplitBundle &&
    hasSnapshotTotal &&
    hasFullSnapshotTotal &&
    Math.abs(fullSnapshotTotal - snapshotTotal) > 0.005;
  const splitBundleAll = listPresetsInSplitBundle(it, items);
  const splitBundleCount = splitBundleAll.length;
  const splitBundleBadgeFraction = getSplitBundleBadgeFraction(it, items);
  const splitBundleCoversAllPositions = splitBundleCoversAllWorkScopeLines(
    it,
    splitBundleAll,
    groups
  );
  const splitBundleMismatchCount = findSplitBundleSnapshotMismatches(it, items).length;
  const splitBundleTooltip =
    splitBundleCount >= 2
      ? `Расчётов в связке: ${splitBundleCount}\n${splitBundleAll
          .map((p) => `· ${p.title.trim() || 'Расчёт'}${p.id === it.id ? ' (этот)' : ''}`)
          .join('\n')}${
          splitBundleCoversAllPositions
            ? '\n\nВсе позиции сметы распределены по расчётам связки.'
            : ''
        }${
          splitBundleMismatchCount > 0
            ? `\n\n⚠ Связка собрана из разных смет (${splitBundleMismatchCount} расч. с другим составом) — «Разделение сметы» заблокировано. Связка должна состоять из копий одной сметы.`
            : ''
        }`
      : '';
  const updatedLabel = it.updatedAt
    ? new Date(it.updatedAt).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
  const isChildRow = Boolean(childOfAddress);
  const addressKey = estimateObjectAddressKey(it);
  const objectAddressLabel =
    showObjectAddress && addressKey !== ESTIMATES_NO_ADDRESS_KEY
      ? estimateObjectAddressDisplayLabel(addressKey)
      : null;
  const rowClass = isChildRow
    ? `${dataTableStyles.row} ${cdEstimatesList.estimatesListEstimateRow} ${cdBase.contractsListChildRow}${
        lastAddressChild ? ` ${cdEstimatesList.estimatesListChildRowLast}` : ''
      }`
    : standaloneCard
      ? `${dataTableStyles.row} ${cdEstimatesList.estimatesListEstimateRow} ${cdEstimatesList.estimatesListStandaloneCard}`
      : `${dataTableStyles.row} ${cdEstimatesList.estimatesListEstimateRow}`;

  return (
    <tr key={it.id} className={rowClass}>
      <td className={cdEstimatesList.contractsListSelectCol} />
      <td className={cdEstimatesList.estimatesListTitleCell}>
        <div className={cdEstimatesList.estimatesCardTitleRow}>
          <span className={cdEstimatesList.estimatesCardTitle}>{it.title}</span>
          {hasLockedUsage ? (
            <span
              className={cdEstimatesList.estimatesBadge}
              title="Расчёт нельзя редактировать: договор подписан или Д/с подписано"
              aria-label="Расчёт заблокирован для редактирования"
            >
              🔒
            </span>
          ) : null}
          {inSplitBundle && splitBundleCount >= 2 ? (
            <span
              className={`${cdEstimatesList.estimatesBadge} ${cdEstimatesList.estimatesSplitBundleBadge}${
                splitBundleCoversAllPositions
                  ? ` ${cdEstimatesList.estimatesSplitBundleBadgeComplete}`
                  : ''
              }`}
              title={splitBundleTooltip}
            >
              Связка{' '}
              {splitBundleBadgeFraction
                ? `${splitBundleBadgeFraction.bundleOrdinal}/${splitBundleBadgeFraction.memberOrdinal}`
                : null}
            </span>
          ) : null}
        </div>
        {objectAddressLabel ? (
          <div className={cdEstimatesList.estimatesSoloObjectAddress} title="Адрес объекта">
            📍 {objectAddressLabel}
          </div>
        ) : null}
      </td>
      <td
        className={cdEstimatesList.estimatesListDirectionCell}
        title={it.direction ? 'Направление расчёта' : 'Направление не задано (старый расчёт)'}
      >
        {it.direction ? packageKindUiLabel(it.direction) : '—'}
      </td>
      <td className={cdEstimatesList.estimatesListDateCell}>{updatedLabel}</td>
      <td
        className={cdEstimatesList.estimatesListCustomerCell}
        title={it.customerName?.trim() || undefined}
      >
        <span className={cdEstimatesList.estimatesListCustomerName}>
          {it.customerName?.trim() || '—'}
        </span>
      </td>
      <td
        className={cdEstimatesList.estimatesListAuthorCell}
        title={it.createdByName?.trim() || undefined}
      >
        {it.createdByName?.trim() || '—'}
      </td>
      <td className={cdEstimatesList.estimatesListCostCell}>
        {hasSnapshotTotal ? (
          <>
            <span>{formatEstimateListTableCost(snapshotTotal)}</span>
            {showFullEstimateTotalInParens ? (
              <span className={cdEstimatesList.estimatesCardCostFull}>
                {' '}
                ({formatEstimateListTableCost(fullSnapshotTotal)})
              </span>
            ) : null}
          </>
        ) : (
          '—'
        )}
      </td>
      <EstimatePresetRowUsageCell preset={it} usageByEstimateId={usageByEstimateId} />
      <EstimatePresetRowMarkupCell
        preset={it}
        saving={saving}
        usageByEstimateId={usageByEstimateId}
        onPresetMarkupChange={onPresetMarkupChange}
      />
      <EstimatePresetRowActions
        preset={it}
        saving={saving}
        pipelineTab={pipelineTab}
        groups={groups}
        items={items}
        usageByEstimateId={usageByEstimateId}
        router={router}
        onPresetPipelineStage={onPresetPipelineStage}
        onDetachEdit={onDetachEdit}
        onCopyPreset={onCopyPreset}
        onOpenWorkScopeSplit={onOpenWorkScopeSplit}
        onTrashPreset={onTrashPreset}
        onOpenPreview={onOpenPreview}
      />
    </tr>
  );
}
