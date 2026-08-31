'use client';

import { type CSSProperties, useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { WorkDaysIpHelp } from '@/features/admin/work-day/WorkDaysIpHelp';
import { useAuth } from '@/features/auth';
import {
  type WorkDayOfficeSchedule,
  type WorkDaySettings,
  type WorkDayUserSchedule,
  getWorkDayOffices,
  getWorkDaySettings,
  getWorkDayUsers,
  updateWorkDayOffice,
  updateWorkDaySettings,
  updateWorkDayUser,
} from '@/shared/api/admin-work-days';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import { ROLES_CONFIG } from '@/views/admin/Settings';

import { WeeklyScheduleEditor } from './WeeklyScheduleEditor';
import styles from './WorkDaysSettingsSection.module.css';
import { type WeeklySchedule, normalizeWeeklySchedule } from './weekly-schedule.utils';

type Tab = 'general' | 'offices' | 'users';

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'Общие' },
  { id: 'offices', label: 'Офисы' },
  { id: 'users', label: 'Сотрудники' },
];

const OFFICE_ACCENT_COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
] as const;

function getOfficeAccentColor(
  officeId: string | null,
  offices: WorkDayOfficeSchedule[]
): string | null {
  if (!officeId) return null;
  const index = offices.findIndex((office) => office.id === officeId);
  if (index < 0) return null;
  return OFFICE_ACCENT_COLORS[index % OFFICE_ACCENT_COLORS.length];
}

export function WorkDaysSettingsSection() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<WorkDaySettings | null>(null);
  const [offices, setOffices] = useState<WorkDayOfficeSchedule[]>([]);
  const [users, setUsers] = useState<WorkDayUserSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingOffices, setSavingOffices] = useState(false);
  const [savingUsers, setSavingUsers] = useState(false);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    resetSaveFeedback();
    try {
      const [s, o, u] = await Promise.all([
        getWorkDaySettings(),
        getWorkDayOffices(),
        getWorkDayUsers(),
      ]);
      setSettings(s);
      setOffices(o);
      setUsers(u);
    } catch (e) {
      showSaveError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [resetSaveFeedback, showSaveError]);

  useEffect(() => {
    void load();
  }, [load]);

  const buildOfficePayload = (office: WorkDayOfficeSchedule) => ({
    allowedIps: office.allowedIps,
    skipWorkDayIpCheck: office.skipWorkDayIpCheck,
    workDayWeeklySchedule: getOfficeWeekly(office),
  });

  const buildUserSchedulePayload = (u: WorkDayUserSchedule) => {
    const payload: Parameters<typeof updateWorkDayUser>[1] = {
      officeId: u.officeId,
      workDayTrackingEnabled: u.workDayTrackingEnabled,
      useCustomWorkSchedule: u.useCustomWorkSchedule,
    };
    if (u.useCustomWorkSchedule) {
      payload.workDayWeeklySchedule = getUserWeekly(u);
    }
    return payload;
  };

  const busy = loading || savingGeneral || savingOffices || savingUsers;

  const saveSettings = async (patch: Partial<WorkDaySettings>) => {
    setSavingGeneral(true);
    try {
      const updated = await updateWorkDaySettings(patch);
      setSettings(updated);
      showSaveSuccess();
    } catch (e) {
      showSaveError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSavingGeneral(false);
    }
  };

  const toggleRole = (role: string) => {
    if (!settings) return;
    const tracked = settings.trackedRoles.includes(role as WorkDaySettings['trackedRoles'][number])
      ? settings.trackedRoles.filter((r) => r !== role)
      : [...settings.trackedRoles, role as WorkDaySettings['trackedRoles'][number]];
    void saveSettings({ trackedRoles: tracked });
  };

  const saveAllOffices = async () => {
    setSavingOffices(true);
    try {
      const results = await Promise.allSettled(
        offices.map((office) => updateWorkDayOffice(office.id, buildOfficePayload(office)))
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        showSaveError(
          failed.length === offices.length
            ? 'Не удалось сохранить настройки офисов'
            : `Сохранено не для всех: ошибок ${failed.length} из ${offices.length}`
        );
      } else {
        showSaveSuccess();
      }
    } catch (e) {
      showSaveError(e instanceof Error ? e.message : 'Ошибка сохранения офисов');
    } finally {
      setSavingOffices(false);
    }
  };

  const saveAllUsers = async () => {
    setSavingUsers(true);
    try {
      const results = await Promise.allSettled(
        users.map((u) => updateWorkDayUser(u.id, buildUserSchedulePayload(u)))
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        showSaveError(
          failed.length === users.length
            ? 'Не удалось сохранить настройки сотрудников'
            : `Сохранено не для всех: ошибок ${failed.length} из ${users.length}`
        );
      } else {
        showSaveSuccess();
      }
    } catch (e) {
      showSaveError(e instanceof Error ? e.message : 'Ошибка сохранения сотрудников');
    } finally {
      setSavingUsers(false);
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
        <Link className={cdChrome.backLink} href="/admin/settings">
          ← Настройки
        </Link>
        <div className={cdHub.editorHeader}>
          <div className={cdHub.contractsListHeaderLeft}>
            <h1 className={cdHub.title}>Учёт рабочего времени</h1>
          </div>
        </div>
        <p className={styles.denied}>
          Настройки учёта рабочего времени доступны только супер-администратору.
        </p>
      </div>
    );
  }

  const countTitle =
    tab === 'offices'
      ? `${offices.length} офисов`
      : tab === 'users'
        ? `${users.length} сотрудников`
        : `${settings?.trackedRoles.length ?? 0} ролей`;

  const countMobile =
    tab === 'offices'
      ? offices.length
      : tab === 'users'
        ? users.length
        : (settings?.trackedRoles.length ?? 0);

  const iconActions = (placement: 'desktop' | 'mobile') => (
    <div
      className={
        placement === 'mobile'
          ? cdHub.contractsHeaderIconActionsMobile
          : cdHub.contractsHeaderIconActionsDesktop
      }
    >
      <AdminListRefreshButton
        disabled={busy}
        busy={loading}
        title="Обновить настройки"
        aria-label={loading ? 'Обновление настроек' : 'Обновить настройки'}
        onClick={() => void load()}
      />
    </div>
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <Link className={cdChrome.backLink} href="/admin/settings">
        ← Настройки
      </Link>

      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Учёт рабочего времени</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{countMobile}</span>
              </span>
              <AdminSaveNotice visible={saveNoticeVisible} className={styles.headerSuccessNotice}>
                Сохранено
              </AdminSaveNotice>
            </div>
            {iconActions('mobile')}
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          {tab === 'offices' ? (
            <button
              data-admin-mutation
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              disabled={busy || offices.length === 0}
              onClick={() => void saveAllOffices()}
            >
              {savingOffices ? 'Сохранение…' : 'Сохранить офисы'}
            </button>
          ) : null}
          {tab === 'users' ? (
            <button
              data-admin-mutation
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              disabled={busy || users.length === 0}
              onClick={() => void saveAllUsers()}
            >
              {savingUsers ? 'Сохранение…' : 'Сохранить сотрудников'}
            </button>
          ) : null}
          {iconActions('desktop')}
        </div>
      </div>

      {errorMessage ? (
        <div className={`${styles.message} ${styles.messageerror}`}>
          <span>{errorMessage}</span>
          <button type="button" onClick={resetSaveFeedback} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <div className={`${cdHub.contractsListFiltersPanel} ${styles.helpPanel}`}>
        <p className={styles.helpText}>
          Настройка графиков, IP-адресов офисов и ролей, для которых включён учёт рабочего дня.
        </p>
      </div>

      <div className={styles.viewModeRow} role="group" aria-label="Раздел настроек">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.viewModeBtn}${tab === item.id ? ` ${styles.viewModeBtnActive}` : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading || !settings ? (
        <p className={styles.loading}>Загрузка…</p>
      ) : (
        <>
          {tab === 'general' ? (
            <section className={`${styles.section} ${styles.sectionCard}`}>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={settings.isEnabled}
                  onChange={(e) => void saveSettings({ isEnabled: e.target.checked })}
                  disabled={savingGeneral}
                />
                Учёт рабочего дня включён
              </label>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={settings.blockAdminWithoutWorkDay}
                  onChange={(e) =>
                    void saveSettings({ blockAdminWithoutWorkDay: e.target.checked })
                  }
                  disabled={savingGeneral}
                />
                Блокировать админку без начала рабочего дня
              </label>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={settings.requireOfficeIp}
                  onChange={(e) => void saveSettings({ requireOfficeIp: e.target.checked })}
                  disabled={savingGeneral}
                />
                Разрешать начало дня только с IP офиса
              </label>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={settings.blockMobileDevices}
                  onChange={(e) => void saveSettings({ blockMobileDevices: e.target.checked })}
                  disabled={savingGeneral}
                />
                Запретить начало дня с мобильных устройств
              </label>

              <div className={styles.row}>
                <label>
                  Авто-закрытие в
                  <input
                    type="time"
                    className={styles.input}
                    value={`${String(settings.autoCloseHour).padStart(2, '0')}:${String(settings.autoCloseMinute).padStart(2, '0')}`}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(':');
                      void saveSettings({
                        autoCloseHour: parseInt(h || '22', 10),
                        autoCloseMinute: parseInt(m || '0', 10),
                      });
                    }}
                    disabled={savingGeneral}
                  />
                </label>
                <label>
                  Допуск опоздания (мин)
                  <input
                    type="number"
                    className={styles.input}
                    min={0}
                    max={120}
                    value={settings.defaultGracePeriodMinutes}
                    onChange={(e) =>
                      void saveSettings({
                        defaultGracePeriodMinutes: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    disabled={savingGeneral}
                  />
                </label>
              </div>

              <h3 className={styles.subheading}>Роли с учётом рабочего дня</h3>
              <div className={styles.rolesGrid}>
                {ROLES_CONFIG.filter(
                  (r) => r.id !== 'SUPER_ADMIN' && r.id !== 'GUEST' && r.id !== 'USER'
                ).map((role) => (
                  <label key={role.id} className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={settings.trackedRoles.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      disabled={savingGeneral}
                    />
                    {role.label}
                  </label>
                ))}
              </div>

              <h3 className={styles.subheading}>Приветствия при начале дня</h3>
              <textarea
                className={styles.textarea}
                rows={4}
                value={settings.greetingMessages.join('\n')}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    greetingMessages: e.target.value.split('\n').filter((l) => l.trim()),
                  })
                }
                onBlur={() => void saveSettings({ greetingMessages: settings.greetingMessages })}
              />
              <p className={styles.hint}>
                По одной фразе на строку. Используйте <code>{'{имя}'}</code> для обращения по имени.
                При начале дня показывается случайная фраза.
              </p>
            </section>
          ) : null}

          {tab === 'offices' ? (
            <section className={styles.section}>
              <div className={cdHub.contractsListFiltersPanel}>
                <div className={styles.tabToolbar}>
                  <p className={styles.hint}>
                    График по дням недели, проверка IP и разрешённые адреса для каждого офиса.
                  </p>
                </div>
                <WorkDaysIpHelp />
              </div>
              {offices.map((office) => (
                <OfficeCard
                  key={office.id}
                  office={office}
                  onChange={(patch) =>
                    setOffices((prev) =>
                      prev.map((o) => (o.id === office.id ? { ...o, ...patch } : o))
                    )
                  }
                />
              ))}
            </section>
          ) : null}

          {tab === 'users' ? (
            <section className={styles.section}>
              <div className={cdHub.contractsListFiltersPanel}>
                <p className={styles.hint}>
                  Все активные сотрудники админки. Учёт по роли включается на вкладке «Общие», но
                  для каждого сотрудника его можно отключить отдельно.
                </p>
              </div>
              <div className={styles.userCardsGrid}>
                {users.map((u) => (
                  <UserCard
                    key={u.id}
                    user={u}
                    offices={offices}
                    onChange={(patch) =>
                      setUsers((prev) =>
                        prev.map((item) => (item.id === u.id ? { ...item, ...patch } : item))
                      )
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function getOfficeWeekly(office: WorkDayOfficeSchedule): WeeklySchedule {
  return normalizeWeeklySchedule(office.workDayWeeklySchedule, {
    workDayStartTime: office.workDayStartTime,
    workDayEndTime: office.workDayEndTime,
    workDaysOfWeek: office.workDaysOfWeek,
    gracePeriodMinutes: office.gracePeriodMinutes,
  });
}

function getUserWeekly(user: WorkDayUserSchedule): WeeklySchedule {
  return normalizeWeeklySchedule(user.workDayWeeklySchedule, {
    workDayStartTime: user.workDayStartTime ?? '09:00',
    workDayEndTime: user.workDayEndTime ?? '18:00',
    workDaysOfWeek: user.workDaysOfWeek.length > 0 ? user.workDaysOfWeek : [1, 2, 3, 4, 5],
    gracePeriodMinutes: user.gracePeriodMinutes ?? 10,
  });
}

function OfficeCard({
  office,
  onChange,
}: {
  office: WorkDayOfficeSchedule;
  onChange: (patch: Partial<WorkDayOfficeSchedule>) => void;
}) {
  const weekly = getOfficeWeekly(office);
  return (
    <article className={styles.card}>
      <h3 className={styles.cardTitle}>{office.name}</h3>
      <p className={styles.meta}>
        График по дням недели (можно задать разный режим, напр. для субботы)
      </p>
      <WeeklyScheduleEditor
        schedule={weekly}
        onChange={(schedule) => onChange({ workDayWeeklySchedule: schedule })}
      />
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={office.skipWorkDayIpCheck}
          onChange={(e) => onChange({ skipWorkDayIpCheck: e.target.checked })}
        />
        <span>
          Не проверять IP при начале рабочего дня
          <span className={styles.fieldHint}>
            {' '}
            — для первичной настройки рабочего места или если определение IP ненадёжно. Глобальная
            проверка IP должна быть включена в общих настройках.
          </span>
        </span>
      </label>
      <label className={styles.fullWidth}>
        Разрешённые IP адреса офиса
        <span className={styles.fieldHint}>
          По одному адресу на строку. Несколько строк — несколько IP. В типичном офисе с 2+
          сотрудниками часто хватает одного общего IP роутера. Подсеть: 192.168.0.0/24
          {office.allowedIps.length > 0 ? ` · сейчас: ${office.allowedIps.length} шт.` : ''}
        </span>
        <textarea
          className={styles.textarea}
          rows={4}
          placeholder={'185.12.34.56\n192.168.1.0/24'}
          value={office.allowedIps.join('\n')}
          onChange={(e) =>
            onChange({
              allowedIps: e.target.value
                .split(/[\n,]/)
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
    </article>
  );
}

function UserCard({
  user,
  offices,
  onChange,
}: {
  user: WorkDayUserSchedule;
  offices: WorkDayOfficeSchedule[];
  onChange: (patch: Partial<WorkDayUserSchedule>) => void;
}) {
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const name = [user.lastName, user.firstName].filter(Boolean).join(' ') || user.email;
  const roleLabel = ROLES_CONFIG.find((r) => r.id === user.role)?.label ?? user.role;
  const officeAccent = getOfficeAccentColor(user.officeId, offices);
  const showScheduleEditor = user.useCustomWorkSchedule && scheduleExpanded;

  return (
    <article
      className={`${styles.card} ${styles.userCard} ${officeAccent ? styles.userCardAssigned : ''} ${showScheduleEditor ? styles.userCardExpanded : ''}`}
      style={officeAccent ? ({ '--user-office-accent': officeAccent } as CSSProperties) : undefined}
    >
      <div className={styles.userCardHead}>
        <h3 className={styles.userCardName} title={name}>
          {name}
        </h3>
        <div className={styles.userCardHeadMeta}>
          {user.useCustomWorkSchedule ? (
            <button
              type="button"
              className={styles.userScheduleToggle}
              title={scheduleExpanded ? 'Свернуть карточку' : 'Редактировать индивидуальный график'}
              onClick={() => setScheduleExpanded((expanded) => !expanded)}
            >
              {scheduleExpanded ? 'Свернуть' : 'График'}
            </button>
          ) : null}
          <span className={styles.userCardRole}>{roleLabel}</span>
        </div>
      </div>
      <div className={styles.userCardBody}>
        <label className={styles.userCheck} title="Учёт рабочего времени для этого сотрудника">
          <input
            type="checkbox"
            checked={user.workDayTrackingEnabled}
            onChange={(e) => onChange({ workDayTrackingEnabled: e.target.checked })}
          />
          <span>Учёт времени</span>
        </label>
        <label className={styles.userOffice}>
          <span>Офис</span>
          <select
            className={styles.userSelect}
            value={user.officeId ?? ''}
            onChange={(e) => onChange({ officeId: e.target.value || null })}
          >
            <option value="">— не назначен —</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.userCheck} title="Индивидуальный график (иначе — график офиса)">
          <input
            type="checkbox"
            checked={user.useCustomWorkSchedule}
            onChange={(e) => {
              const checked = e.target.checked;
              onChange({ useCustomWorkSchedule: checked });
              setScheduleExpanded(checked);
            }}
          />
          <span>Свой график</span>
        </label>
      </div>
      {showScheduleEditor ? (
        <WeeklyScheduleEditor
          schedule={getUserWeekly(user)}
          onChange={(schedule) => onChange({ workDayWeeklySchedule: schedule })}
        />
      ) : null}
    </article>
  );
}
