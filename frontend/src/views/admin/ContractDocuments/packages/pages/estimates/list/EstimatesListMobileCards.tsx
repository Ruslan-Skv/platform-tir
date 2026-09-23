'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import {
  getBaseSnapshotWithMarkupForPreset,
  getSnapshotForEstimateAttach,
} from '@/views/admin/ContractDocuments/packages/platform/estimates/applyEstimatePresetIds';
import type { EstimatePipelineTab } from '@/views/admin/ContractDocuments/packages/platform/estimates/estimatePipelineStage';
import { getSplitBundleBadgeFraction } from '@/views/admin/ContractDocuments/packages/platform/estimates/estimateSplitBundle';
import {
  listPresetsInSplitBundle,
  resolveSplitBundleId,
} from '@/views/admin/ContractDocuments/packages/platform/estimates/estimateWorkScopeTree';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdEstimatesList from '@/views/admin/ContractDocuments/styles/estimates-list.module.css';

import { packageKindUiLabel } from '../../../config/packageDirectionRegistry';
import type { EstimateArchiveConfirmState } from '../modals/EstimateArchiveConfirmModal';
import type { EstimateTrashConfirmState } from '../modals/EstimateTrashConfirmModal';
import { EstimatePresetRowActions } from './EstimatePresetRowActions';
import type { EstimatesTableDisplayItem } from './estimatesListLayout';
import { unifiedGroupIdForEstimates } from './estimatesListTableUi';
import {
  type EstimatePackageUsage,
  estimateObjectAddressDisplayLabel,
  formatEstimateGroupAuthorLabel,
  formatEstimateListTableCost,
  formatEstimatePackageUsageLabel,
  isUsageLocked,
  splitBundleCoversAllWorkScopeLines,
} from './estimatesListUtils';

export type EstimatesListMobileCardsProps = {
  archiveView: boolean;
  pipelineTab: EstimatePipelineTab;
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
  visibleItemCount: number;
  hasAnythingInArchive: boolean;
  hasActiveListFilters: boolean;
  totalTableRows: number;
  paginatedDisplayItems: EstimatesTableDisplayItem[];
  groups: ContractEstimateGroup[];
  items: ContractEstimatePreset[];
  usageByEstimateId: Map<string, EstimatePackageUsage[]>;
  groupIdsWithLockedEstimate: Set<string>;
  effectiveExpandedAddressKeys: string[];
  onToggleAddressExpand: (addressKey: string) => void;
  onGroupMarkupChange: (groupId: string, raw: string) => void;
  router: AppRouterInstance;
  onPresetPipelineStage: (presetId: string, tab: EstimatePipelineTab) => void;
  onPresetArchived: (presetId: string, archived: boolean) => void;
  onArchivePreset: (state: EstimateArchiveConfirmState) => void;
  onPresetMarkupChange: (presetId: string, raw: string) => void;
  onDetachEdit: (estimateId: string, usages: EstimatePackageUsage[]) => void;
  onCopyPreset: (presetId: string) => void;
  onOpenWorkScopeSplit: (presetId: string) => void;
  onTrashPreset: (state: EstimateTrashConfirmState) => void;
  onOpenPreview: (presetId: string) => void;
};

function EstimateMobileCard({
  preset: it,
  nested,
  saving,
  archiveView,
  pipelineTab,
  groups,
  items,
  usageByEstimateId,
  router,
  onPresetPipelineStage,
  onPresetArchived,
  onArchivePreset,
  onPresetMarkupChange,
  onDetachEdit,
  onCopyPreset,
  onOpenWorkScopeSplit,
  onTrashPreset,
  onOpenPreview,
}: {
  preset: ContractEstimatePreset;
  nested?: boolean;
} & Pick<
  EstimatesListMobileCardsProps,
  | 'saving'
  | 'archiveView'
  | 'pipelineTab'
  | 'groups'
  | 'items'
  | 'usageByEstimateId'
  | 'router'
  | 'onPresetPipelineStage'
  | 'onPresetArchived'
  | 'onArchivePreset'
  | 'onPresetMarkupChange'
  | 'onDetachEdit'
  | 'onCopyPreset'
  | 'onOpenWorkScopeSplit'
  | 'onTrashPreset'
  | 'onOpenPreview'
>) {
  const usages = usageByEstimateId.get(it.id) ?? [];
  const hasLockedUsage = usages.some((u) => isUsageLocked(u));
  const isBound = usages.length > 0;
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
  const splitBundleAll = listPresetsInSplitBundle(it, items);
  const splitBundleCount = splitBundleAll.length;
  const splitBundleBadgeFraction = getSplitBundleBadgeFraction(it, items);
  const splitBundleCoversAllPositions = splitBundleCoversAllWorkScopeLines(
    it,
    splitBundleAll,
    groups
  );

  const updatedLabel = it.updatedAt
    ? new Date(it.updatedAt).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <article
      className={`${cdHub.contractsMobileCard}${nested ? ` ${cdHub.contractsMobileCardNested}` : ''}`}
    >
      <div className={cdHub.contractsMobileCardMain}>
        <div className={cdHub.contractsMobileCardTop}>
          <div className={cdEstimatesList.estimatesCardTitleRow}>
            <span className={cdHub.contractsMobileCardTitle}>{it.title.trim() || 'Расчёт'}</span>
            {hasLockedUsage ? (
              <span
                className={cdEstimatesList.estimatesBadge}
                title="Расчёт заблокирован"
                aria-label="Расчёт заблокирован"
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
              >
                Связка{' '}
                {splitBundleBadgeFraction
                  ? `${splitBundleBadgeFraction.bundleOrdinal}/${splitBundleBadgeFraction.memberOrdinal}`
                  : null}
              </span>
            ) : null}
          </div>
        </div>
        <dl className={cdHub.contractsMobileCardRows}>
          <div className={cdHub.contractsMobileCardRow}>
            <dt>Направление</dt>
            <dd>{it.direction ? packageKindUiLabel(it.direction) : '—'}</dd>
          </div>
          <div className={cdHub.contractsMobileCardRow}>
            <dt>Дата</dt>
            <dd>{updatedLabel}</dd>
          </div>
          <div className={cdHub.contractsMobileCardRow}>
            <dt>Автор</dt>
            <dd>{it.createdByName?.trim() || '—'}</dd>
          </div>
          <div className={cdHub.contractsMobileCardRow}>
            <dt>Стоимость</dt>
            <dd>
              {hasSnapshotTotal ? (
                <>
                  {formatEstimateListTableCost(snapshotTotal)}
                  {showFullEstimateTotalInParens
                    ? ` (${formatEstimateListTableCost(fullSnapshotTotal)})`
                    : ''}
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div className={cdHub.contractsMobileCardRow}>
            <dt>Привязка</dt>
            <dd>
              <span
                className={`${cdEstimatesList.estimatesBadge} ${isBound ? cdEstimatesList.estimatesBadgeBound : cdEstimatesList.estimatesBadgeFree}`}
              >
                {isBound ? boundBadgeText : 'Не привязан'}
              </span>
            </dd>
          </div>
          <div className={cdEstimatesList.estimatesMobileMarkupRow}>
            <span className={cdEstimatesList.estimatesMobileMarkupLabel}>Наценка, %</span>
            <input
              key={`${it.id}:markup-mobile:${it.additionalMarkupPercent ?? 'none'}`}
              type="number"
              min={0}
              max={999}
              step={0.1}
              className={cdEstimatesList.estimatesListMarkupInput}
              defaultValue={
                typeof it.additionalMarkupPercent === 'number'
                  ? String(it.additionalMarkupPercent)
                  : '0'
              }
              disabled={saving || hasLockedUsage}
              aria-label="Наценка, %"
              onFocus={(e) => {
                e.currentTarget.dataset.markupAtFocus = e.currentTarget.value;
              }}
              onBlur={(e) => {
                if (e.currentTarget.dataset.markupAtFocus === e.currentTarget.value) return;
                onPresetMarkupChange(it.id, e.target.value);
              }}
            />
          </div>
        </dl>
      </div>
      <div className={cdHub.contractsMobileCardActions}>
        <EstimatePresetRowActions
          as="inline"
          preset={it}
          saving={saving}
          archiveView={archiveView}
          pipelineTab={pipelineTab}
          groups={groups}
          items={items}
          usageByEstimateId={usageByEstimateId}
          router={router}
          onPresetPipelineStage={onPresetPipelineStage}
          onPresetArchived={onPresetArchived}
          onArchivePreset={onArchivePreset}
          onDetachEdit={onDetachEdit}
          onCopyPreset={onCopyPreset}
          onOpenWorkScopeSplit={onOpenWorkScopeSplit}
          onTrashPreset={onTrashPreset}
          onOpenPreview={onOpenPreview}
        />
      </div>
    </article>
  );
}

export function EstimatesListMobileCards({
  archiveView,
  pipelineTab,
  loading,
  refreshing,
  saving,
  visibleItemCount,
  hasAnythingInArchive,
  hasActiveListFilters,
  totalTableRows,
  paginatedDisplayItems,
  groups,
  items,
  usageByEstimateId,
  groupIdsWithLockedEstimate,
  effectiveExpandedAddressKeys,
  onToggleAddressExpand,
  onGroupMarkupChange,
  router,
  onPresetPipelineStage,
  onPresetArchived,
  onArchivePreset,
  onPresetMarkupChange,
  onDetachEdit,
  onCopyPreset,
  onOpenWorkScopeSplit,
  onTrashPreset,
  onOpenPreview,
}: EstimatesListMobileCardsProps) {
  if ((loading || refreshing) && visibleItemCount === 0) {
    return <p className={cdHub.contractsMobileEmpty}>Загрузка…</p>;
  }
  if (visibleItemCount === 0) {
    return (
      <p className={cdHub.contractsMobileEmpty}>
        {archiveView && !hasAnythingInArchive
          ? 'В архиве пока нет расчётов и объектов.'
          : hasActiveListFilters
            ? 'Нет расчётов по выбранным фильтрам.'
            : pipelineTab === 'prospect'
              ? 'На вкладке «В перспективе» пока нет расчётов.'
              : pipelineTab === 'contract'
                ? 'На вкладке «В договорах» пока нет расчётов.'
                : 'На вкладке «В работе» пока нет расчётов.'}
      </p>
    );
  }
  if (totalTableRows === 0) {
    return (
      <p className={cdHub.contractsMobileEmpty}>
        Нет строк для отображения. Разверните объект или смените режим списка.
      </p>
    );
  }

  return (
    <div className={cdHub.contractsMobileCards} aria-label="Список расчётов">
      {paginatedDisplayItems.map((item) => {
        if (item.type === 'gap') return null;

        if (item.type === 'soloArchivedSection') {
          return (
            <p key="_soloArchived" className={cdEstimatesList.estimatesMobileSectionHint}>
              В архиве отдельно (объект в основном списке)
            </p>
          );
        }

        if (item.type === 'estimate' && item.childOfAddress) {
          // Уже отрисованы внутри развёрнутого объекта — не дублируем.
          return null;
        }

        if (item.type === 'address') {
          const expanded = effectiveExpandedAddressKeys.includes(item.addressKey);
          const boundInGroup = item.items.filter(
            (it) => (usageByEstimateId.get(it.id)?.length ?? 0) > 0
          ).length;
          const unifiedGroupId = unifiedGroupIdForEstimates(item.items);
          const unifiedGroup = unifiedGroupId
            ? groups.find((g) => g.id === unifiedGroupId)
            : undefined;

          return (
            <div key={`addr-${item.addressKey}`} className={cdHub.contractsMobileObjectGroup}>
              <div className={cdHub.contractsMobileObjectHeader}>
                <div className={cdHub.contractsMobileObjectHeaderRow}>
                  <button
                    type="button"
                    className={cdHub.contractsMobileExpandBtn}
                    aria-expanded={expanded}
                    aria-label={
                      expanded ? 'Свернуть расчёты объекта' : 'Развернуть расчёты объекта'
                    }
                    title={expanded ? 'Свернуть' : 'Развернуть'}
                    disabled={saving}
                    onClick={() => onToggleAddressExpand(item.addressKey)}
                  >
                    {expanded ? '−' : '+'}
                  </button>
                  <div className={cdHub.contractsMobileObjectHeaderBody}>
                    <div className={cdHub.contractsMobileObjectTitle}>
                      {estimateObjectAddressDisplayLabel(item.addressKey)}
                      <span className={cdHub.contractsMobileObjectCount}>
                        ({item.items.length}
                        {boundInGroup > 0 ? ` · привяз. ${boundInGroup}` : ''})
                      </span>
                    </div>
                    <div
                      className={cdHub.contractsMobileObjectMeta}
                      title="Автор последнего прикреплённого расчёта объекта"
                    >
                      Автор: {formatEstimateGroupAuthorLabel(item.items)}
                    </div>
                    {unifiedGroup ? (
                      <div className={cdEstimatesList.estimatesMobileObjectMarkup}>
                        <span>Наценка объекта, %</span>
                        <input
                          key={`${unifiedGroup.id}:markup-mobile:${unifiedGroup.additionalMarkupPercent ?? 'none'}`}
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
                            if (e.currentTarget.dataset.markupAtFocus === e.currentTarget.value) {
                              return;
                            }
                            onGroupMarkupChange(unifiedGroup.id, e.target.value);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              {expanded
                ? item.items.map((preset) => (
                    <EstimateMobileCard
                      key={preset.id}
                      preset={preset}
                      nested
                      saving={saving}
                      archiveView={archiveView}
                      pipelineTab={pipelineTab}
                      groups={groups}
                      items={items}
                      usageByEstimateId={usageByEstimateId}
                      router={router}
                      onPresetPipelineStage={onPresetPipelineStage}
                      onPresetArchived={onPresetArchived}
                      onArchivePreset={onArchivePreset}
                      onPresetMarkupChange={onPresetMarkupChange}
                      onDetachEdit={onDetachEdit}
                      onCopyPreset={onCopyPreset}
                      onOpenWorkScopeSplit={onOpenWorkScopeSplit}
                      onTrashPreset={onTrashPreset}
                      onOpenPreview={onOpenPreview}
                    />
                  ))
                : null}
            </div>
          );
        }

        return (
          <EstimateMobileCard
            key={item.preset.id}
            preset={item.preset}
            saving={saving}
            archiveView={archiveView}
            pipelineTab={pipelineTab}
            groups={groups}
            items={items}
            usageByEstimateId={usageByEstimateId}
            router={router}
            onPresetPipelineStage={onPresetPipelineStage}
            onPresetArchived={onPresetArchived}
            onArchivePreset={onArchivePreset}
            onPresetMarkupChange={onPresetMarkupChange}
            onDetachEdit={onDetachEdit}
            onCopyPreset={onCopyPreset}
            onOpenWorkScopeSplit={onOpenWorkScopeSplit}
            onTrashPreset={onTrashPreset}
            onOpenPreview={onOpenPreview}
          />
        );
      })}
    </div>
  );
}
