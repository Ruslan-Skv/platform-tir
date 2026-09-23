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
  EstimatesPreviewIcon,
  EstimatesRestoreFromArchiveIcon,
  EstimatesToActiveIcon,
  EstimatesToContractsIcon,
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
  | 'onArchivePreset'
  | 'onDetachEdit'
  | 'onCopyPreset'
  | 'onOpenWorkScopeSplit'
  | 'onTrashPreset'
  | 'onOpenPreview'
> & {
  /** `cell` — `<td>` для таблицы; `inline` — блок для мобильных карточек. */
  as?: 'cell' | 'inline';
};

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
  onArchivePreset,
  onDetachEdit,
  onCopyPreset,
  onOpenWorkScopeSplit,
  onTrashPreset,
  onOpenPreview,
  as = 'cell',
}: EstimatePresetRowActionsProps) {
  const usages = usageByEstimateId.get(it.id) ?? [];
  const isBound = usages.length > 0;
  const hasLockedUsage = usages.some((u) => isUsageLocked(u));
  const groupForIt = it.groupId ? groups.find((g) => g.id === it.groupId) : undefined;
  const groupArchived = Boolean(groupForIt?.archived);
  const canPresetRestoreFromArchive = Boolean(it.archived) && !groupArchived;
  const inSplitBundle = Boolean(resolveSplitBundleId(it, items));
  const splitTree = buildEstimateWorkScopeTree(it, groups);
  const canOpenWorkScopeSplit = splitTree.length > 0;

  const actions = (
    <div
      className={`${cdEstimatesList.estimatesCardActions} ${cdEstimatesList.estimatesListActionsGrid}`}
    >
      <div className={cdEstimatesList.contractsListActionsSlot}>
        {!archiveView && pipelineTab === 'active' ? (
          <button
            type="button"
            className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
            disabled={saving || hasLockedUsage}
            aria-label="В перспективу"
            title={
              hasLockedUsage
                ? 'Перенос в перспективу недоступен: договор подписан или Д/с подписано'
                : 'Перенести расчёт на вкладку «В перспективе»'
            }
            onClick={() => onPresetPipelineStage(it.id, 'prospect')}
          >
            <EstimatesToProspectIcon />
          </button>
        ) : null}
        {!archiveView && (pipelineTab === 'prospect' || pipelineTab === 'contract') ? (
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
      </div>
      <div className={cdEstimatesList.contractsListActionsSlot}>
        {!archiveView && !it.archived && !groupArchived ? (
          <button
            data-admin-mutation
            type="button"
            className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
            disabled={saving || isBound}
            aria-label="В архив"
            title={
              isBound
                ? 'Архив недоступен: расчёт прикреплён к договору или Д/с'
                : 'Отправить расчёт в архив: скрыть из основного списка и из выбора при оформлении договоров'
            }
            onClick={() =>
              onArchivePreset({
                estimateId: it.id,
                title: it.title.trim() || 'Расчёт',
              })
            }
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
      </div>
      <div className={cdEstimatesList.contractsListActionsSlot}>
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
      </div>
      <div className={cdEstimatesList.contractsListActionsSlot}>
        <AdminTableIconButton
          aria-label="Копировать расчёт"
          title="Создать копию: обычную или связанную"
          disabled={saving}
          onClick={() => onCopyPreset(it.id)}
        >
          <CopyIcon />
        </AdminTableIconButton>
      </div>
      <div className={cdEstimatesList.contractsListActionsSlot}>
        {canOpenWorkScopeSplit && !archiveView ? (
          <button
            type="button"
            className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
            aria-label="Состав работ по договорам"
            title={
              pipelineTab === 'prospect'
                ? 'Недоступно на вкладке «В перспективе»: разделение сметы доступно на вкладке «В работе»'
                : pipelineTab === 'contract'
                  ? 'Недоступно на вкладке «В договорах»: разделение сметы доступно на вкладке «В работе»'
                  : 'Разделение сметы: выбор позиций для этого экземпляра и связанных копий'
            }
            disabled={saving || hasLockedUsage || pipelineTab !== 'active'}
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
      </div>
      <div className={cdEstimatesList.contractsListActionsSlot}>
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
      <div className={cdEstimatesList.contractsListActionsSlot}>
        <button
          type="button"
          className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
          aria-label="Предпросмотр расчёта"
          title="Посмотреть расчёт в виде сметы договора, не открывая редактор"
          onClick={() => onOpenPreview(it.id)}
        >
          <EstimatesPreviewIcon />
        </button>
      </div>
      <div className={cdEstimatesList.contractsListActionsSlot}>
        {!archiveView ? (
          <button
            data-admin-mutation
            type="button"
            className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
            disabled={saving || pipelineTab !== 'active' || !hasLockedUsage}
            aria-label="В договорах"
            title={
              pipelineTab === 'prospect'
                ? 'Недоступно на вкладке «В перспективе»: перенос в договоры доступен на вкладке «В работе»'
                : pipelineTab === 'contract'
                  ? 'Расчёт уже находится на вкладке «В договорах»'
                  : hasLockedUsage
                    ? 'Перенести расчёт на вкладку «В договорах» (договор подписан)'
                    : 'Доступно после подписания договора или Д/с, к которым прикреплён расчёт'
            }
            onClick={() => onPresetPipelineStage(it.id, 'contract')}
          >
            <EstimatesToContractsIcon />
          </button>
        ) : null}
      </div>
    </div>
  );

  if (as === 'inline') return actions;
  return <td className={cdEstimatesList.contractsListActionsCol}>{actions}</td>;
}
