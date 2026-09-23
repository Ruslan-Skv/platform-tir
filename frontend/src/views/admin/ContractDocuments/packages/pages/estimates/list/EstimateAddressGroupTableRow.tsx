'use client';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdEstimatesList from '@/views/admin/ContractDocuments/styles/estimates-list.module.css';

import { unifiedGroupIdForEstimates } from './estimatesListTableUi';
import {
  type EstimatePackageUsage,
  estimateObjectAddressDisplayLabel,
  formatEstimateGroupAuthorLabel,
  formatEstimateGroupUpdatedLabel,
} from './estimatesListUtils';

export type EstimateAddressGroupSection = {
  addressKey: string;
  items: ContractEstimatePreset[];
};

export type EstimateAddressGroupTableRowProps = {
  section: EstimateAddressGroupSection;
  saving: boolean;
  groups: ContractEstimateGroup[];
  usageByEstimateId: Map<string, EstimatePackageUsage[]>;
  groupIdsWithLockedEstimate: Set<string>;
  effectiveExpandedAddressKeys: string[];
  onToggleAddressExpand: (addressKey: string) => void;
  onGroupMarkupChange: (groupId: string, raw: string) => void;
};

export function EstimateAddressGroupTableRow({
  section,
  saving,
  groups,
  usageByEstimateId,
  groupIdsWithLockedEstimate,
  effectiveExpandedAddressKeys,
  onToggleAddressExpand,
  onGroupMarkupChange,
}: EstimateAddressGroupTableRowProps) {
  const expanded = effectiveExpandedAddressKeys.includes(section.addressKey);
  const boundInGroup = section.items.filter(
    (it) => (usageByEstimateId.get(it.id)?.length ?? 0) > 0
  ).length;
  const hasBound = boundInGroup > 0;
  const unifiedGroupId = unifiedGroupIdForEstimates(section.items);
  const unifiedGroup = unifiedGroupId ? groups.find((g) => g.id === unifiedGroupId) : undefined;

  return (
    <tr
      key={section.addressKey}
      className={`${dataTableStyles.row} ${cdBase.contractsListObjectRow} ${cdEstimatesList.estimatesListObjectRow} ${
        expanded
          ? `${cdBase.contractsListObjectRowExpanded} ${cdEstimatesList.estimatesListObjectRowExpanded}`
          : cdEstimatesList.estimatesListObjectRowCollapsed
      }`}
    >
      <td
        className={`${cdEstimatesList.contractsListSelectCol} ${cdBase.contractsListObjectAccentCell} ${cdEstimatesList.estimatesListObjectAccentCell}`}
      >
        <button
          type="button"
          className={cdBase.contractsListExpandBtn}
          aria-expanded={expanded}
          aria-label={expanded ? 'Свернуть расчёты объекта' : 'Развернуть расчёты объекта'}
          title={expanded ? 'Свернуть' : 'Развернуть'}
          disabled={saving}
          onClick={() => onToggleAddressExpand(section.addressKey)}
        >
          {expanded ? '−' : '+'}
        </button>
      </td>
      <td className={cdEstimatesList.estimatesListTitleCell}>
        <div className={cdBase.contractsListObjectMain}>
          <div className={cdBase.contractsListObjectTitleRow}>
            <span className={cdBase.contractsListObjectKindChip}>Объект</span>
            <span className={cdBase.estimatesListObjectAddressLabel}>
              {estimateObjectAddressDisplayLabel(section.addressKey)}
            </span>
            <span className={cdBase.contractsListObjectBadge}>
              ({section.items.length}
              {boundInGroup > 0 ? ` · привяз. ${boundInGroup}` : ''})
            </span>
          </div>
        </div>
      </td>
      <td className={cdEstimatesList.estimatesListDirectionCell}>—</td>
      <td
        className={cdEstimatesList.estimatesListDateCell}
        title="Дата последнего изменения расчётов объекта"
      >
        {formatEstimateGroupUpdatedLabel(section.items)}
      </td>
      <td
        className={cdEstimatesList.estimatesListAuthorCell}
        title="Автор последнего прикреплённого расчёта объекта"
      >
        {formatEstimateGroupAuthorLabel(section.items)}
      </td>
      <td className={cdEstimatesList.estimatesListCostCell}>—</td>
      <td className={cdEstimatesList.estimatesListBindingCell}>
        {hasBound ? (
          <span
            className={`${cdEstimatesList.estimatesBadge} ${cdEstimatesList.estimatesBadgeBound}`}
          >
            Есть привязки
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className={cdEstimatesList.estimatesListMarkupCell}>
        {unifiedGroup ? (
          <label
            className={`${cdEstimateTab.field} ${cdEstimatesList.estimatesListInlineField}`}
            title={
              groupIdsWithLockedEstimate.has(unifiedGroup.id)
                ? 'Нельзя менять наценку: в группе есть расчёт, прикреплённый к подписанному договору или Д/с.'
                : 'На все расчёты с этим адресом в одной группе: +% к цене каждой позиции в смете'
            }
          >
            <span className={cdEstimatesList.estimatesListVisuallyHidden}>Наценка, %</span>
            <input
              key={`${unifiedGroup.id}:markup:${unifiedGroup.additionalMarkupPercent ?? 'none'}`}
              type="number"
              min={0}
              max={999}
              step={0.1}
              className={cdEstimatesList.estimatesListMarkupInput}
              defaultValue={
                typeof unifiedGroup.additionalMarkupPercent === 'number'
                  ? String(unifiedGroup.additionalMarkupPercent)
                  : '0'
              }
              disabled={saving || groupIdsWithLockedEstimate.has(unifiedGroup.id)}
              onFocus={(e) => {
                e.currentTarget.dataset.markupAtFocus = e.currentTarget.value;
              }}
              onBlur={(e) => {
                if (e.currentTarget.dataset.markupAtFocus === e.currentTarget.value) return;
                onGroupMarkupChange(unifiedGroup.id, e.target.value);
              }}
            />
          </label>
        ) : (
          '—'
        )}
      </td>
      <td className={cdEstimatesList.contractsListActionsCol} />
    </tr>
  );
}
