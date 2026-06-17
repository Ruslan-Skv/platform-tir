'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type AdminKnowledgeMaterial,
  getKnowledgeMaterial,
  publishKnowledgeMaterial,
} from '@/shared/api/admin-knowledge';

import { isKnowledgeEditor } from '../../shared/knowledge-utils';
import { buildKnowledgeTerritoryBackUrl } from '../../territory/knowledge-territory-filters-storage';

interface UseKnowledgeMaterialViewPageOptions {
  materialId: string;
}

export function useKnowledgeMaterialViewPage({ materialId }: UseKnowledgeMaterialViewPageOptions) {
  const { user } = useAuth();
  const canEdit = isKnowledgeEditor(user?.role);

  const [material, setMaterial] = useState<AdminKnowledgeMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const backUrl = useMemo(
    () => buildKnowledgeTerritoryBackUrl(material?.categoryId),
    [material?.categoryId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getKnowledgeMaterial(materialId);
      setMaterial(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Материал не найден');
      setMaterial(null);
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePublish = async () => {
    if (!material) return;
    setPublishing(true);
    try {
      const updated = await publishKnowledgeMaterial(material.id);
      setMaterial(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка публикации');
    } finally {
      setPublishing(false);
    }
  };

  return {
    material,
    loading,
    error,
    canEdit,
    publishing,
    handlePublish,
    backUrl,
  };
}

export type KnowledgeMaterialViewPageModel = ReturnType<typeof useKnowledgeMaterialViewPage>;
