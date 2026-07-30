'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import {
  type CrmUser,
  type Office,
  getCrmUsers,
  getOffices,
  updateOffice,
} from '@/shared/api/admin-crm';
import { apiFetch } from '@/shared/lib/api-fetch';
import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import { DirectionNumberLettersSection } from './DirectionNumberLettersSection';
import styles from './NumberingSettingsPage.module.css';
import { SettingsPageLayout } from './SettingsPageLayout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

function formatUserLabel(u: CrmUser): string {
  const name = [u.lastName, u.firstName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

export function ContractDocumentsNumberingSettingsPage() {
  const { canEdit: isSuperAdmin } = useAdminSectionCanEdit();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [offices, setOffices] = useState<Office[]>([]);
  const [officeDrafts, setOfficeDrafts] = useState<Record<string, string>>({});
  const [officeSavingId, setOfficeSavingId] = useState<string | null>(null);

  const [users, setUsers] = useState<CrmUser[]>([]);
  const [userDrafts, setUserDrafts] = useState<Record<string, string>>({});
  const [userSavingId, setUserSavingId] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [officeList, userList] = await Promise.all([getOffices(true), getCrmUsers()]);
      setOffices(
        officeList.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      );
      setOfficeDrafts(Object.fromEntries(officeList.map((o) => [o.id, o.prefix ?? ''])));
      setUsers(
        userList.slice().sort((a, b) => formatUserLabel(a).localeCompare(formatUserLabel(b), 'ru'))
      );
      setUserDrafts(Object.fromEntries(userList.map((u) => [u.id, u.employeeCode ?? ''])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить справочники');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hay =
        `${formatUserLabel(u)} ${u.email} ${u.employeeCode ?? ''} ${u.role}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, userFilter]);

  const saveOfficePrefix = async (id: string) => {
    if (!isSuperAdmin) return;
    setOfficeSavingId(id);
    setError(null);
    setOk(null);
    try {
      const updated = await updateOffice(id, {
        prefix: officeDrafts[id]?.trim() || null,
      });
      setOffices((prev) => prev.map((o) => (o.id === id ? updated : o)));
      setOfficeDrafts((prev) => ({ ...prev, [id]: updated.prefix ?? '' }));
      setOk(`Префикс офиса «${updated.name}» сохранён`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить префикс офиса');
    } finally {
      setOfficeSavingId(null);
    }
  };

  const saveUserCode = async (id: string) => {
    if (!isSuperAdmin) return;
    setUserSavingId(id);
    setError(null);
    setOk(null);
    try {
      const code = userDrafts[id]?.trim() || null;
      const res = await apiFetch(`${API_URL}/users/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ employeeCode: code }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Не удалось сохранить код сотрудника');
      }
      const updated = (await res.json()) as { employeeCode?: string | null };
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, employeeCode: updated.employeeCode ?? null } : u))
      );
      setUserDrafts((prev) => ({ ...prev, [id]: updated.employeeCode ?? '' }));
      const label = formatUserLabel(users.find((u) => u.id === id) ?? ({ email: id } as CrmUser));
      setOk(`Код сотрудника «${label}» сохранён`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить код');
    } finally {
      setUserSavingId(null);
    }
  };

  return (
    <SettingsPageLayout
      title="Нумерация договоров"
      subtitle={
        <>
          Единый справочник для формата <code className={styles.code}>77/1/3д-5</code>: префикс
          офиса, код менеджера, код замерщика, буква направления и порядковый номер (свой у каждого
          менеджера по направлению).
        </>
      }
      error={error}
      ok={ok}
    >
      <div className={styles.stack}>
        <section className={cdTemplates.sectionCard}>
          <h3 className={cdTemplates.sectionTitle} style={{ marginTop: 0 }}>
            Как собирается номер
          </h3>
          <ol className={styles.steps}>
            <li>
              <strong>Офис</strong> — префикс офиса, в котором менеджер открыл рабочий день.
            </li>
            <li>
              <strong>Менеджер</strong> — персональный код сотрудника (карточка менеджера →
              пользователь CRM).
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

        {loading ? (
          <p className={cdTemplates.hint}>Загрузка справочников…</p>
        ) : (
          <>
            <section className={cdTemplates.sectionCard}>
              <h3 className={cdTemplates.sectionTitle} style={{ marginTop: 0 }}>
                Префиксы офисов
              </h3>
              <p className={cdTemplates.hint} style={{ marginTop: 0 }}>
                Первая часть номера (например, <code>77</code>). У активных офисов префикс лучше
                задавать всегда.
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Офис</th>
                      <th>Статус</th>
                      <th>Префикс</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {offices.map((o) => (
                      <tr key={o.id}>
                        <td>{o.name}</td>
                        <td>{o.isActive ? 'Активен' : 'Выкл.'}</td>
                        <td>
                          <input
                            className={styles.input}
                            value={officeDrafts[o.id] ?? ''}
                            onChange={(e) =>
                              setOfficeDrafts((prev) => ({ ...prev, [o.id]: e.target.value }))
                            }
                            disabled={!isSuperAdmin}
                            placeholder="77"
                            autoComplete="off"
                          />
                        </td>
                        <td>
                          {isSuperAdmin ? (
                            <button
                              type="button"
                              className={cdWorkspace.secondaryBtn}
                              disabled={officeSavingId === o.id}
                              onClick={() => void saveOfficePrefix(o.id)}
                            >
                              {officeSavingId === o.id ? '…' : 'Сохранить'}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={cdTemplates.sectionCard}>
              <h3 className={cdTemplates.sectionTitle} style={{ marginTop: 0 }}>
                Коды сотрудников
              </h3>
              <p className={cdTemplates.hint} style={{ marginTop: 0 }}>
                Один код на человека — и для менеджера, и для замерщика (например, <code>1</code> и{' '}
                <code>3</code> в номере 77/1/3д-5).
              </p>
              <div className={cdEstimateTab.field} style={{ maxWidth: 320, marginBottom: 12 }}>
                <label htmlFor="numbering-user-filter">Поиск</label>
                <input
                  id="numbering-user-filter"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  placeholder="ФИО, email, код…"
                  autoComplete="off"
                />
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Сотрудник</th>
                      <th>Роль</th>
                      <th>Код</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div>{formatUserLabel(u)}</div>
                          <div className={styles.muted}>{u.email}</div>
                        </td>
                        <td>{u.role}</td>
                        <td>
                          <input
                            className={styles.input}
                            value={userDrafts[u.id] ?? ''}
                            onChange={(e) =>
                              setUserDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))
                            }
                            disabled={!isSuperAdmin}
                            placeholder="1"
                            autoComplete="off"
                          />
                        </td>
                        <td>
                          {isSuperAdmin ? (
                            <button
                              type="button"
                              className={cdWorkspace.secondaryBtn}
                              disabled={userSavingId === u.id}
                              onClick={() => void saveUserCode(u.id)}
                            >
                              {userSavingId === u.id ? '…' : 'Сохранить'}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <DirectionNumberLettersSection
              isSuperAdmin={isSuperAdmin}
              onError={setError}
              onOk={setOk}
            />
          </>
        )}
      </div>
    </SettingsPageLayout>
  );
}
