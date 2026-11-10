'use client';

import { useEffect, useState } from 'react';

import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import { NumberingDirectionsSection } from './NumberingDirectionsSection';
import { NumberingEmployeeCodesSection } from './NumberingEmployeeCodesSection';
import { NumberingFormatHelpSection } from './NumberingFormatHelpSection';
import { NumberingOfficePrefixesSection } from './NumberingOfficePrefixesSection';
import styles from './NumberingSettingsPage.module.css';
import panelStyles from './SettingsPanels.module.css';
import type {
  NumberingOfficeStatusFilter,
  NumberingSectionTab,
} from './hooks/useNumberingSettingsPage';
import { useNumberingSettingsPage } from './hooks/useNumberingSettingsPage';

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

/** Тело раздела «Нумерация договоров» для модалки «Настройки договоров». */
export function NumberingSettingsPanel() {
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
    officeStatusFilter,
    refresh,
    saveDirectionLetter,
    saveUserCode,
    setDirectionDraft,
    setMessage,
    setOfficeStatusFilter,
    setUserDraft,
    setUserFilter,
    userDrafts,
    userFilter,
    userSavingId,
    users,
  } = useNumberingSettingsPage();

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

  const iconsDisabled = loading || Boolean(userSavingId || directionSavingId);

  return (
    <div className={panelStyles.panelRoot}>
      <div className={panelStyles.panelHead}>
        <div className={panelStyles.panelHeadMain}>
          <span className={panelStyles.panelCount}>{countTitle}</span>
          <AdminSaveNotice visible={successVisible}>{successText}</AdminSaveNotice>
        </div>
        <AdminListRefreshButton
          disabled={iconsDisabled}
          busy={loading}
          title="Обновить справочники"
          aria-label={loading ? 'Обновление справочников' : 'Обновить справочники'}
          onClick={() => void refresh()}
        />
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
        <NumberingOfficePrefixesSection offices={filteredOffices} loading={loading} />
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
