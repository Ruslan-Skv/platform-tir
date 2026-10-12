'use client';

import { useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type ContractEstimateTransferPayload,
  getContractDocumentEstimatePresetExport,
} from '@/shared/api/admin-contract-document-packages';
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
import { estimateBundleHasSignedMember } from './estimatesListPipelineTabs';
import {
  EstimatesDeferIcon,
  EstimatesPreviewIcon,
  EstimatesToActiveIcon,
} from './estimatesListTableUi';
import { isUsageLocked } from './estimatesListUtils';

function downloadEstimateTransferFile(payload: ContractEstimateTransferPayload, title: string) {
  const safeTitle =
    title
      .trim()
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .slice(0, 60) || 'расчёт';
  const day = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `расчёт-${safeTitle}-${day}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export type EstimatePresetRowActionsProps = Pick<
  EstimatePresetTableRowProps,
  | 'preset'
  | 'saving'
  | 'pipelineTab'
  | 'groups'
  | 'items'
  | 'usageByEstimateId'
  | 'router'
  | 'onPresetPipelineStage'
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
  pipelineTab,
  groups,
  items,
  usageByEstimateId,
  router,
  onPresetPipelineStage,
  onDetachEdit,
  onCopyPreset,
  onOpenWorkScopeSplit,
  onTrashPreset,
  onOpenPreview,
  as = 'cell',
}: EstimatePresetRowActionsProps) {
  const usages = usageByEstimateId.get(it.id) ?? [];
  const hasLockedUsage = usages.some((u) => isUsageLocked(u));
  const inSplitBundle = Boolean(resolveSplitBundleId(it, items));
  const bundleSigned = estimateBundleHasSignedMember(it, items, usageByEstimateId);
  const splitTree = buildEstimateWorkScopeTree(it, groups);
  const canOpenWorkScopeSplit = splitTree.length > 0;
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const payload = await getContractDocumentEstimatePresetExport('REPAIR', it.id);
      downloadEstimateTransferFile(payload, it.title);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Не удалось выгрузить расчёт');
    } finally {
      setExporting(false);
    }
  };

  const actions = (
    <div
      className={`${cdEstimatesList.estimatesCardActions} ${cdEstimatesList.estimatesListActionsGrid}`}
    >
      <div className={cdEstimatesList.contractsListActionsSlot}>
        {pipelineTab === 'deferred' ? (
          <button
            type="button"
            className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
            disabled={saving}
            aria-label="В работу"
            title="Вернуть расчёт на вкладку «В работе» (связка перемещается целиком)"
            onClick={() => onPresetPipelineStage(it.id, 'active')}
          >
            <EstimatesToActiveIcon />
          </button>
        ) : pipelineTab === 'active' || pipelineTab === 'attached' ? (
          <button
            type="button"
            className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
            disabled={saving || bundleSigned}
            aria-label="Отложить"
            title={
              bundleSigned
                ? 'Отложение недоступно: в связке есть подписанный расчёт'
                : pipelineTab === 'attached'
                  ? 'Отложить: заказчик взял паузу по прикреплённому расчёту (связка перемещается целиком)'
                  : 'Отложить: заказчик взял паузу — подумать, сделать позже (связка перемещается целиком)'
            }
            onClick={() => onPresetPipelineStage(it.id, 'deferred')}
          >
            <EstimatesDeferIcon />
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
        {canOpenWorkScopeSplit ? (
          <button
            type="button"
            className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
            aria-label="Состав работ по договорам"
            title={
              pipelineTab === 'attached' || pipelineTab === 'signed'
                ? 'Недоступно: разделение сметы доступно на вкладках «В работе» и «Отложенные»'
                : 'Разделение сметы: выбор позиций для этого экземпляра и связанных копий'
            }
            disabled={
              saving || hasLockedUsage || (pipelineTab !== 'active' && pipelineTab !== 'deferred')
            }
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
        {isSuperAdmin ? (
          <AdminTableIconButton
            aria-label="Выгрузить расчёт в файл"
            title="Выгрузить расчёт (со связкой, объектом и каталогом) в JSON-файл переноса — только для суперадмина"
            disabled={saving || exporting}
            onClick={() => void handleExport()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </AdminTableIconButton>
        ) : null}
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
    </div>
  );

  if (as === 'inline') return actions;
  return <td className={cdEstimatesList.contractsListActionsCol}>{actions}</td>;
}
