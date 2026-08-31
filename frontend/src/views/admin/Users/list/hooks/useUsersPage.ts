'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL } from '../users-page.constants';
import type { AdminUser } from '../users-page.types';

export type UsersPageMessage = { type: 'success' | 'error'; text: string };
export type UsersStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function useUsersPage() {
  const { getAuthHeaders } = useAuth();
  const { canEdit: canManageUsers, canView: canViewUsers } = useAdminSectionCanEdit();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<UsersStatusFilter>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [viewCabinetUser, setViewCabinetUser] = useState<AdminUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<UsersPageMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!canViewUsers) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/users`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Ошибка загрузки пользователей');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setUsers([]);
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Не удалось загрузить пользователей',
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, canViewUsers]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const statusCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const u of users) {
      if (u.isActive) active += 1;
      else inactive += 1;
    }
    return { ALL: users.length, ACTIVE: active, INACTIVE: inactive };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !searchQuery ||
        [u.email, u.firstName ?? '', u.lastName ?? ''].some((s) =>
          s.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchStatus =
        statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.isActive : !u.isActive);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteUser || !canManageUsers) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`${API_URL}/users/${deleteUser.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Ошибка удаления');
      setDeleteUser(null);
      setMessage({ type: 'success', text: 'Пользователь удалён.' });
      await fetchUsers();
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Не удалось удалить пользователя',
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteUser, getAuthHeaders, fetchUsers, canManageUsers]);

  return {
    canManageUsers,
    deleting,
    fetchUsers,
    filteredUsers,
    formError,
    getAuthHeaders,
    handleConfirmDelete,
    loading,
    message,
    roleFilter,
    searchQuery,
    selectedIds,
    setCreateModalOpen,
    setDeleteUser,
    setEditUser,
    setFormError,
    setMessage,
    setRoleFilter,
    setSearchQuery,
    setSelectedIds,
    setStatusFilter,
    setViewCabinetUser,
    statusCounts,
    statusFilter,
    createModalOpen,
    deleteUser,
    editUser,
    users,
    viewCabinetUser,
  };
}

export type UsersPageModel = ReturnType<typeof useUsersPage>;
