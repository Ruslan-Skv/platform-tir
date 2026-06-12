'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL } from '../users-page.constants';
import type { AdminUser } from '../users-page.types';

export function useUsersPage() {
  const { getAuthHeaders, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const canManageUsers = currentUser?.role === 'SUPER_ADMIN';
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [viewCabinetUser, setViewCabinetUser] = useState<AdminUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!canManageUsers) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/users`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Ошибка загрузки пользователей');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, canManageUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !searchQuery ||
        [u.email, u.firstName ?? '', u.lastName ?? ''].some((s) =>
          s.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteUser) return;
    try {
      const res = await apiFetch(`${API_URL}/users/${deleteUser.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Ошибка удаления');
      setDeleteUser(null);
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  }, [deleteUser, getAuthHeaders, fetchUsers]);

  return {
    canManageUsers,
    users,
    loading,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    selectedIds,
    setSelectedIds,
    createModalOpen,
    setCreateModalOpen,
    editUser,
    setEditUser,
    deleteUser,
    setDeleteUser,
    viewCabinetUser,
    setViewCabinetUser,
    formError,
    setFormError,
    fetchUsers,
    filteredUsers,
    getAuthHeaders,
    handleConfirmDelete,
  };
}

export type UsersPageModel = ReturnType<typeof useUsersPage>;
