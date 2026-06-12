'use client';

import Link from 'next/link';

import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

export function SignatoriesPageHeader() {
  return (
    <div className={cdHub.editorHeader}>
      <div>
        <h1 className={cdWorkspace.title}>Менеджеры</h1>
        <p className={cdWorkspace.subtitle}>
          Карточки менеджера для договоров: ФИО в падежах, основание полномочий, офис продаж. Для
          каждой карточки укажите пользователя CRM — по нему карточка попадает в фильтр менеджера в
          замерах. В пакете документов менеджер выберет карточку из списка.
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
        <Link className={cdWorkspace.secondaryBtn} href="/admin/contract-documents/contracts">
          К разделу «Ремонт»
        </Link>
      </div>
    </div>
  );
}
