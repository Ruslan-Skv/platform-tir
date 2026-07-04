'use client';

import { useCallback, useState } from 'react';

import type { KnowledgeTrainingCelebration } from '@/shared/api/admin-knowledge';

export function useKnowledgeTrainingCelebration() {
  const [celebration, setCelebration] = useState<KnowledgeTrainingCelebration | null>(null);

  const showCelebration = useCallback(
    (payload: KnowledgeTrainingCelebration | null | undefined) => {
      if (!payload) return;
      setCelebration(payload);
    },
    []
  );

  const dismissCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  const handleMaterialCompleted = useCallback(
    (payload?: KnowledgeTrainingCelebration | null) => {
      showCelebration(payload);
    },
    [showCelebration]
  );

  return {
    celebration,
    showCelebration,
    dismissCelebration,
    handleMaterialCompleted,
  };
}
