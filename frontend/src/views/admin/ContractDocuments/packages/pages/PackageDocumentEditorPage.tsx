'use client';

import cdBase from '../../styles/base.module.css';
import cdTemplates from '../../styles/templates-library.module.css';
import { PackageDocumentEditorWorkOrdersListSurface } from '../platform/editor';
import { PackageDocumentEditorInvoicesListSurface } from '../platform/editor/chrome/PackageDocumentEditorInvoicesListSurface';
import { usePackageDocumentEditorController } from '../platform/hooks/editor/usePackageDocumentEditorController';
import { PackageDocumentEditorMainView } from '../platform/hub/hubModal/PackageDocumentEditorMainView';

export interface PackageDocumentEditorPageProps {
  packageId: string;
  /** Только модалка «Заказ-наряды» (вызов из списка договоров). */
  workOrdersHubListSurface?: boolean;
  workOrdersHubListSurfaceOpen?: boolean;
  onWorkOrdersHubListClose?: () => void;
  onWorkOrdersHubListUpdated?: () => void;
  /** Только модалка «Счета» (вызов из списка договоров). */
  invoicesHubListSurface?: boolean;
  invoicesHubListSurfaceOpen?: boolean;
  onInvoicesHubListClose?: () => void;
  onInvoicesHubListUpdated?: () => void;
}

export function PackageDocumentEditorPage({
  packageId,
  workOrdersHubListSurface = false,
  workOrdersHubListSurfaceOpen = false,
  onWorkOrdersHubListClose,
  onWorkOrdersHubListUpdated,
  invoicesHubListSurface = false,
  invoicesHubListSurfaceOpen = false,
  onInvoicesHubListClose,
  onInvoicesHubListUpdated,
}: PackageDocumentEditorPageProps) {
  const { loading, workOrdersListSurfaceProps, invoicesListSurfaceProps, mainViewProps } =
    usePackageDocumentEditorController({
      packageId,
      workOrdersHubListSurface,
      workOrdersHubListSurfaceOpen,
      onWorkOrdersHubListClose,
      onWorkOrdersHubListUpdated,
      invoicesHubListSurface,
      invoicesHubListSurfaceOpen,
      onInvoicesHubListClose,
      onInvoicesHubListUpdated,
    });

  if (workOrdersHubListSurface) {
    return (
      <PackageDocumentEditorWorkOrdersListSurface
        loading={loading}
        {...workOrdersListSurfaceProps}
      />
    );
  }

  if (invoicesHubListSurface) {
    return <PackageDocumentEditorInvoicesListSurface {...invoicesListSurfaceProps} />;
  }

  if (loading) {
    return (
      <div className={cdBase.page}>
        <p className={cdTemplates.hint}>Загрузка…</p>
      </div>
    );
  }

  return <PackageDocumentEditorMainView {...mainViewProps} />;
}
