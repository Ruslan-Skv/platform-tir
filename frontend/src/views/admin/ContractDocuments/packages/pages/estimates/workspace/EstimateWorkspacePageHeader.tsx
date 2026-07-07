'use client';

import Link from 'next/link';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import { ESTIMATES_LIST_HREF } from './estimateWorkspaceUtils';

export type EstimateWorkspacePageHeaderProps = {
  estimateIdFromUrl: string | null;
  copyFromId: string | null;
  splitInstanceFromUrl: boolean;
  newSplitBundleFromUrl: boolean;
  joinSplitBundleIdFromUrl: string;
  fromMeasurementId: string | null;
  isEditingExisting: boolean;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onRequestExit: () => void;
};

function estimateWorkspacePageTitle({
  estimateIdFromUrl,
  copyFromId,
  splitInstanceFromUrl,
  fromMeasurementId,
}: Pick<
  EstimateWorkspacePageHeaderProps,
  'estimateIdFromUrl' | 'copyFromId' | 'splitInstanceFromUrl' | 'fromMeasurementId'
>): string {
  if (estimateIdFromUrl) return 'Редактирование расчёта';
  if (copyFromId && splitInstanceFromUrl) return 'Связанный экземпляр расчёта';
  if (copyFromId) return 'Новый расчёт по копии';
  if (fromMeasurementId) return 'Новый расчёт по выполненному замеру';
  return 'Новый расчёт';
}

function estimateWorkspaceSplitSubtitle({
  newSplitBundleFromUrl,
  joinSplitBundleIdFromUrl,
}: Pick<
  EstimateWorkspacePageHeaderProps,
  'newSplitBundleFromUrl' | 'joinSplitBundleIdFromUrl'
>): string {
  if (newSplitBundleFromUrl) {
    return 'Новая связка на том же объекте: после сохранения распределите позиции в «Разделении сметы» у каждого экземпляра этой связки.';
  }
  if (joinSplitBundleIdFromUrl) {
    return 'Копия войдёт в выбранную связку на объекте — отметьте её позиции в «Разделении сметы».';
  }
  return 'После сохранения расчёт окажется в той же связке, рядом с исходным. Отметьте позиции в «Разделении сметы» у каждого экземпляра.';
}

export function EstimateWorkspacePageHeader({
  estimateIdFromUrl,
  copyFromId,
  splitInstanceFromUrl,
  newSplitBundleFromUrl,
  joinSplitBundleIdFromUrl,
  fromMeasurementId,
  isEditingExisting,
  dirty,
  saving,
  onSave,
  onRequestExit,
}: EstimateWorkspacePageHeaderProps) {
  return (
    <div className={cdWorkspace.editorHeader}>
      <div>
        <Link
          className={cdWorkspace.backLink}
          href={ESTIMATES_LIST_HREF}
          onClick={(e) => {
            if (dirty) {
              e.preventDefault();
              onRequestExit();
            }
          }}
        >
          ← К списку расчётов
        </Link>
        <h1 className={`${cdWorkspace.title} ${cdWorkspace.estimateWorkspaceTitle}`}>
          {estimateWorkspacePageTitle({
            estimateIdFromUrl,
            copyFromId,
            splitInstanceFromUrl,
            fromMeasurementId,
          })}
        </h1>
        {copyFromId && splitInstanceFromUrl ? (
          <p className={`${cdWorkspace.subtitle} ${cdWorkspace.estimateWorkspaceSubtitle}`}>
            {estimateWorkspaceSplitSubtitle({ newSplitBundleFromUrl, joinSplitBundleIdFromUrl })}
          </p>
        ) : null}
      </div>
      {dirty ? (
        <div className={cdDocPreview.estimateWorkspaceHeaderControls}>
          <div className={cdDocPreview.estimateWorkspaceActions}>
            <button
              data-admin-mutation
              type="button"
              className={cdWorkspace.primaryBtn}
              disabled={saving}
              onClick={onSave}
            >
              {saving
                ? 'Сохранение…'
                : isEditingExisting
                  ? 'Сохранить изменения'
                  : 'Сохранить расчёт'}
            </button>
            <button
              type="button"
              className={`${cdWorkspace.secondaryBtn} ${cdDocPreview.estimateWorkspaceExitBtn}`}
              disabled={saving}
              onClick={onRequestExit}
            >
              Выйти без сохранения
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
