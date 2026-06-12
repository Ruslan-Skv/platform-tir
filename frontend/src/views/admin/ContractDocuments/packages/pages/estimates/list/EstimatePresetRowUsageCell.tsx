'use client';

import cdEstimatesList from '@/views/admin/ContractDocuments/styles/estimates-list.module.css';

import type { EstimatePresetTableRowProps } from './EstimatePresetTableRow';
import { formatEstimatePackageUsageLabel } from './estimatesListUtils';

export type EstimatePresetRowUsageCellProps = Pick<
  EstimatePresetTableRowProps,
  'preset' | 'usageByEstimateId'
>;

export function EstimatePresetRowUsageCell({
  preset: it,
  usageByEstimateId,
}: EstimatePresetRowUsageCellProps) {
  const usages = usageByEstimateId.get(it.id) ?? [];
  const isBound = usages.length > 0;
  const primaryUsage = usages[0];
  const primaryLabel = primaryUsage ? formatEstimatePackageUsageLabel(primaryUsage) : '';
  const boundBadgeText = primaryUsage
    ? usages.length > 1
      ? `${primaryLabel} (+${usages.length - 1})`
      : primaryLabel
    : 'Не привязан';

  return (
    <td
      className={cdEstimatesList.estimatesListBindingCell}
      title={isBound ? boundBadgeText : undefined}
    >
      <span
        className={`${cdEstimatesList.estimatesBadge} ${isBound ? cdEstimatesList.estimatesBadgeBound : cdEstimatesList.estimatesBadgeFree}`}
      >
        {isBound ? boundBadgeText : 'Не привязан'}
      </span>
    </td>
  );
}
