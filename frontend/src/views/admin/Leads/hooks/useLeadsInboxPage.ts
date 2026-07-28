'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useAuth } from '@/features/auth';
import {
  type LeadSource,
  type LeadStatus,
  type UnifiedLeadItem,
  deleteAdminLead,
  getAdminLeads,
  updateAdminLead,
} from '@/shared/api/admin-leads';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';

function parseSourceParam(value: string | null): LeadSource | '' {
  if (!value) return '';
  const allowed: LeadSource[] = [
    'form_measurement',
    'form_callback',
    'form_quote',
    'quiz_mebel',
    'quiz_remont',
    'order',
    'site_feedback',
    'knowledge_feedback',
  ];
  return allowed.includes(value as LeadSource) ? (value as LeadSource) : '';
}

export function useLeadsInboxPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'SUPER_ADMIN';
  const searchParams = useSearchParams();
  const initialSource = parseSourceParam(searchParams.get('source'));
  const [leads, setLeads] = useState<UnifiedLeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusStats, setStatusStats] = useState<Record<string, number>>({});
  const [availableSources, setAvailableSources] = useState<{ id: LeadSource; label: string }[]>([]);
  const [sourceStats, setSourceStats] = useState<Partial<Record<LeadSource, number>>>({});
  const [sourceFilter, setSourceFilter] = useState<LeadSource | ''>(initialSource);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const hasLoadedOnceRef = useRef(false);
  const { errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const loadLeads = useCallback(async () => {
    // Не схлопываем ленту при смене фильтра — иначе прыгает скроллбар окна.
    if (!hasLoadedOnceRef.current) setLoading(true);
    else setRefreshing(true);
    resetSaveFeedback();
    try {
      const res = await getAdminLeads({
        page,
        limit: 20,
        source: sourceFilter,
        status: statusFilter,
        search,
      });
      setLeads(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      setStatusStats(res.statusStats);
      setAvailableSources(res.sources);
      setSourceStats(res.sourceStats ?? {});
      hasLoadedOnceRef.current = true;
    } catch {
      setLeads([]);
      showSaveError('Не удалось загрузить заявки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, sourceFilter, statusFilter, search, resetSaveFeedback, showSaveError]);

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
      const updated = await updateAdminLead(lead.id, { status });
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
      const updated = await updateAdminLead(lead.id, { managerNote: managerNote.trim() || null });
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
      await deleteAdminLead(lead.id);
      setLeads((prev) => prev.filter((item) => item.id !== lead.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showSaveSuccess();
      await loadLeads();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Не удалось удалить заявку');
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
    availableSources,
    sourceStats,
    sourceFilter,
    setSourceFilter: (value: LeadSource | '') => {
      setPage(1);
      setSourceFilter(value);
    },
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
  };
}

export type LeadsInboxPageModel = ReturnType<typeof useLeadsInboxPage>;
