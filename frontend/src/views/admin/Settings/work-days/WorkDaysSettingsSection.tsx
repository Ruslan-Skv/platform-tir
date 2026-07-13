'use client';

import { useCallback, useEffect, useState } from 'react';

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
import { ROLES_CONFIG } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings';

import { WeeklyScheduleEditor } from './WeeklyScheduleEditor';
import { WorkDaysIpHelp } from './WorkDaysIpHelp';
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
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flashSaved = () => {
    setNotice(true);
    setTimeout(() => setNotice(false), 2000);
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
    setSaving(true);
    try {
      const updated = await updateWorkDaySettings(patch);
      setSettings(updated);
      flashSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (role: string) => {
    const tracked = settings.trackedRoles.includes(role as WorkDaySettings['trackedRoles'][number])
      ? settings.trackedRoles.filter((r) => r !== role)
      : [...settings.trackedRoles, role as WorkDaySettings['trackedRoles'][number]];
    void saveSettings({ trackedRoles: tracked });
  };

  const saveOffice = async (office: WorkDayOfficeSchedule) => {
    setSaving(true);
    try {
      const weekly = getOfficeWeekly(office);
      const updated = await updateWorkDayOffice(office.id, {
        allowedIps: office.allowedIps,
        workDayWeeklySchedule: weekly,
      });
      setOffices((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      flashSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения офиса');
    } finally {
      setSaving(false);
    }
  };

  const saveUserSchedule = async (u: WorkDayUserSchedule) => {
    setSaving(true);
    try {
      const payload: Parameters<typeof updateWorkDayUser>[1] = {
        officeId: u.officeId,
        workDayTrackingEnabled: u.workDayTrackingEnabled,
        useCustomWorkSchedule: u.useCustomWorkSchedule,
      };
      if (u.useCustomWorkSchedule) {
        payload.workDayWeeklySchedule = getUserWeekly(u);
      }
      const updated = await updateWorkDayUser(u.id, payload);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      flashSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения сотрудника');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSubPageView
      title="Учёт рабочего времени"
      subtitle="Настройка графиков, IP-адресов офисов и ролей, для которых включён учёт рабочего дня."
      backLink={{ href: '/admin/settings', label: '← Настройки' }}
      saveNoticeVisible={notice}
      wide
    >
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

      {error ? <p className={styles.error}>{error}</p> : null}

      {tab === 'general' && (
        <section className={styles.section}>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={settings.isEnabled}
              onChange={(e) => void saveSettings({ isEnabled: e.target.checked })}
              disabled={saving}
            />
            Учёт рабочего дня включён
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={settings.blockAdminWithoutWorkDay}
              onChange={(e) => void saveSettings({ blockAdminWithoutWorkDay: e.target.checked })}
              disabled={saving}
            />
            Блокировать админку без начала рабочего дня
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={settings.requireOfficeIp}
              onChange={(e) => void saveSettings({ requireOfficeIp: e.target.checked })}
              disabled={saving}
            />
            Разрешать начало дня только с IP офиса
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={settings.blockMobileDevices}
              onChange={(e) => void saveSettings({ blockMobileDevices: e.target.checked })}
              disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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
                  disabled={saving}
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
          <WorkDaysIpHelp />
          {offices.map((office) => (
            <OfficeCard
              key={office.id}
              office={office}
              saving={saving}
              onChange={(patch) =>
                setOffices((prev) => prev.map((o) => (o.id === office.id ? { ...o, ...patch } : o)))
              }
              onSave={() => void saveOffice(office)}
            />
          ))}
        </section>
      )}

      {tab === 'users' && (
        <section className={styles.section}>
          <p className={styles.hint}>
            Все активные сотрудники админки. Учёт по роли включается на вкладке «Общие», но для
            каждого сотрудника его можно отключить отдельно.
          </p>
          {users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              offices={offices}
              saving={saving}
              onChange={(patch) =>
                setUsers((prev) =>
                  prev.map((item) => (item.id === u.id ? { ...item, ...patch } : item))
                )
              }
              onSave={() => void saveUserSchedule(u)}
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
  saving,
  onChange,
  onSave,
}: {
  office: WorkDayOfficeSchedule;
  saving: boolean;
  onChange: (patch: Partial<WorkDayOfficeSchedule>) => void;
  onSave: () => void;
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
        disabled={saving}
        onChange={(schedule) => onChange({ workDayWeeklySchedule: schedule })}
      />
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
      <button type="button" className={styles.saveBtn} onClick={onSave} disabled={saving}>
        Сохранить офис
      </button>
    </article>
  );
}

function UserCard({
  user,
  offices,
  saving,
  onChange,
  onSave,
}: {
  user: WorkDayUserSchedule;
  offices: WorkDayOfficeSchedule[];
  saving: boolean;
  onChange: (patch: Partial<WorkDayUserSchedule>) => void;
  onSave: () => void;
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
          disabled={saving}
          onChange={(schedule) => onChange({ workDayWeeklySchedule: schedule })}
        />
      ) : null}
      <button type="button" className={styles.saveBtn} onClick={onSave} disabled={saving}>
        Сохранить
      </button>
    </article>
  );
}
