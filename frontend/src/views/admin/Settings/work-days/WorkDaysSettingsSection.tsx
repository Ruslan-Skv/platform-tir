'use client';

import { useCallback, useEffect, useState } from 'react';

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
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';
import { ROLES_CONFIG } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings';

import { WeeklyScheduleEditor } from './WeeklyScheduleEditor';
import styles from './WorkDaysSettingsSection.module.css';
import { type WeeklySchedule, normalizeWeeklySchedule } from './weekly-schedule.utils';

type Tab = 'general' | 'offices' | 'users';

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
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    setLoading(true);
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
  }, [showSaveError]);

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

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <p className={styles.denied}>
        Настройки учёта рабочего времени доступны только супер-администратору.
      </p>
    );
  }

  if (loading || !settings) {
    return <p className={styles.loading}>Загрузка…</p>;
  }

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

  return (
    <SettingsSubPageView
      title="Учёт рабочего времени"
      subtitle="Настройка графиков, IP-адресов офисов и ролей, для которых включён учёт рабочего дня."
      backLink={{ href: '/admin/settings', label: '← Настройки' }}
      saveNoticeVisible={saveNoticeVisible}
      wide
    >
      {errorMessage ? (
        <AdminFormMessage type="error" className={styles.feedback}>
          {errorMessage}
        </AdminFormMessage>
      ) : null}

      <div className={styles.tabs}>
        {(
          [
            ['general', 'Общие'],
            ['offices', 'Офисы'],
            ['users', 'Сотрудники'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? styles.tabActive : styles.tab}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <section className={styles.section}>
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
              onChange={(e) => void saveSettings({ blockAdminWithoutWorkDay: e.target.checked })}
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
            По одной фразе на строку. Используйте <code>{'{имя}'}</code> для обращения по имени. При
            начале дня показывается случайная фраза.
          </p>
        </section>
      )}

      {tab === 'offices' && (
        <section className={styles.section}>
          <div className={styles.tabToolbar}>
            <p className={styles.hint}>
              График по дням недели, проверка IP и разрешённые адреса для каждого офиса.
            </p>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={() => void saveAllOffices()}
              disabled={savingOffices || offices.length === 0}
            >
              {savingOffices ? 'Сохранение…' : 'Сохранить офисы'}
            </button>
          </div>
          <WorkDaysIpHelp />
          {offices.map((office) => (
            <OfficeCard
              key={office.id}
              office={office}
              onChange={(patch) =>
                setOffices((prev) => prev.map((o) => (o.id === office.id ? { ...o, ...patch } : o)))
              }
            />
          ))}
        </section>
      )}

      {tab === 'users' && (
        <section className={styles.section}>
          <div className={styles.tabToolbar}>
            <p className={styles.hint}>
              Все активные сотрудники админки. Учёт по роли включается на вкладке «Общие», но для
              каждого сотрудника его можно отключить отдельно.
            </p>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={() => void saveAllUsers()}
              disabled={savingUsers || users.length === 0}
            >
              {savingUsers ? 'Сохранение…' : 'Сохранить сотрудников'}
            </button>
          </div>
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
        </section>
      )}
    </SettingsSubPageView>
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
  const name = [user.lastName, user.firstName].filter(Boolean).join(' ') || user.email;
  const roleTracked = user.workDayTrackingEnabled;
  return (
    <article className={styles.card}>
      <h3 className={styles.cardTitle}>{name}</h3>
      <p className={styles.meta}>{user.role}</p>
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={roleTracked}
          onChange={(e) => onChange({ workDayTrackingEnabled: e.target.checked })}
        />
        Учёт рабочего времени для этого сотрудника
      </label>
      <label className={styles.fullWidth}>
        Офис
        <select
          className={styles.input}
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
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={user.useCustomWorkSchedule}
          onChange={(e) => onChange({ useCustomWorkSchedule: e.target.checked })}
        />
        Индивидуальный график (иначе — график офиса)
      </label>
      {user.useCustomWorkSchedule ? (
        <WeeklyScheduleEditor
          schedule={getUserWeekly(user)}
          onChange={(schedule) => onChange({ workDayWeeklySchedule: schedule })}
        />
      ) : null}
    </article>
  );
}
