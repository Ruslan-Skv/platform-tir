'use client';

import { useRef } from 'react';

import Link from 'next/link';

import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminToolbarTrashButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import {
  ESTIMATE_PIPELINE_TAB_LABELS,
  ESTIMATE_PIPELINE_TAB_TOOLTIPS,
  type EstimatePipelineTab,
} from '../../../platform/estimates/estimatePipelineStage';
import { EstimatesListRulesInfoTip } from './EstimatesListRulesInfoTip';
import type { EstimatesListViewMode } from './estimatesListFilters';

export type EstimatesListPageHeaderProps = {
  listViewMode: EstimatesListViewMode;
  visibleItemCount: number;
  addressGroupCount: number;
  autosaveVisible: boolean;
  pipelineTab: EstimatePipelineTab;
  pipelineTabCounts: Record<EstimatePipelineTab, number>;
  onPipelineTabChange: (tab: EstimatePipelineTab) => void;
  saving: boolean;
  refreshing: boolean;
  onGenerateFromMeasurement: () => void;
  onRefresh: () => void;
  trashCount: number;
  onOpenTrash: () => void;
  /** Импорт файла переноса расчёта (виден только суперадмину). */
  showImportControl?: boolean;
  importing?: boolean;
  onImportEstimateFile?: (file: File) => void;
};

export function EstimatesListPageHeader({
  listViewMode,
  visibleItemCount,
  addressGroupCount,
  autosaveVisible,
  pipelineTab,
  pipelineTabCounts,
  onPipelineTabChange,
  saving,
  refreshing,
  onGenerateFromMeasurement,
  onRefresh,
  trashCount,
  onOpenTrash,
  showImportControl,
  importing,
  onImportEstimateFile,
}: EstimatesListPageHeaderProps) {
  const disabled = saving || refreshing;
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const iconActions = (placement: 'desktop' | 'mobile') => (
    <div
      className={
        placement === 'mobile'
          ? cdEstimatesList.estimatesHeaderIconActionsMobile
          : cdEstimatesList.estimatesHeaderIconActionsDesktop
      }
    >
      <button
        type="button"
        className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesPageRefreshIconBtn}`}
        disabled={disabled}
        aria-busy={refreshing}
        aria-label={refreshing ? 'Обновление списка расчётов' : 'Обновить список расчётов'}
        title="Обновить"
        onClick={onRefresh}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={refreshing ? cdEstimatesList.estimatesRefreshIconSpinning : undefined}
          aria-hidden
        >
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </button>
      <AdminToolbarTrashButton
        trashCount={trashCount}
        onClick={onOpenTrash}
        title="Корзина расчётов"
        aria-label="Корзина расчётов"
      />
    </div>
  );

  return (
    <div className={cdEstimatesList.editorHeader}>
      <div>
        <div className={cdEstimatesList.estimatesEditorHeaderStack}>
          <div className={cdEstimatesList.contractsListHeaderLeft}>
            <div className={cdEstimatesList.estimatesHeaderTitleRow}>
              <div className={cdEstimatesList.estimatesHeaderTitleCluster}>
                <div className={cdEstimatesList.contractsListHeaderTitleGroup}>
                  <h1 className={cdEstimatesList.title}>Расчёты</h1>
                  <EstimatesListRulesInfoTip />
                </div>
                <div className={cdEstimatesList.titleWithAutosave}>
                  <span
                    className={cdEstimatesList.contractsListCount}
                    title={
                      listViewMode === 'by_object' && addressGroupCount > 0
                        ? `${visibleItemCount} расчётов · ${addressGroupCount} объектов`
                        : `${visibleItemCount} расчётов`
                    }
                  >
                    {listViewMode === 'by_object' && addressGroupCount > 0 ? (
                      <>
                        {visibleItemCount}/{addressGroupCount}
                      </>
                    ) : (
                      visibleItemCount
                    )}
                  </span>
                  <AdminSaveNotice visible={autosaveVisible}>Сохранено.</AdminSaveNotice>
                </div>
              </div>
              {iconActions('mobile')}
            </div>
          </div>
          <div
            className={`${cdEstimatesList.tabBar} ${cdEstimatesList.estimatesPipelineTabBar}`}
            role="tablist"
            aria-label="Вкладки списка расчётов"
          >
            {(['active', 'attached', 'signed', 'deferred'] as const).map((tab) => {
              const activeTabClass =
                tab === 'signed'
                  ? cdEstimatesList.estimatesPipelineTabActiveContract
                  : tab === 'deferred'
                    ? cdEstimatesList.estimatesPipelineTabActiveProspect
                    : tab === 'attached'
                      ? cdEstimatesList.estimatesPipelineTabActiveAttached
                      : cdEstimatesList.estimatesPipelineTabActiveWork;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={pipelineTab === tab}
                  title={ESTIMATE_PIPELINE_TAB_TOOLTIPS[tab]}
                  className={`${cdEstimatesList.tab} ${pipelineTab === tab ? activeTabClass : ''}`}
                  onClick={() => onPipelineTabChange(tab)}
                >
                  {ESTIMATE_PIPELINE_TAB_LABELS[tab]}
                  <span className={cdEstimatesList.estimatesPipelineTabCount}>
                    {pipelineTabCounts[tab]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className={cdEstimatesList.headerButtonsRow}>
        {showImportControl && onImportEstimateFile ? (
          <>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className={cdEstimatesList.estimatesListVisuallyHidden}
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) onImportEstimateFile(file);
              }}
            />
            <button
              data-admin-mutation
              type="button"
              className={cdEstimatesList.secondaryBtn}
              disabled={disabled || importing}
              title="Загрузить JSON-файл переноса расчёта (экспорт из другой базы) — только для суперадмина"
              onClick={() => importInputRef.current?.click()}
            >
              {importing ? 'Импорт…' : 'Импорт расчёта (JSON)'}
            </button>
          </>
        ) : null}
        <button
          data-admin-mutation
          type="button"
          className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesGenerateFromMeasurementBtn}`}
          disabled={disabled}
          onClick={onGenerateFromMeasurement}
        >
          + Новый расчёт из замера
        </button>
        <Link
          data-admin-mutation
          className={`${cdEstimatesList.primaryBtn} ${cdEstimatesList.estimatesCompactPrimaryLink}`}
          href="/admin/contract-documents/estimates/workspace"
          style={{ textDecoration: 'none' }}
        >
          + Новый расчёт
        </Link>
        {iconActions('desktop')}
      </div>
    </div>
  );
}
