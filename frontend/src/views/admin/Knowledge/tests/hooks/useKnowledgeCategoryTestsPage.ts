'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useAdminResourcePermission } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import { useAuth } from '@/features/auth';
import {
  type KnowledgeCategoryTestSummary,
  getKnowledgeCategoryTests,
} from '@/shared/api/admin-knowledge';
import {
  KNOWLEDGE_TESTS_RESOURCE_ID,
  buildKnowledgeCategoryTestsResourceId,
  getKnowledgeCategoryTestsResourceLabel,
} from '@/shared/config/admin-knowledge-resources';

import { KNOWLEDGE_RESOURCE_ID } from '../../shared/knowledge-utils';

export type KnowledgeCategoryTestsPageModel = ReturnType<typeof useKnowledgeCategoryTestsPage>;

export function useKnowledgeCategoryTestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { canView: canViewKnowledge, isLoading: knowledgePermissionsLoading } =
    useAdminResourcePermission(KNOWLEDGE_RESOURCE_ID);
  const { canView: canViewTestsBlock, isLoading: testsPermissionsLoading } =
    useAdminResourcePermission(KNOWLEDGE_TESTS_RESOURCE_ID);
  const knowledgeAccessReady =
    !authLoading && !knowledgePermissionsLoading && !testsPermissionsLoading;
  const canView = canViewKnowledge && canViewTestsBlock;

  const [summaries, setSummaries] = useState<KnowledgeCategoryTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryAccessModal, setCategoryAccessModal] = useState<{
    resourceId: string;
    label: string;
  } | null>(null);
  const [testsBlockAccessModal, setTestsBlockAccessModal] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const selectedCategoryId = searchParams.get('category') ?? '';

  const selectedSummary = useMemo(
    () => summaries.find((item) => item.category.id === selectedCategoryId) ?? null,
    [summaries, selectedCategoryId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getKnowledgeCategoryTests();
      setSummaries(items);
    } catch (err) {
      setSummaries([]);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить тесты');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!knowledgeAccessReady) return;
    if (!canView) {
      router.replace('/admin');
      return;
    }
    void load();
  }, [canView, knowledgeAccessReady, load, router]);

  useEffect(() => {
    if (!loading && summaries.length > 0 && !selectedCategoryId) {
      router.replace(`/admin/knowledge/tests?category=${summaries[0].category.id}`);
    }
  }, [loading, router, selectedCategoryId, summaries]);

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      router.push(`/admin/knowledge/tests?category=${categoryId}`);
    },
    [router]
  );

  const openCategoryAccessModal = useCallback((summary: KnowledgeCategoryTestSummary) => {
    setCategoryAccessModal({
      resourceId: buildKnowledgeCategoryTestsResourceId(summary.category.id),
      label: getKnowledgeCategoryTestsResourceLabel(summary.category.name),
    });
  }, []);

  const openTestsBlockAccessModal = useCallback(() => {
    setTestsBlockAccessModal(true);
  }, []);

  return {
    canView,
    loading,
    error,
    summaries,
    selectedCategoryId,
    selectedSummary,
    handleCategorySelect,
    isSuperAdmin,
    categoryAccessModal,
    setCategoryAccessModal,
    openCategoryAccessModal,
    testsBlockAccessModal,
    setTestsBlockAccessModal,
    openTestsBlockAccessModal,
    reload: load,
  };
}
