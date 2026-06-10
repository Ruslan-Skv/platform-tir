'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import { CopyIcon } from '@/shared/ui/icons/CopyIcon';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';

import cdBase from '../../../../styles/base.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import {
  getBaseSnapshotWithMarkupForPreset,
  getSnapshotForEstimateAttach,
} from '../../../platform/estimates/applyEstimatePresetIds';
import type { EstimatePipelineTab } from '../../../platform/estimates/estimatePipelineStage';
import { getSplitBundleBadgeFraction } from '../../../platform/estimates/estimateSplitBundle';
import {
  buildEstimateWorkScopeTree,
  listPresetsInSplitBundle,
  resolveSplitBundleId,
} from '../../../platform/estimates/estimateWorkScopeTree';
import type { EstimateTrashConfirmState } from '../modals/EstimateTrashConfirmModal';
import {
  EstimatesArchiveIcon,
  EstimatesRestoreFromArchiveIcon,
  EstimatesToActiveIcon,
  EstimatesToProspectIcon,
  unifiedGroupIdForEstimates,
} from './estimatesListTableUi';
import {
  type EstimatePackageUsage,
  estimateObjectAddressDisplayLabel,
  formatEstimateListTableCost,
  formatEstimatePackageUsageLabel,
  isUsageLocked,
  splitBundleCoversAllWorkScopeLines,
} from './estimatesListUtils';

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

export type EstimatePresetTableRowProps = {
  preset: ContractEstimatePreset;
  childOfAddress?: boolean;
  saving: boolean;
  archiveView: boolean;
  pipelineTab: EstimatePipelineTab;
  groups: ContractEstimateGroup[];
  items: ContractEstimatePreset[];
  usageByEstimateId: Map<string, EstimatePackageUsage[]>;
  router: AppRouterInstance;
  onPresetPipelineStage: (presetId: string, tab: EstimatePipelineTab) => void;
  onPresetArchived: (presetId: string, archived: boolean) => void;
  onPresetMarkupChange: (presetId: string, raw: string) => void;
  onDetachEdit: (estimateId: string, usages: EstimatePackageUsage[]) => void;
  onCopyPreset: (presetId: string) => void;
  onOpenWorkScopeSplit: (presetId: string) => void;
  onTrashPreset: (state: EstimateTrashConfirmState) => void;
};

export function EstimatePresetTableRow({
  preset: it,
  childOfAddress,
  saving,
  archiveView,
  pipelineTab,
  groups,
  items,
  usageByEstimateId,
  router,
  onPresetPipelineStage,
  onPresetArchived,
  onPresetMarkupChange,
  onDetachEdit,
  onCopyPreset,
  onOpenWorkScopeSplit,
  onTrashPreset,
}: EstimatePresetTableRowProps) {
  const usages = usageByEstimateId.get(it.id) ?? [];
  const isBound = usages.length > 0;
  const hasLockedUsage = usages.some((u) => isUsageLocked(u));
  const groupForIt = it.groupId ? groups.find((g) => g.id === it.groupId) : undefined;
  const groupArchived = Boolean(groupForIt?.archived);
  const canPresetArchive = !isBound && !it.archived && !groupArchived;
  const canPresetRestoreFromArchive = Boolean(it.archived) && !groupArchived;
  const primaryUsage = usages[0];
  const primaryLabel = primaryUsage ? formatEstimatePackageUsageLabel(primaryUsage) : '';
  const boundBadgeText = primaryUsage
    ? usages.length > 1
      ? `${primaryLabel} (+${usages.length - 1})`
      : primaryLabel
    : 'Не привязан';
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
  const splitTree = buildEstimateWorkScopeTree(it, groups);
  const canOpenWorkScopeSplit = splitTree.length > 0;
  const splitBundleAll = listPresetsInSplitBundle(it, items);
  const splitBundleCount = splitBundleAll.length;
  const splitBundleBadgeFraction = getSplitBundleBadgeFraction(it, items);
  const splitBundleCoversAllPositions = splitBundleCoversAllWorkScopeLines(
    it,
    splitBundleAll,
    groups
  );
  const splitBundleTooltip =
    splitBundleCount >= 2
      ? `Расчётов в связке: ${splitBundleCount}\n${splitBundleAll
          .map((p) => `· ${p.title.trim() || 'Расчёт'}${p.id === it.id ? ' (этот)' : ''}`)
          .join('\n')}${
          splitBundleCoversAllPositions
            ? '\n\nВсе позиции сметы распределены по расчётам связки.'
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

  return (
    <tr
      key={it.id}
      className={`${dataTableStyles.row} ${cdEstimatesList.estimatesListEstimateRow}${
        isChildRow ? ` ${cdBase.contractsListChildRow}` : ''
      }`}
    >
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
      </td>
      <td className={cdEstimatesList.estimatesListDateCell}>{updatedLabel}</td>
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
      <td className={cdEstimatesList.estimatesListMarkupCell}>
        <label
          className={`${cdEstimateTab.field} ${cdEstimatesList.estimatesListInlineField}`}
          title={
            hasLockedUsage
              ? 'Нельзя менять наценку: расчёт закрыт для изменений (прикреплён к пакету со статусом «Договор подписан» или к подписанному Д/с).'
              : 'Доп. наценка к расчёту, %. Пусто — для расчёта в объекте действует наценка объекта; иначе +% к цене каждой позиции при прикреплении к смете.'
          }
        >
          <span className={cdEstimatesList.estimatesListVisuallyHidden}>Наценка, %</span>
          <input
            key={`${it.id}:markup:${it.additionalMarkupPercent ?? 'none'}`}
            type="number"
            min={0}
            max={999}
            step={0.1}
            defaultValue={
              typeof it.additionalMarkupPercent === 'number'
                ? String(it.additionalMarkupPercent)
                : '0'
            }
            disabled={saving || hasLockedUsage}
            onFocus={(e) => {
              e.currentTarget.dataset.markupAtFocus = e.currentTarget.value;
            }}
            onBlur={(e) => {
              if (e.currentTarget.dataset.markupAtFocus === e.currentTarget.value) return;
              onPresetMarkupChange(it.id, e.target.value);
            }}
          />
        </label>
      </td>
      <td className={cdEstimatesList.contractsListActionsCol}>
        <div
          className={`${cdEstimatesList.estimatesCardActions} ${cdEstimatesList.estimatesListActionsRow}`}
        >
          {!archiveView && pipelineTab === 'active' ? (
            <button
              type="button"
              className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
              disabled={saving}
              aria-label="В перспективу"
              title="Перенести расчёт на вкладку «В перспективе»"
              onClick={() => onPresetPipelineStage(it.id, 'prospect')}
            >
              <EstimatesToProspectIcon />
            </button>
          ) : null}
          {!archiveView && pipelineTab === 'prospect' ? (
            <button
              type="button"
              className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
              disabled={saving}
              aria-label="В работе"
              title="Вернуть расчёт на вкладку «В работе»"
              onClick={() => onPresetPipelineStage(it.id, 'active')}
            >
              <EstimatesToActiveIcon />
            </button>
          ) : null}
          {!archiveView && pipelineTab === 'active' && canPresetArchive ? (
            <button
              type="button"
              className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
              disabled={saving}
              aria-label="В архив"
              title="Отправить расчёт в архив: скрыть из основного списка и из выбора при оформлении договоров"
              onClick={() => onPresetArchived(it.id, true)}
            >
              <EstimatesArchiveIcon />
            </button>
          ) : null}
          {archiveView && canPresetRestoreFromArchive ? (
            <button
              type="button"
              className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
              disabled={saving}
              aria-label="Восстановить"
              title="Вернуть расчёт в основной список"
              onClick={() => onPresetArchived(it.id, false)}
            >
              <EstimatesRestoreFromArchiveIcon />
            </button>
          ) : null}
          <AdminTableIconButton
            aria-label="Редактировать"
            title={
              hasLockedUsage
                ? 'Редактирование запрещено: договор подписан или Д/с подписано'
                : 'Редактировать'
            }
            disabled={saving || hasLockedUsage}
            onClick={() => {
              if (hasLockedUsage) return;
              if (usages.length > 0) {
                onDetachEdit(it.id, [...usages]);
                return;
              }
              router.push(
                `/admin/contract-documents/estimates/workspace?id=${encodeURIComponent(it.id)}`
              );
            }}
          >
            <EditIcon />
          </AdminTableIconButton>
          <AdminTableIconButton
            aria-label="Копировать расчёт"
            title="Создать копию: обычную или связанную"
            disabled={saving}
            onClick={() => onCopyPreset(it.id)}
          >
            <CopyIcon />
          </AdminTableIconButton>
          {canOpenWorkScopeSplit && !archiveView && pipelineTab === 'active' ? (
            <button
              type="button"
              className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
              aria-label="Состав работ по договорам"
              title="Разделение сметы: выбор позиций для этого экземпляра и связанных копий"
              disabled={saving || hasLockedUsage}
              onClick={() => onOpenWorkScopeSplit(it.id)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--admin-chart-series-4)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M16 3h5v5" />
                <path d="M8 3H3v5" />
                <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
                <path d="m15 9 6-6" />
                <path d="M21 16v5h-5" />
                <path d="M8 21H3v-5" />
                <path d="M12 11V3" />
              </svg>
            </button>
          ) : null}
          <AdminTableIconButton
            aria-label={
              hasLockedUsage
                ? 'В корзину недоступно: договор подписан или Д/с подписано'
                : 'В корзину'
            }
            title={
              hasLockedUsage
                ? 'В корзину недоступно: договор подписан или Д/с подписано'
                : 'В корзину (восстановить можно из корзины)'
            }
            disabled={saving || hasLockedUsage}
            onClick={() => {
              if (hasLockedUsage) return;
              onTrashPreset({
                estimateId: it.id,
                title: it.title.trim() || 'Расчёт',
                inSplitBundle,
                detachedUsages: usages.length > 0 ? [...usages] : [],
              });
            }}
          >
            <DeleteIcon />
          </AdminTableIconButton>
        </div>
      </td>
    </tr>
  );
}
