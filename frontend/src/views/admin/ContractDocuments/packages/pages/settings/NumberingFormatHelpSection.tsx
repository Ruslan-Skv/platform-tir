'use client';

import Link from 'next/link';

import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './NumberingSettingsPage.module.css';

export function NumberingFormatHelpSection() {
  return (
    <section className={cdTemplates.sectionCard}>
      <h3 className={cdTemplates.sectionTitle} style={{ marginTop: 0 }}>
        Как собирается номер
      </h3>
      <ol className={styles.steps}>
        <li>
          <strong>Офис</strong> — префикс офиса, в котором менеджер открыл рабочий день.
        </li>
        <li>
          <strong>Менеджер</strong> — персональный код сотрудника (карточка менеджера → пользователь
          CRM).
        </li>
        <li>
          <strong>Замерщик</strong> — код сотрудника, выбранного в договоре.
        </li>
        <li>
          <strong>Направление</strong> — буква (д, о, р…).
        </li>
        <li>
          <strong>Порядок</strong> — следующий номер у этого менеджера в этом направлении.
        </li>
      </ol>
      <div className={styles.relatedLinks}>
        <Link href="/admin/contract-documents/signatories">Менеджеры (карточки)</Link>
        <Link href="/admin/crm/my-work-day">Мой рабочий день</Link>
        <Link href="/admin/crm/offices">Офисы (полный справочник)</Link>
        <Link href="/admin/settings/work-days">Графики / закрепление за офисом</Link>
        <Link href="/admin/users">Пользователи</Link>
      </div>
    </section>
  );
}
