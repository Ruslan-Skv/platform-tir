'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import {
  type CrmUser,
  type Office,
  getCrmUsers,
  getOffices,
  updateOffice,
} from '@/shared/api/admin-crm';
import { apiFetch } from '@/shared/lib/api-fetch';

import {
  NUMBERING_USERS_API_URL,
  formatNumberingUserLabel,
  getNumberingAuthHeaders,
} from '../numberingSettingsUtils';

export function useNumberingSettingsPage() {
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
        userList
          .slice()
          .sort((a, b) =>
            formatNumberingUserLabel(a).localeCompare(formatNumberingUserLabel(b), 'ru')
          )
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
        `${formatNumberingUserLabel(u)} ${u.email} ${u.employeeCode ?? ''} ${u.role}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, userFilter]);

  const setOfficeDraft = useCallback((id: string, value: string) => {
    setOfficeDrafts((prev) => ({ ...prev, [id]: value }));
  }, []);

  const setUserDraft = useCallback((id: string, value: string) => {
    setUserDrafts((prev) => ({ ...prev, [id]: value }));
  }, []);

  const saveOfficePrefix = useCallback(
    async (id: string) => {
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
    },
    [isSuperAdmin, officeDrafts]
  );

  const saveUserCode = useCallback(
    async (id: string) => {
      if (!isSuperAdmin) return;
      setUserSavingId(id);
      setError(null);
      setOk(null);
      try {
        const code = userDrafts[id]?.trim() || null;
        const res = await apiFetch(`${NUMBERING_USERS_API_URL}/users/${id}`, {
          method: 'PATCH',
          headers: getNumberingAuthHeaders(),
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
        const label = formatNumberingUserLabel(
          users.find((u) => u.id === id) ?? ({ email: id } as CrmUser)
        );
        setOk(`Код сотрудника «${label}» сохранён`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить код');
      } finally {
        setUserSavingId(null);
      }
    },
    [isSuperAdmin, userDrafts, users]
  );

  return {
    isSuperAdmin,
    error,
    ok,
    setError,
    setOk,
    loading,
    offices,
    officeDrafts,
    officeSavingId,
    setOfficeDraft,
    saveOfficePrefix,
    filteredUsers,
    userDrafts,
    userSavingId,
    userFilter,
    setUserFilter,
    setUserDraft,
    saveUserCode,
  };
}

export type NumberingSettingsPageModel = ReturnType<typeof useNumberingSettingsPage>;
