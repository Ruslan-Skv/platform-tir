'use client';

import type { ContractDocumentPackageStatus } from '@/shared/api/admin-contract-document-packages';

import cdTemplates from '../../../../styles/templates-library.module.css';
import { PackageDocumentEditorRefusedBanner } from './PackageDocumentEditorRefusedBanner';

export type PackageDocumentEditorChromeProps = {
  packageFlowStatus: ContractDocumentPackageStatus;
  refusalReason: string;
  error: string | null;
  excelMessage: string | null;
};

/** Сообщения редактора между шапкой (с панелью вкладок) и содержимым активной вкладки. */
export function PackageDocumentEditorChrome({
  packageFlowStatus,
  refusalReason,
  error,
  excelMessage,
}: PackageDocumentEditorChromeProps) {
  return (
    <>
      {packageFlowStatus === 'REFUSED' ? (
        <PackageDocumentEditorRefusedBanner refusalReason={refusalReason} />
      ) : null}
      {error ? <p className={cdTemplates.error}>{error}</p> : null}
      {excelMessage ? <p className={cdTemplates.hint}>{excelMessage}</p> : null}
    </>
  );
}
