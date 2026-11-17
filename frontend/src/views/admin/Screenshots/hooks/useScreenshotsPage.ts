'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import type { AdminScreenshotItem } from '@/shared/api/admin-screenshots';
import { deleteAdminScreenshot, listAdminScreenshots } from '@/shared/api/admin-screenshots';

export type ScreenshotsFilter = 'all' | 'my';

export type ScreenshotsPageModel = {
  items: AdminScreenshotItem[];
  isLoading: boolean;
  error: string | null;
  isSuperAdmin: boolean;
  filter: ScreenshotsFilter;
  setFilter: (filter: ScreenshotsFilter) => void;
  authorFilter: string;
  setAuthorFilter: (authorId: string) => void;
  /** Авторы, встречающиеся в загруженном списке (для фильтра суперадмина). */
  authors: Array<{ id: string; label: string }>;
  reload: () => void;
  now: number;
  deletingItem: AdminScreenshotItem | null;
  requestDelete: (item: AdminScreenshotItem) => void;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;
  deleteRunning: boolean;
  previewItem: AdminScreenshotItem | null;
  openPreview: (item: AdminScreenshotItem) => void;
  closePreview: () => void;
};

function authorLabel(item: AdminScreenshotItem): string {
  const name = `${item.author.firstName || ''} ${item.author.lastName || ''}`.trim();
  return name || item.author.email;
}

export function useScreenshotsPage(): ScreenshotsPageModel {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [items, setItems] = useState<AdminScreenshotItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ScreenshotsFilter>('all');
  const [authorFilter, setAuthorFilter] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [deletingItem, setDeletingItem] = useState<AdminScreenshotItem | null>(null);
  const [deleteRunning, setDeleteRunning] = useState(false);
  const [previewItem, setPreviewItem] = useState<AdminScreenshotItem | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { authorId?: string; limit?: number } = { limit: 200 };
      if (isSuperAdmin && filter === 'my' && user?.id) params.authorId = user.id;
      if (isSuperAdmin && filter === 'all' && authorFilter) params.authorId = authorFilter;
      setItems(await listAdminScreenshots(params));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить скриншоты');
    } finally {
      setIsLoading(false);
    }
  }, [authorFilter, filter, isSuperAdmin, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // «Тикер» для бейджей оставшегося времени жизни
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const authors = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => map.set(item.author.id, authorLabel(item)));
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }, [items]);

  const confirmDelete = useCallback(async () => {
    if (!deletingItem || deleteRunning) return;
    setDeleteRunning(true);
    try {
      await deleteAdminScreenshot(deletingItem.id);
      setItems((prev) => prev.filter((item) => item.id !== deletingItem.id));
      if (previewItem?.id === deletingItem.id) setPreviewItem(null);
      setDeletingItem(null);
    } finally {
      setDeleteRunning(false);
    }
  }, [deletingItem, deleteRunning, previewItem?.id]);

  return {
    items,
    isLoading,
    error,
    isSuperAdmin,
    filter,
    setFilter,
    authorFilter,
    setAuthorFilter,
    authors,
    reload: () => void load(),
    now,
    deletingItem,
    requestDelete: setDeletingItem,
    confirmDelete,
    cancelDelete: () => setDeletingItem(null),
    deleteRunning,
    previewItem,
    openPreview: setPreviewItem,
    closePreview: () => setPreviewItem(null),
  };
}
