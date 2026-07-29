'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type LeadSource,
  type LeadStatus,
  type UnifiedLeadItem,
  deleteAdminDirectorMessage,
  getAdminDirectorMessages,
  updateAdminDirectorMessage,
} from '@/shared/api/admin-leads';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';

export function useDirectorMessagesPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'SUPER_ADMIN';
  const [leads, setLeads] = useState<UnifiedLeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusStats, setStatusStats] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const hasLoadedOnceRef = useRef(false);
  const { errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const loadLeads = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setLoading(true);
    else setRefreshing(true);
    resetSaveFeedback();
    try {
      const res = await getAdminDirectorMessages({
        page,
        limit: 20,
        status: statusFilter,
        search,
      });
      setLeads(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      setStatusStats(res.statusStats);
      hasLoadedOnceRef.current = true;
    } catch {
      setLeads([]);
      showSaveError('Не удалось загрузить письма директору');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, search, resetSaveFeedback, showSaveError]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStatusChange = async (lead: UnifiedLeadItem, status: LeadStatus) => {
    setSavingId(lead.id);
    try {
      const updated = await updateAdminDirectorMessage(lead.id, { status });
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? updated : item)));
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingId(null);
    }
  };

  const handleNoteSave = async (lead: UnifiedLeadItem, managerNote: string) => {
    setSavingId(lead.id);
    try {
      const updated = await updateAdminDirectorMessage(lead.id, {
        managerNote: managerNote.trim() || null,
      });
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? updated : item)));
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (lead: UnifiedLeadItem) => {
    if (!canDelete) return;
    setDeletingId(lead.id);
    try {
      await deleteAdminDirectorMessage(lead.id);
      setLeads((prev) => prev.filter((item) => item.id !== lead.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showSaveSuccess();
      await loadLeads();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Не удалось удалить письмо');
    } finally {
      setDeletingId(null);
    }
  };

  return {
    leads,
    loading,
    refreshing,
    savingId,
    deletingId,
    canDelete,
    page,
    setPage,
    totalPages,
    total,
    statusStats,
    availableSources: [] as { id: string; label: string }[],
    sourceStats: {} as Partial<Record<LeadSource, number>>,
    sourceFilter: '',
    setSourceFilter: (_value: LeadSource | '') => undefined,
    statusFilter,
    setStatusFilter: (value: LeadStatus | '') => {
      setPage(1);
      setStatusFilter(value);
    },
    searchInput,
    setSearchInput,
    applySearch,
    loadLeads,
    handleStatusChange,
    handleNoteSave,
    handleDelete,
    errorMessage,
    variant: 'director' as const,
  };
}

export type DirectorMessagesPageModel = ReturnType<typeof useDirectorMessagesPage>;
