import { useEffect, useState } from 'react';

import type { KnowledgeQuizPlatformSettings } from '@/shared/api/admin-knowledge';

import { fetchKnowledgeQuizPlatformSettings } from './knowledge-quiz-platform-settings';

export function useKnowledgeQuizPlatformSettings(): KnowledgeQuizPlatformSettings | null {
  const [settings, setSettings] = useState<KnowledgeQuizPlatformSettings | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchKnowledgeQuizPlatformSettings()
      .then((data) => {
        if (!cancelled) {
          setSettings(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSettings(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}

export function useKnowledgeQuizTimePerQuestionSeconds(
  variant: 'material' | 'category'
): number | null {
  const settings = useKnowledgeQuizPlatformSettings();
  if (!settings) return null;

  return variant === 'material'
    ? settings.materialQuizTimePerQuestionSeconds
    : settings.categoryQuizTimePerQuestionSeconds;
}

export function useKnowledgeQuizMaxAttemptsPerDay(variant: 'material' | 'category'): number | null {
  const settings = useKnowledgeQuizPlatformSettings();
  if (!settings) return null;

  return variant === 'material'
    ? settings.materialQuizMaxAttemptsPerDay
    : settings.categoryQuizMaxAttemptsPerDay;
}

export function useKnowledgeQuizRetryCooldownMinutes(
  variant: 'material' | 'category'
): number | null {
  const settings = useKnowledgeQuizPlatformSettings();
  if (!settings) return null;

  return variant === 'material'
    ? settings.materialQuizRetryCooldownMinutes
    : settings.categoryQuizRetryCooldownMinutes;
}
