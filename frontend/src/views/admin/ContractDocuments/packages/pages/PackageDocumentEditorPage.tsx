'use client';

import cdBase from '../../styles/base.module.css';
import cdTemplates from '../../styles/templates-library.module.css';
import { PackageDocumentEditorWorkOrdersListSurface } from '../platform/editor';
import { usePackageDocumentEditorController } from '../platform/hooks/editor/usePackageDocumentEditorController';
import { PackageDocumentEditorMainView } from '../platform/hub/hubModal/PackageDocumentEditorMainView';

export interface PackageDocumentEditorPageProps {
  packageId: string;
  /** Только модалка «Заказ-наряды» (вызов из списка договоров). */
  workOrdersHubListSurface?: boolean;
  onWorkOrdersHubListClose?: () => void;
  onWorkOrdersHubListUpdated?: () => void;
}

export function PackageDocumentEditorPage({
  packageId,
  workOrdersHubListSurface = false,
  onWorkOrdersHubListClose,
  onWorkOrdersHubListUpdated,
}: PackageDocumentEditorPageProps) {
  const { loading, workOrdersListSurfaceProps, mainViewProps } = usePackageDocumentEditorController(
    {
      packageId,
      workOrdersHubListSurface,
      onWorkOrdersHubListClose,
      onWorkOrdersHubListUpdated,
    }
  );

  if (loading && workOrdersHubListSurface) {
    return <PackageDocumentEditorWorkOrdersListSurface loading {...workOrdersListSurfaceProps} />;
  }

  if (loading) {
    return (
      <div className={cdBase.page}>
        <p className={cdTemplates.hint}>Загрузка…</p>
      </div>
    );
  }

  if (workOrdersHubListSurface) {
    return (
      <PackageDocumentEditorWorkOrdersListSurface loading={false} {...workOrdersListSurfaceProps} />
    );
  }

  return <PackageDocumentEditorMainView {...mainViewProps} />;
}
