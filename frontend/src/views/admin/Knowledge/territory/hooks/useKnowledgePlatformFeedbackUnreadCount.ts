'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getKnowledgePlatformFeedbackUnreadCount } from '@/shared/api/admin-knowledge';

export function formatKnowledgePlatformFeedbackBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

export function useKnowledgePlatformFeedbackUnreadCount(enabled: boolean) {
  const [feedbackUnreadCount, setFeedbackUnreadCount] = useState(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const refreshFeedbackUnreadCount = useCallback(async () => {
    if (!enabledRef.current) {
      setFeedbackUnreadCount(0);
      return;
    }
    try {
      const count = await getKnowledgePlatformFeedbackUnreadCount();
      setFeedbackUnreadCount(count);
    } catch {
      setFeedbackUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshFeedbackUnreadCount();
  }, [enabled, refreshFeedbackUnreadCount]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => void refreshFeedbackUnreadCount(), 60_000);
    return () => clearInterval(interval);
  }, [enabled, refreshFeedbackUnreadCount]);

  return {
    feedbackUnreadCount,
    refreshFeedbackUnreadCount,
  };
}
