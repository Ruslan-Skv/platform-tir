'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import {
  type LeadSource,
  type LeadStatus,
  type UnifiedLeadItem,
  getAdminLeads,
  updateAdminLead,
} from '@/shared/api/admin-leads';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';

function parseSourceParam(value: string | null): LeadSource | '' {
  if (!value) return '';
  const allowed: LeadSource[] = [
    'form_measurement',
    'form_callback',
    'form_director',
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
  const searchParams = useSearchParams();
  const initialSource = parseSourceParam(searchParams.get('source'));
  const [leads, setLeads] = useState<UnifiedLeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusStats, setStatusStats] = useState<Record<string, number>>({});
  const [availableSources, setAvailableSources] = useState<{ id: LeadSource; label: string }[]>([]);
  const [sourceFilter, setSourceFilter] = useState<LeadSource | ''>(initialSource);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const loadLeads = useCallback(async () => {
    setLoading(true);
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
    } catch {
      setLeads([]);
      showSaveError('Не удалось загрузить заявки');
    } finally {
      setLoading(false);
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

  return {
    leads,
    loading,
    savingId,
    page,
    setPage,
    totalPages,
    total,
    statusStats,
    availableSources,
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
    errorMessage,
  };
}

export type LeadsInboxPageModel = ReturnType<typeof useLeadsInboxPage>;
