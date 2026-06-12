'use client';

import Link from 'next/link';

import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

export function ExecutorProfilesPageHeader() {
  return (
    <div className={cdHub.editorHeader}>
      <div>
        <h1 className={cdWorkspace.title}>Исполнители</h1>
        <p className={cdWorkspace.subtitle}>
          Создайте наборы реквизитов Исполнителя. Менеджера и офис продаж настройте в разделе{' '}
          <Link className={cdHub.link} href="/admin/contract-documents/signatories">
            Менеджеры
          </Link>
          . В договоре менеджер выберет наборы из списков.
        </p>
      </div>
      <Link className={cdWorkspace.secondaryBtn} href="/admin/contract-documents/contracts">
        К разделу «Ремонт»
      </Link>
    </div>
  );
}
