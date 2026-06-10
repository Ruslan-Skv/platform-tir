'use client';

import cdChrome from '../../../styles/editor-chrome.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';

export type PackageDocumentEditorRefusedBannerProps = {
  refusalReason: string;
};

export function PackageDocumentEditorRefusedBanner({
  refusalReason,
}: PackageDocumentEditorRefusedBannerProps) {
  return (
    <div className={cdChrome.packageRefusedBanner} role="status">
      <strong>Отказ по проекту договора.</strong>{' '}
      {refusalReason.trim() ? (
        <span>{refusalReason.trim()}</span>
      ) : (
        <span className={cdTemplates.hint}>Причина не указана.</span>
      )}
      <p
        className={cdTemplates.hint}
        style={{ marginTop: 'var(--admin-space-sm)', marginBottom: 0 }}
      >
        Если клиент передумал, откройте «Оплаты и Управление договором» и нажмите «Снять отказ» —
        пакет снова станет «в проекте», данные можно будет редактировать.
      </p>
    </div>
  );
}
