'use client';

import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { CopyIcon } from '@/shared/ui/icons/CopyIcon';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';
import {
  buildEstimateWorkScopeTree,
  resolveSplitBundleId,
} from '@/views/admin/ContractDocuments/packages/platform/estimates/estimateWorkScopeTree';
import cdEstimatesList from '@/views/admin/ContractDocuments/styles/estimates-list.module.css';

import type { EstimatePresetTableRowProps } from './EstimatePresetTableRow';
import {
  EstimatesArchiveIcon,
  EstimatesRestoreFromArchiveIcon,
  EstimatesToActiveIcon,
  EstimatesToProspectIcon,
} from './estimatesListTableUi';
import { isUsageLocked } from './estimatesListUtils';

export type EstimatePresetRowActionsProps = Pick<
  EstimatePresetTableRowProps,
  | 'preset'
  | 'saving'
  | 'archiveView'
  | 'pipelineTab'
  | 'groups'
  | 'items'
  | 'usageByEstimateId'
  | 'router'
  | 'onPresetPipelineStage'
  | 'onPresetArchived'
  | 'onDetachEdit'
  | 'onCopyPreset'
  | 'onOpenWorkScopeSplit'
  | 'onTrashPreset'
>;

export function EstimatePresetRowActions({
  preset: it,
  saving,
  archiveView,
  pipelineTab,
  groups,
  items,
  usageByEstimateId,
  router,
  onPresetPipelineStage,
  onPresetArchived,
  onDetachEdit,
  onCopyPreset,
  onOpenWorkScopeSplit,
  onTrashPreset,
}: EstimatePresetRowActionsProps) {
  const usages = usageByEstimateId.get(it.id) ?? [];
  const isBound = usages.length > 0;
  const hasLockedUsage = usages.some((u) => isUsageLocked(u));
  const groupForIt = it.groupId ? groups.find((g) => g.id === it.groupId) : undefined;
  const groupArchived = Boolean(groupForIt?.archived);
  const canPresetArchive = !isBound && !it.archived && !groupArchived;
  const canPresetRestoreFromArchive = Boolean(it.archived) && !groupArchived;
  const inSplitBundle = Boolean(resolveSplitBundleId(it, items));
  const splitTree = buildEstimateWorkScopeTree(it, groups);
  const canOpenWorkScopeSplit = splitTree.length > 0;

  return (
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
            data-admin-mutation
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
            data-admin-mutation
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
  );
}
