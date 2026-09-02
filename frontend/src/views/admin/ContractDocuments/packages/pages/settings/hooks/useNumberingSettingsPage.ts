'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import {
  type CrmDirection,
  type CrmUser,
  type Office,
  getCrmDirections,
  getCrmUsers,
  getOffices,
  updateCrmDirection,
} from '@/shared/api/admin-crm';
import { filterCrmDirectionsForNumbering } from '@/shared/lib/admin/crm-directions-for-contract-create';
import { apiFetch } from '@/shared/lib/api-fetch';

import {
  NUMBERING_USERS_API_URL,
  formatNumberingUserLabel,
  getNumberingAuthHeaders,
} from '../numberingSettingsUtils';

export type NumberingPageMessage = { type: 'success' | 'error'; text: string };
export type NumberingSectionTab = 'offices' | 'employees' | 'directions';
export type NumberingOfficeStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function useNumberingSettingsPage() {
  const { canEdit: isSuperAdmin } = useAdminSectionCanEdit();
  const [message, setMessage] = useState<NumberingPageMessage | null>(null);

  const [offices, setOffices] = useState<Office[]>([]);
  const [officeStatusFilter, setOfficeStatusFilter] = useState<NumberingOfficeStatusFilter>('ALL');

  const [users, setUsers] = useState<CrmUser[]>([]);
  const [userDrafts, setUserDrafts] = useState<Record<string, string>>({});
  const [userSavingId, setUserSavingId] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState('');

  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [directionDrafts, setDirectionDrafts] = useState<Record<string, string>>({});
  const [directionSavingId, setDirectionSavingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [officeResult, userResult, directionResult] = await Promise.allSettled([
        getOffices(true),
        getCrmUsers(),
        getCrmDirections(),
      ]);

      const errors: string[] = [];

      if (officeResult.status === 'fulfilled') {
        const officeList = officeResult.value;
        setOffices(
          officeList
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        );
      } else {
        setOffices([]);
        errors.push('офисы');
      }

      if (userResult.status === 'fulfilled') {
        const userList = userResult.value;
        setUsers(
          userList
            .slice()
            .sort((a, b) =>
              formatNumberingUserLabel(a).localeCompare(formatNumberingUserLabel(b), 'ru')
            )
        );
        setUserDrafts(Object.fromEntries(userList.map((u) => [u.id, u.employeeCode ?? ''])));
      } else {
        setUsers([]);
        setUserDrafts({});
        errors.push('сотрудники');
      }

      if (directionResult.status === 'fulfilled') {
        const sortedDirections = filterCrmDirectionsForNumbering(directionResult.value);
        setDirections(sortedDirections);
        setDirectionDrafts(
          Object.fromEntries(sortedDirections.map((d) => [d.id, d.numberLetter ?? '']))
        );
      } else {
        setDirections([]);
        setDirectionDrafts({});
        errors.push('направления');
      }

      if (errors.length > 0) {
        setMessage({
          type: 'error',
          text: `Не удалось загрузить: ${errors.join(', ')}`,
        });
      }
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Не удалось загрузить справочники',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const officeCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const o of offices) {
      if (o.isActive) active += 1;
      else inactive += 1;
    }
    return { ALL: offices.length, ACTIVE: active, INACTIVE: inactive };
  }, [offices]);

  const filteredOffices = useMemo(() => {
    if (officeStatusFilter === 'ACTIVE') return offices.filter((o) => o.isActive);
    if (officeStatusFilter === 'INACTIVE') return offices.filter((o) => !o.isActive);
    return offices;
  }, [offices, officeStatusFilter]);

  const filteredUsers = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hay =
        `${formatNumberingUserLabel(u)} ${u.email} ${u.employeeCode ?? ''} ${u.role}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, userFilter]);

  const setUserDraft = useCallback((id: string, value: string) => {
    setUserDrafts((prev) => ({ ...prev, [id]: value }));
  }, []);

  const setDirectionDraft = useCallback((id: string, value: string) => {
    setDirectionDrafts((prev) => ({ ...prev, [id]: value.slice(0, 4) }));
  }, []);

  const saveUserCode = useCallback(
    async (id: string) => {
      if (!isSuperAdmin) return;
      setUserSavingId(id);
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
        setMessage({ type: 'success', text: `Код сотрудника «${label}» сохранён` });
      } catch (e) {
        setMessage({
          type: 'error',
          text: e instanceof Error ? e.message : 'Не удалось сохранить код',
        });
      } finally {
        setUserSavingId(null);
      }
    },
    [isSuperAdmin, userDrafts, users]
  );

  const saveDirectionLetter = useCallback(
    async (id: string) => {
      if (!isSuperAdmin) return;
      setDirectionSavingId(id);
      try {
        const updated = await updateCrmDirection(id, {
          numberLetter: directionDrafts[id]?.trim() || null,
        });
        setDirections((prev) => prev.map((d) => (d.id === id ? updated : d)));
        setDirectionDrafts((prev) => ({ ...prev, [id]: updated.numberLetter ?? '' }));
        setMessage({ type: 'success', text: `Буква направления «${updated.name}» сохранена` });
      } catch (e) {
        setMessage({
          type: 'error',
          text: e instanceof Error ? e.message : 'Не удалось сохранить букву направления',
        });
      } finally {
        setDirectionSavingId(null);
      }
    },
    [directionDrafts, isSuperAdmin]
  );

  return {
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
    offices,
    refresh: load,
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
  };
}

export type NumberingSettingsPageModel = ReturnType<typeof useNumberingSettingsPage>;
