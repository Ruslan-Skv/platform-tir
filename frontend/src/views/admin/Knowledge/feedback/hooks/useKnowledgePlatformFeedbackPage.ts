'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAdminResourcePermission } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import {
  type KnowledgePlatformFeedback,
  type KnowledgePlatformFeedbackType,
  getKnowledgePlatformFeedback,
  markKnowledgePlatformFeedbackRead,
} from '@/shared/api/admin-knowledge';

import { KNOWLEDGE_RESOURCE_ID } from '../../shared/knowledge-utils';

export function useKnowledgePlatformFeedbackPage() {
  const router = useRouter();
  const { canEdit } = useAdminResourcePermission(KNOWLEDGE_RESOURCE_ID);

  const [items, setItems] = useState<KnowledgePlatformFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<KnowledgePlatformFeedbackType | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getKnowledgePlatformFeedback({
        type: typeFilter || undefined,
      });
      setItems(data.items);
      await markKnowledgePlatformFeedbackRead();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить сообщения');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    if (!canEdit) {
      router.replace('/admin/knowledge');
      return;
    }
    void load();
  }, [canEdit, load, router]);

  return {
    canEdit,
    items,
    loading,
    error,
    typeFilter,
    setTypeFilter,
    load,
  };
}

export type KnowledgePlatformFeedbackPageModel = ReturnType<
  typeof useKnowledgePlatformFeedbackPage
>;
