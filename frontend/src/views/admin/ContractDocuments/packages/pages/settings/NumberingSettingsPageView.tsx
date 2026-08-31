'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { NumberingDirectionsSection } from './NumberingDirectionsSection';
import { NumberingEmployeeCodesSection } from './NumberingEmployeeCodesSection';
import { NumberingFormatHelpSection } from './NumberingFormatHelpSection';
import { NumberingOfficePrefixesSection } from './NumberingOfficePrefixesSection';
import styles from './NumberingSettingsPage.module.css';
import type {
  NumberingOfficeStatusFilter,
  NumberingSectionTab,
  NumberingSettingsPageModel,
} from './hooks/useNumberingSettingsPage';

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

const SECTION_TABS: { value: NumberingSectionTab; label: string }[] = [
  { value: 'offices', label: 'Офисы' },
  { value: 'employees', label: 'Сотрудники' },
  { value: 'directions', label: 'Направления' },
];

const OFFICE_STATUS_OPTIONS: { value: NumberingOfficeStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Все' },
  { value: 'ACTIVE', label: 'Активные' },
  { value: 'INACTIVE', label: 'Выкл.' },
];

export function NumberingSettingsPageView(model: NumberingSettingsPageModel) {
  const {
    directionDrafts,
    directionSavingId,
    directions,
    filteredOffices,
    filteredUsers,
    isSuperAdmin,
    loading,
    message,
    officeCounts,
    officeDrafts,
    officeSavingId,
    officeStatusFilter,
    refresh,
    saveDirectionLetter,
    saveOfficePrefix,
    saveUserCode,
    setDirectionDraft,
    setMessage,
    setOfficeDraft,
    setOfficeStatusFilter,
    setUserDraft,
    setUserFilter,
    userDrafts,
    userFilter,
    userSavingId,
    users,
  } = model;

  const [section, setSection] = useState<NumberingSectionTab>('offices');
  const [successVisible, setSuccessVisible] = useState(false);
  const [successText, setSuccessText] = useState('');

  useEffect(() => {
    if (!message) return;
    if (message.type === 'success') {
      setSuccessText(message.text);
      setSuccessVisible(true);
      const timer = window.setTimeout(() => setSuccessVisible(false), 2800);
      setMessage(null);
      return () => window.clearTimeout(timer);
    }
  }, [message, setMessage]);

  const countTitle =
    section === 'offices'
      ? officeStatusFilter === 'ALL'
        ? `${filteredOffices.length} офисов`
        : `${filteredOffices.length} из ${officeCounts.ALL} офисов`
      : section === 'employees'
        ? userFilter.trim()
          ? `${filteredUsers.length} из ${users.length} сотрудников`
          : `${users.length} сотрудников`
        : `${directions.length} направлений`;

  const countMobile =
    section === 'offices'
      ? filteredOffices.length
      : section === 'employees'
        ? filteredUsers.length
        : directions.length;

  const iconsDisabled = loading || Boolean(officeSavingId || userSavingId || directionSavingId);

  const iconActions = (placement: 'desktop' | 'mobile') => (
    <div
      className={
        placement === 'mobile'
          ? cdHub.contractsHeaderIconActionsMobile
          : cdHub.contractsHeaderIconActionsDesktop
      }
    >
      <AdminListRefreshButton
        disabled={iconsDisabled}
        busy={loading}
        title="Обновить справочники"
        aria-label={loading ? 'Обновление справочников' : 'Обновить справочники'}
        onClick={() => void refresh()}
      />
    </div>
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <Link className={cdChrome.backLink} href="/admin/contract-documents">
        ← Оформление договоров
      </Link>

      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Нумерация договоров</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{countMobile}</span>
              </span>
              <AdminSaveNotice visible={successVisible} className={styles.headerSuccessNotice}>
                {successText}
              </AdminSaveNotice>
            </div>
            {iconActions('mobile')}
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          {iconActions('desktop')}
        </div>
      </div>

      {message?.type === 'error' ? (
        <div className={`${styles.message} ${styles.messageerror}`}>
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <NumberingFormatHelpSection />

      <div className={styles.viewModeRow} role="group" aria-label="Раздел справочника">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`${styles.viewModeBtn}${section === tab.value ? ` ${styles.viewModeBtnActive}` : ''}`}
            onClick={() => setSection(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === 'offices' ? (
        <div className={cdHub.contractsListFiltersPanel}>
          <div className={cdHub.contractsListFiltersStack}>
            <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус офиса">
              <span className={cdHub.contractsListChipRowLabel}>Статус</span>
              {OFFICE_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={loading}
                  className={chipClass(officeStatusFilter === opt.value)}
                  onClick={() => setOfficeStatusFilter(opt.value)}
                >
                  {opt.label} ({officeCounts[opt.value]})
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {section === 'employees' ? (
        <div className={cdHub.contractsListFiltersPanel}>
          <div className={cdHub.contractsListFiltersStack}>
            <div className={cdHub.contractsListChipRow} role="group" aria-label="Поиск сотрудников">
              <span className={cdHub.contractsListChipRowLabel}>Поиск</span>
              <input
                className={`${styles.searchInput}${userFilter.trim() ? ` ${cdHub.contractsListFilterActive}` : ''}`}
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="ФИО, email, код, роль…"
                autoComplete="off"
                aria-label="Поиск сотрудников"
              />
            </div>
          </div>
        </div>
      ) : null}

      {section === 'offices' ? (
        <NumberingOfficePrefixesSection
          isSuperAdmin={isSuperAdmin}
          offices={filteredOffices}
          officeDrafts={officeDrafts}
          officeSavingId={officeSavingId}
          loading={loading}
          onDraftChange={setOfficeDraft}
          onSave={(id) => void saveOfficePrefix(id)}
        />
      ) : null}

      {section === 'employees' ? (
        <NumberingEmployeeCodesSection
          isSuperAdmin={isSuperAdmin}
          users={filteredUsers}
          userDrafts={userDrafts}
          userSavingId={userSavingId}
          loading={loading}
          onDraftChange={setUserDraft}
          onSave={(id) => void saveUserCode(id)}
        />
      ) : null}

      {section === 'directions' ? (
        <NumberingDirectionsSection
          isSuperAdmin={isSuperAdmin}
          directions={directions}
          directionDrafts={directionDrafts}
          directionSavingId={directionSavingId}
          loading={loading}
          onDraftChange={setDirectionDraft}
          onSave={(id) => void saveDirectionLetter(id)}
        />
      ) : null}
    </div>
  );
}
