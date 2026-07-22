'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';

import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

export type SettingsPageLayoutProps = {
  title: string;
  subtitle: ReactNode;
  error: string | null;
  ok: string | null;
  children: ReactNode;
};

export function SettingsPageLayout({
  title,
  subtitle,
  error,
  ok,
  children,
}: SettingsPageLayoutProps) {
  return (
    <div className={cdBase.page}>
      <Link className={cdChrome.backLink} href="/admin/contract-documents">
        ← Оформление договоров
      </Link>
      <h1 className={cdWorkspace.title}>{title}</h1>
      <p className={cdWorkspace.subtitle}>{subtitle}</p>

      <div className={cdHub.packageSettingsStatus} role="status" aria-live="polite">
        {error ? <p className={cdTemplates.error}>{error}</p> : null}
        {!error && ok ? <p className={cdTemplates.hint}>{ok}</p> : null}
      </div>

      {children}
    </div>
  );
}
