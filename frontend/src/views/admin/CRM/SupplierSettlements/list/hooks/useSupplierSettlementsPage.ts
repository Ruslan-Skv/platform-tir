'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import { getSupplierSettlementTotals } from '@/shared/api/admin-crm';
import { apiFetch } from '@/shared/lib/api-fetch';

import type { Supplier } from '../supplier-settlements-page.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useSupplierSettlementsPage() {
  const { getAuthHeaders } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const [suppliersRes, totalsData] = await Promise.all([
        apiFetch(`${API_URL}/admin/catalog/suppliers?limit=1000`, {
          headers: getAuthHeaders(),
        }),
        getSupplierSettlementTotals(),
      ]);
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data.data || []);
      }
      const totalsMap: Record<string, number> = {};
      for (const [id, t] of Object.entries(totalsData)) {
        totalsMap[id] = (t as { total: number }).total;
      }
      setTotals(totalsMap);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchSuppliers();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchSuppliers]);

  const grandTotal = useMemo(
    () => suppliers.reduce((sum, s) => sum + (totals[s.id] ?? 0), 0),
    [suppliers, totals]
  );

  return {
    suppliers,
    totals,
    loading,
    grandTotal,
  };
}

export type SupplierSettlementsPageModel = ReturnType<typeof useSupplierSettlementsPage>;
