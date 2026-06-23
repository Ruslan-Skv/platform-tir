'use client';

import Link from 'next/link';

import { AdminToolbarTrashButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import toolbarBadgeStyles from '@/shared/ui/admin/AdminToolbarIconButton/AdminToolbarTrashButton.module.css';
import measurementFormStyles from '@/views/admin/CRM/Measurements/form/MeasurementFormPage.module.css';

import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import {
  ESTIMATE_PIPELINE_TAB_LABELS,
  type EstimatePipelineTab,
} from '../../../platform/estimates/estimatePipelineStage';
import type { EstimatesListViewMode } from './estimatesListFilters';

export type EstimatesListPageHeaderProps = {
  archiveView: boolean;
  onNavigateArchiveView: (archive: boolean) => void;
  listViewMode: EstimatesListViewMode;
  visibleItemCount: number;
  addressGroupCount: number;
  autosaveVisible: boolean;
  pipelineTab: EstimatePipelineTab;
  pipelineTabCounts: { active: number; prospect: number };
  onPipelineTabChange: (tab: EstimatePipelineTab) => void;
  saving: boolean;
  refreshing: boolean;
  onGenerateFromMeasurement: () => void;
  onRefresh: () => void;
  trashCount: number;
  onOpenTrash: () => void;
  archiveCount: number;
};

export function EstimatesListPageHeader({
  archiveView,
  onNavigateArchiveView,
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
  archiveCount,
}: EstimatesListPageHeaderProps) {
  const disabled = saving || refreshing;

  return (
    <div className={cdEstimatesList.editorHeader}>
      <div>
        {archiveView ? (
          <button
            type="button"
            className={cdEstimatesList.backLink}
            onClick={() => onNavigateArchiveView(false)}
          >
            ← К основному списку расчётов
          </button>
        ) : null}
        <div className={cdEstimatesList.estimatesEditorHeaderStack}>
          <div className={cdEstimatesList.contractsListHeaderLeft}>
            <h1 className={cdEstimatesList.title}>{archiveView ? 'Архив расчётов' : 'Расчёты'}</h1>
            <div className={measurementFormStyles.titleWithAutosave}>
              <span
                className={cdEstimatesList.contractsListCount}
                title={
                  !archiveView
                    ? listViewMode === 'by_object' && addressGroupCount > 0
                      ? `${visibleItemCount} расчётов · ${addressGroupCount} объектов`
                      : `${visibleItemCount} расчётов`
                    : undefined
                }
              >
                {!archiveView ? (
                  listViewMode === 'by_object' && addressGroupCount > 0 ? (
                    <>
                      {visibleItemCount}/{addressGroupCount}
                    </>
                  ) : (
                    visibleItemCount
                  )
                ) : (
                  <>
                    {visibleItemCount} расч.
                    {listViewMode === 'by_object' && addressGroupCount > 0
                      ? ` · ${addressGroupCount} объектов`
                      : ''}
                  </>
                )}
              </span>
              <span
                className={`${measurementFormStyles.autosaveNotice} ${
                  autosaveVisible ? measurementFormStyles.autosaveNoticeVisible : ''
                }`}
                role="status"
                aria-live="polite"
              >
                Сохранено.
              </span>
            </div>
          </div>
          {!archiveView ? (
            <div
              className={`${cdEstimatesList.tabBar} ${cdEstimatesList.estimatesPipelineTabBar}`}
              role="tablist"
              aria-label="Вкладки списка расчётов"
            >
              {(['active', 'prospect'] as const).map((tab) => {
                const count =
                  tab === 'active' ? pipelineTabCounts.active : pipelineTabCounts.prospect;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={pipelineTab === tab}
                    className={`${cdEstimatesList.tab} ${
                      pipelineTab === tab
                        ? tab === 'prospect'
                          ? cdEstimatesList.estimatesPipelineTabActiveProspect
                          : cdEstimatesList.estimatesPipelineTabActiveWork
                        : ''
                    }`}
                    onClick={() => onPipelineTabChange(tab)}
                  >
                    {ESTIMATE_PIPELINE_TAB_LABELS[tab]}
                    <span className={cdEstimatesList.estimatesPipelineTabCount}>{count}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
      <div className={cdEstimatesList.headerButtonsRow}>
        {!archiveView ? (
          <>
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
          </>
        ) : null}
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
            className={refreshing ? cdChrome.estimatesRefreshIconSpinning : undefined}
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
        <span className={toolbarBadgeStyles.wrap}>
          <button
            type="button"
            className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesPageRefreshIconBtn} ${cdEstimatesList.estimatesPageArchiveIconBtn}`}
            disabled={disabled}
            aria-label={
              archiveView
                ? 'Вернуться к основному списку расчётов'
                : archiveCount > 0
                  ? `Архив: ${archiveCount > 99 ? 'более 99' : archiveCount} расч. в архиве`
                  : 'Архив: объекты и расчёты, отправленные в архив'
            }
            title={
              archiveView
                ? 'Вернуться к основному списку расчётов'
                : archiveCount > 0
                  ? `Архив (${archiveCount > 99 ? '99+' : archiveCount})`
                  : 'Объекты с расчётами, отправленные в архив'
            }
            onClick={() => onNavigateArchiveView(!archiveView)}
          >
            {archiveView ? (
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
                aria-hidden
              >
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
            ) : (
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
                aria-hidden
              >
                <path d="M21 8v13H3V8" />
                <path d="M23 3v5H1V3z" />
                <path d="M10 12h4" />
              </svg>
            )}
          </button>
          {archiveCount > 0 ? (
            <span className={toolbarBadgeStyles.badge} aria-hidden>
              {archiveCount > 99 ? '99+' : archiveCount}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
