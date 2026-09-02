'use client';

import Link from 'next/link';

import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import styles from './NumberingSettingsPage.module.css';

export function NumberingFormatHelpSection() {
  return (
    <div className={`${cdHub.contractsListFiltersPanel} ${styles.helpPanel}`}>
      <h3
        className={cdHub.contractsListChipRowLabel}
        style={{ margin: '0 0 0.5rem', display: 'block' }}
      >
        Как собирается номер <code className={styles.code}>77/1/3д-5</code>
      </h3>
      <ol className={styles.helpSteps}>
        <li>
          <strong>Офис</strong> — префикс офиса, в котором менеджер открыл рабочий день (задаётся в{' '}
          <Link href="/admin/crm/offices">CRM → Офисы</Link>).
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
        <Link href="/admin/contract-documents/signatories">Менеджеры</Link>
        <Link href="/admin/crm/my-work-day">Мой рабочий день</Link>
        <Link href="/admin/crm/offices">Офисы</Link>
        <Link href="/admin/settings/work-days">Графики / офис</Link>
        <Link href="/admin/users">Пользователи</Link>
      </div>
    </div>
  );
}
