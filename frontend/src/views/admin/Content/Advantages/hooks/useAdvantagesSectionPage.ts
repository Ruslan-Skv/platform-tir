'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import {
  API_URL,
  EMPTY_NEW_ADVANTAGE_ITEM,
  UPLOADS_BASE,
} from '../advantages-section-page.constants';
import type {
  AdvantagesBlock,
  AdvantagesData,
  PageMessage,
} from '../advantages-section-page.types';

export function useAdvantagesSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<AdvantagesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState(EMPTY_NEW_ADVANTAGE_ITEM);
  const [uploadingIcon, setUploadingIcon] = useState<string | null>(null);
  const iconUploadTargetRef = useRef<'new' | string | null>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`${API_URL}/admin/home/advantages`, {
          headers: getAuthHeaders(),
        });
        if (!cancelled && res.ok) {
          const d = await res.json();
          setData(d);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          showMessage('error', 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders, showMessage]);

  const imageUrl = useCallback((url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  }, []);

  const isIconImageUrl = useCallback(
    (icon: string) => !!(icon && typeof icon === 'string' && icon.includes('/uploads/')),
    []
  );

  const handleSaveBlock = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/advantages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data.block),
      });
      if (res.ok) {
        showMessage('success', 'Изменения успешно сохранены');
      } else {
        showMessage('error', 'Ошибка сохранения');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    } finally {
      setSaving(false);
    }
  };

  const handleBlockChange = (field: keyof AdvantagesBlock, value: string) => {
    if (!data) return;
    setData({
      ...data,
      block: { ...data.block, [field]: value },
    });
  };

  const handleUploadIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = iconUploadTargetRef.current;
    if (!file || !target) return;
    setUploadingIcon(target);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/advantages/items/icon`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (res.ok) {
        const { icon } = await res.json();
        if (target === 'new') {
          setNewItem((p) => ({ ...p, icon }));
        } else {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  items: prev.items.map((x) => (x.id === target ? { ...x, icon } : x)),
                }
              : prev
          );
        }
        showMessage('success', 'Иконка загружена');
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage('error', err.message || 'Ошибка загрузки иконки');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    } finally {
      setUploadingIcon(null);
      iconUploadTargetRef.current = null;
      e.target.value = '';
    }
  };

  const handleAddItem = async () => {
    if (!newItem.icon.trim() || !newItem.title.trim() || !newItem.description.trim()) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/advantages/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        const item = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                items: [...prev.items, item].sort((a, b) => a.sortOrder - b.sortOrder),
              }
            : prev
        );
        setNewItem(EMPTY_NEW_ADVANTAGE_ITEM);
        showMessage('success', 'Преимущество добавлено');
      } else {
        showMessage('error', 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const handleUpdateItem = async (id: string, icon: string, title: string, description: string) => {
    try {
      const res = await apiFetch(`${API_URL}/admin/home/advantages/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ icon, title, description }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((x) =>
                  x.id === id ? { ...x, icon, title, description } : x
                ),
              }
            : prev
        );
        setEditingItem(null);
        showMessage('success', 'Преимущество обновлено');
      } else {
        showMessage('error', 'Ошибка обновления');
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Удалить это преимущество?')) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/advantages/items/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, items: prev.items.filter((x) => x.id !== id) } : prev
        );
        showMessage('success', 'Преимущество удалено');
      } else {
        showMessage('error', 'Ошибка удаления');
      }
    } catch {
      showMessage('error', 'Ошибка удаления');
    }
  };

  return {
    data,
    setData,
    loading,
    saving,
    message,
    editingItem,
    setEditingItem,
    newItem,
    setNewItem,
    uploadingIcon,
    iconUploadTargetRef,
    iconFileInputRef,
    imageUrl,
    isIconImageUrl,
    handleSaveBlock,
    handleBlockChange,
    handleUploadIcon,
    handleAddItem,
    handleUpdateItem,
    handleDeleteItem,
  };
}

export type AdvantagesSectionPageModel = ReturnType<typeof useAdvantagesSectionPage>;
