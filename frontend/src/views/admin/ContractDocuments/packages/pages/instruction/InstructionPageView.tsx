'use client';

import Link from 'next/link';

import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { InstructionPageArticle } from './InstructionPageArticle';

export function InstructionPageView() {
  return (
    <div className={cdBase.page}>
      <Link className={cdWorkspace.backLink} href="/admin/contract-documents">
        ← К разделу «Оформление договоров»
      </Link>
      <h1 className={cdWorkspace.title} style={{ marginTop: 12 }}>
        Инструкция по работе с разделом «Оформление договоров»
      </h1>
      <p className={cdWorkspace.subtitle}>
        Пакет документов «Ремонт», библиотека шаблонов, подстановка данных с вкладки «Данные», связь
        с CRM и печать.
      </p>

      <InstructionPageArticle />
    </div>
  );
}
