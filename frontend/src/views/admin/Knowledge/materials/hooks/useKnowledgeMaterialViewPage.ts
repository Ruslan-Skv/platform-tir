'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminResourcePermission } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import {
  type AdminKnowledgeMaterial,
  getKnowledgeMaterial,
  getKnowledgeMaterials,
  markKnowledgeMaterialStudyComplete,
  publishKnowledgeMaterial,
  toggleKnowledgeMaterialFavorite,
  toggleKnowledgeMaterialLike,
} from '@/shared/api/admin-knowledge';

import {
  KNOWLEDGE_RESOURCE_ID,
  sortKnowledgeMaterialsForCategory,
} from '../../shared/knowledge-utils';
import { buildKnowledgeTerritoryBackUrl } from '../../territory/knowledge-territory-filters-storage';

interface UseKnowledgeMaterialViewPageOptions {
  materialId: string;
}

export type KnowledgeNextMaterial = {
  id: string;
  title: string;
};

export function useKnowledgeMaterialViewPage({ materialId }: UseKnowledgeMaterialViewPageOptions) {
  const { canView, canEdit, canParticipate } = useAdminResourcePermission(KNOWLEDGE_RESOURCE_ID);
  const canStudy = canView && !canEdit;
  const [material, setMaterial] = useState<AdminKnowledgeMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [togglingLike, setTogglingLike] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [nextMaterial, setNextMaterial] = useState<KnowledgeNextMaterial | null>(null);

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

  useEffect(() => {
    if (!material?.categoryId) {
      setNextMaterial(null);
      return;
    }

    let cancelled = false;
    void getKnowledgeMaterials({
      categoryId: material.categoryId,
      status: 'PUBLISHED',
      limit: 500,
    })
      .then((result) => {
        if (cancelled) return;
        const sorted = sortKnowledgeMaterialsForCategory(result.data);
        const currentIndex = sorted.findIndex((item) => item.id === material.id);
        if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
          const next = sorted[currentIndex + 1];
          setNextMaterial({ id: next.id, title: next.title });
        } else {
          setNextMaterial(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNextMaterial(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [material?.categoryId, material?.id]);

  useEffect(() => {
    if (!material || !canStudy || material.studyCompleted) {
      return;
    }

    const shouldMarkOnView =
      material.type === 'LINK' || (material.type === 'ARTICLE' && !material.myQuizStatus?.hasQuiz);

    if (!shouldMarkOnView) {
      return;
    }

    let cancelled = false;
    void markKnowledgeMaterialStudyComplete(material.id)
      .then(() => {
        if (!cancelled) {
          setMaterial((prev) => (prev ? { ...prev, studyCompleted: true } : prev));
        }
      })
      .catch(() => {
        // ignore — material may already be marked or request failed transiently
      });

    return () => {
      cancelled = true;
    };
  }, [material, canStudy]);

  const handleStudyProgress = useCallback(() => {
    setMaterial((prev) => (prev ? { ...prev, studyCompleted: true } : prev));
  }, []);

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

  const handleToggleLike = async () => {
    if (!material) return;
    setTogglingLike(true);
    try {
      const result = await toggleKnowledgeMaterialLike(material.id);
      setMaterial((prev) =>
        prev ? { ...prev, likedByMe: result.likedByMe, likeCount: result.likeCount } : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить отметку');
    } finally {
      setTogglingLike(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!material) return;
    setTogglingFavorite(true);
    try {
      const result = await toggleKnowledgeMaterialFavorite(material.id);
      setMaterial((prev) => (prev ? { ...prev, favoritedByMe: result.favoritedByMe } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить избранное');
    } finally {
      setTogglingFavorite(false);
    }
  };

  const handleCommentCountChange = useCallback((count: number) => {
    setMaterial((prev) => (prev ? { ...prev, commentCount: count } : prev));
  }, []);

  return {
    material,
    loading,
    error,
    canEdit,
    canParticipate,
    canStudy,
    publishing,
    togglingLike,
    togglingFavorite,
    handlePublish,
    handleToggleLike,
    handleToggleFavorite,
    handleCommentCountChange,
    handleStudyProgress,
    backUrl,
    nextMaterial,
  };
}

export type KnowledgeMaterialViewPageModel = ReturnType<typeof useKnowledgeMaterialViewPage>;
