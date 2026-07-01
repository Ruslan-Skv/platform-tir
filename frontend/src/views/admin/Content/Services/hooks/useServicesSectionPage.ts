'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import { API_URL, EMPTY_NEW_SERVICE_ITEM } from '../services-section-page.constants';
import type { PageMessage, ServicesBlock, ServicesData } from '../services-section-page.types';
import { parseFeatures } from '../services-section-page.utils';

export function useServicesSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<ServicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState(EMPTY_NEW_SERVICE_ITEM);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const imageUploadTargetRef = useRef<'new' | string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`${API_URL}/admin/home/services`, {
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

  const imageUrl = useCallback((url: string) => publicUploadUrl(url), []);

  const handleSaveBlock = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/services`, {
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

  const handleBlockChange = (field: keyof ServicesBlock, value: string) => {
    if (!data) return;
    setData({
      ...data,
      block: { ...data.block, [field]: value },
    });
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = imageUploadTargetRef.current;
    if (!file || !target) return;
    setUploadingImage(target);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/services/items/image`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (res.ok) {
        const { imageUrl: url } = await res.json();
        if (target === 'new') {
          setNewItem((p) => ({ ...p, imageUrl: url }));
        } else {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  items: prev.items.map((x) => (x.id === target ? { ...x, imageUrl: url } : x)),
                }
              : prev
          );
        }
        showMessage('success', 'Изображение загружено');
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage('error', err.message || 'Ошибка загрузки');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    } finally {
      setUploadingImage(null);
      imageUploadTargetRef.current = null;
      e.target.value = '';
    }
  };

  const handleAddItem = async () => {
    const features = parseFeatures(newItem.features);
    if (!newItem.title.trim() || !newItem.description.trim() || !newItem.price.trim()) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/services/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title: newItem.title,
          description: newItem.description,
          features,
          price: newItem.price,
          imageUrl: newItem.imageUrl || undefined,
        }),
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
        setNewItem(EMPTY_NEW_SERVICE_ITEM);
        showMessage('success', 'Услуга добавлена');
      } else {
        showMessage('error', 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const handleUpdateItem = async (
    id: string,
    item: {
      title: string;
      description: string;
      features: string[];
      price: string;
      imageUrl: string | null;
    }
  ) => {
    try {
      const res = await apiFetch(`${API_URL}/admin/home/services/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((x) => (x.id === id ? { ...x, ...item } : x)),
              }
            : prev
        );
        setEditingItem(null);
        showMessage('success', 'Услуга обновлена');
      } else {
        showMessage('error', 'Ошибка обновления');
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Удалить эту услугу?')) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/services/items/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, items: prev.items.filter((x) => x.id !== id) } : prev
        );
        showMessage('success', 'Услуга удалена');
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
    uploadingImage,
    imageUploadTargetRef,
    imageFileInputRef,
    imageUrl,
    handleSaveBlock,
    handleBlockChange,
    handleUploadImage,
    handleAddItem,
    handleUpdateItem,
    handleDeleteItem,
  };
}

export type ServicesSectionPageModel = ReturnType<typeof useServicesSectionPage>;
