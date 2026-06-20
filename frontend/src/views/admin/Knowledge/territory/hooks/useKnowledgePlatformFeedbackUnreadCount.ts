'use client';

import { useCallback, useEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

import { getKnowledgePlatformFeedback } from '@/shared/api/admin-knowledge';

export function formatKnowledgePlatformFeedbackBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

export function useKnowledgePlatformFeedbackUnreadCount(enabled: boolean) {
  const pathname = usePathname();
  const [feedbackUnreadCount, setFeedbackUnreadCount] = useState(0);

  const refreshFeedbackUnreadCount = useCallback(async () => {
    if (!enabled) {
      setFeedbackUnreadCount(0);
      return;
    }
    try {
      const data = await getKnowledgePlatformFeedback({ unreadOnly: true, limit: 100 });
      setFeedbackUnreadCount(data.items?.length ?? 0);
    } catch {
      setFeedbackUnreadCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    void refreshFeedbackUnreadCount();
  }, [refreshFeedbackUnreadCount, pathname]);

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
