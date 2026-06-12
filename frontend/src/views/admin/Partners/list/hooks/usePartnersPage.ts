'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL, PARTNERS_TABLE_COLUMNS_STORAGE_KEY } from '../partners-page.constants';
import type { ColumnKey, Partner, PartnersDeleteModalState } from '../partners-page.types';

export function usePartnersPage() {
  const { getAuthHeaders } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<PartnersDeleteModalState>({
    isOpen: false,
    partner: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>([]);

  const loadColumnSettings = useCallback((defaultColumns: ColumnKey[]): ColumnKey[] => {
    if (typeof window === 'undefined') return defaultColumns;
    try {
      const saved = localStorage.getItem(PARTNERS_TABLE_COLUMNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ColumnKey[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.includes('actions') ? parsed : [...parsed, 'actions'];
        }
      }
    } catch {
      // ignore
    }
    return defaultColumns;
  }, []);

  const initColumnSettings = useCallback(
    (defaultColumns: ColumnKey[]) => {
      const saved = loadColumnSettings(defaultColumns);
      setSelectedColumns(saved.includes('actions') ? saved : [...saved, 'actions']);
    },
    [loadColumnSettings]
  );

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await apiFetch(`${API_URL}/admin/partners?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setPartners(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch partners:', error);
    } finally {
      setLoading(false);
    }
  }, [search, getAuthHeaders]);

  useEffect(() => {
    void fetchPartners();
  }, [fetchPartners]);

  const openDeleteModal = useCallback((partner: Partner) => {
    setDeleteModal({ isOpen: true, partner });
    setDeleteError(null);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModal({ isOpen: false, partner: null });
    setDeleteError(null);
  }, []);

  const handleDeletePartner = async () => {
    if (!deleteModal.partner) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await apiFetch(`${API_URL}/admin/partners/${deleteModal.partner.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        closeDeleteModal();
        await fetchPartners();
      } else {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.message || 'Ошибка при удалении партнёра');
      }
    } catch {
      setDeleteError('Ошибка сети при удалении партнёра');
    } finally {
      setDeleting(false);
    }
  };

  return {
    partners,
    loading,
    search,
    setSearch,
    deleteModal,
    deleting,
    deleteError,
    selectedColumns,
    initColumnSettings,
    openDeleteModal,
    closeDeleteModal,
    handleDeletePartner,
  };
}

export type PartnersPageModel = ReturnType<typeof usePartnersPage>;
