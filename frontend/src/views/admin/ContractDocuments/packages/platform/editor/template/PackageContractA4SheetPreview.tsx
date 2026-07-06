'use client';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import { PACKAGE_A4_WRAP } from '../../ui/packageTabClassNames';

export type PackageContractA4SheetPreviewProps = {
  html: string;
  wrapClassName?: string;
};

/** Превью договора и HTML-шаблонов на экране как печатный лист A4. */
export function PackageContractA4SheetPreview({
  html,
  wrapClassName = PACKAGE_A4_WRAP,
}: PackageContractA4SheetPreviewProps) {
  return (
    <div className={wrapClassName}>
      <article className={cdDocPreview.estimateA4Sheet}>
        <div
          className={cdDocPreview.contractA4Preview}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </div>
  );
}
