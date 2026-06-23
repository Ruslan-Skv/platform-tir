'use client';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import type { EstimatePipelineTab } from '@/views/admin/ContractDocuments/packages/platform/estimates/estimatePipelineStage';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdEstimatesList from '@/views/admin/ContractDocuments/styles/estimates-list.module.css';

import {
  EstimatesArchiveIcon,
  EstimatesRestoreFromArchiveIcon,
  EstimatesToActiveIcon,
  EstimatesToProspectIcon,
  unifiedGroupIdForEstimates,
} from './estimatesListTableUi';
import { type EstimatePackageUsage, estimateObjectAddressDisplayLabel } from './estimatesListUtils';

export type EstimateAddressGroupSection = {
  addressKey: string;
  items: ContractEstimatePreset[];
};

export type EstimateAddressGroupTableRowProps = {
  section: EstimateAddressGroupSection;
  saving: boolean;
  archiveView: boolean;
  pipelineTab: EstimatePipelineTab;
  groups: ContractEstimateGroup[];
  usageByEstimateId: Map<string, EstimatePackageUsage[]>;
  groupIdsWithLockedEstimate: Set<string>;
  effectiveExpandedAddressKey: string | null;
  onToggleAddressExpand: (addressKey: string) => void;
  onAddressPipelineStage: (addressKey: string, tab: EstimatePipelineTab) => void;
  onSetEstimatesArchivedByAddress: (addressKey: string, archived: boolean) => void;
  onGroupMarkupChange: (groupId: string, raw: string) => void;
};

export function EstimateAddressGroupTableRow({
  section,
  saving,
  archiveView,
  pipelineTab,
  groups,
  usageByEstimateId,
  groupIdsWithLockedEstimate,
  effectiveExpandedAddressKey,
  onToggleAddressExpand,
  onAddressPipelineStage,
  onSetEstimatesArchivedByAddress,
  onGroupMarkupChange,
}: EstimateAddressGroupTableRowProps) {
  const expanded = effectiveExpandedAddressKey === section.addressKey;
  const boundInGroup = section.items.filter(
    (it) => (usageByEstimateId.get(it.id)?.length ?? 0) > 0
  ).length;
  const hasBound = boundInGroup > 0;
  const unifiedGroupId = unifiedGroupIdForEstimates(section.items);
  const unifiedGroup = unifiedGroupId ? groups.find((g) => g.id === unifiedGroupId) : undefined;

  return (
    <tr
      key={section.addressKey}
      className={`${dataTableStyles.row} ${cdBase.contractsListObjectRow} ${
        expanded ? cdBase.contractsListObjectRowExpanded : ''
      }`}
    >
      <td className={cdEstimatesList.contractsListSelectCol}>
        <button
          type="button"
          className={cdBase.contractsListExpandBtn}
          aria-expanded={expanded}
          aria-label={expanded ? 'Свернуть расчёты объекта' : 'Развернуть расчёты объекта'}
          title={expanded ? 'Свернуть' : 'Развернуть'}
          disabled={saving}
          onClick={() => onToggleAddressExpand(section.addressKey)}
        >
          {expanded ? '▼' : '▶'}
        </button>
      </td>
      <td className={cdEstimatesList.estimatesListTitleCell}>
        <span className={cdBase.estimatesListObjectAddressLabel}>
          {estimateObjectAddressDisplayLabel(section.addressKey)}
        </span>
        <span className={cdBase.contractsListObjectBadge}>
          {section.items.length} расч.
          {boundInGroup > 0 ? ` · привяз. ${boundInGroup}` : ''}
        </span>
      </td>
      <td className={cdEstimatesList.estimatesListDateCell}>—</td>
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
      <td className={cdEstimatesList.contractsListActionsCol}>
        <div
          className={`${cdEstimatesList.estimatesCardActions} ${cdEstimatesList.estimatesListActionsRow}`}
        >
          {!archiveView && pipelineTab === 'active' && section.items.length > 0 ? (
            <button
              type="button"
              className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
              disabled={saving}
              aria-label="В перспективу"
              title={
                unifiedGroup
                  ? 'Перенести объект и все расчёты на вкладку «В перспективе»'
                  : 'Перенести все расчёты по этому адресу на вкладку «В перспективе»'
              }
              onClick={() => onAddressPipelineStage(section.addressKey, 'prospect')}
            >
              <EstimatesToProspectIcon />
            </button>
          ) : null}
          {!archiveView && pipelineTab === 'prospect' && section.items.length > 0 ? (
            <button
              type="button"
              className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
              disabled={saving}
              aria-label="В работе"
              title={
                unifiedGroup
                  ? 'Вернуть объект и все расчёты на вкладку «В работе»'
                  : 'Вернуть все расчёты по этому адресу на вкладку «В работе»'
              }
              onClick={() => onAddressPipelineStage(section.addressKey, 'active')}
            >
              <EstimatesToActiveIcon />
            </button>
          ) : null}
          {!archiveView && pipelineTab === 'active' && section.items.length > 0 ? (
            <button
              data-admin-mutation
              type="button"
              className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
              disabled={saving}
              aria-label="В архив"
              title="Отправить все расчёты по этому адресу в архив"
              onClick={() => onSetEstimatesArchivedByAddress(section.addressKey, true)}
            >
              <EstimatesArchiveIcon />
            </button>
          ) : null}
          {archiveView ? (
            <button
              data-admin-mutation
              type="button"
              className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
              disabled={saving}
              aria-label="Восстановить"
              title="Вернуть все расчёты по этому адресу в основной список"
              onClick={() => onSetEstimatesArchivedByAddress(section.addressKey, false)}
            >
              <EstimatesRestoreFromArchiveIcon />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
