'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import { API_URL, EMPTY_NEW_FEATURE } from '../hero-section-page.constants';
import type { HeroData, HeroSlideShowMode, PageMessage } from '../hero-section-page.types';

export function useHeroSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<HeroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [newFeature, setNewFeature] = useState(EMPTY_NEW_FEATURE);
  const [slideToDelete, setSlideToDelete] = useState<string | null>(null);
  const [deletingSlide, setDeletingSlide] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState<string | null>(null);
  const iconUploadTargetRef = useRef<'new' | string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        const res = await apiFetch(`${API_URL}/admin/home/hero`, {
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

  const isIconImageUrl = useCallback(
    (icon: string) => !!(icon && typeof icon === 'string' && icon.includes('/uploads/')),
    []
  );

  const handleSaveBlock = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero`, {
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

  const handleBlockChange = (
    field: keyof HeroData['block'],
    value: string | number | HeroSlideShowMode
  ) => {
    if (!data) return;
    setData({
      ...data,
      block: { ...data.block, [field]: value },
    });
  };

  const handleUploadSlide = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/slides`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (res.ok) {
        const slide = await res.json();
        setData((prev) =>
          prev
            ? { ...prev, slides: [...prev.slides, slide].sort((a, b) => a.sortOrder - b.sortOrder) }
            : prev
        );
        showMessage('success', 'Слайд загружен');
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage('error', err.message || 'Ошибка загрузки');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteSlide = async (id: string) => {
    setDeletingSlide(true);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/slides/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setSlideToDelete(null);
        setData((prev) =>
          prev ? { ...prev, slides: prev.slides.filter((s) => s.id !== id) } : prev
        );
        showMessage('success', 'Слайд удалён');
      } else {
        showMessage('error', 'Ошибка удаления');
      }
    } catch {
      showMessage('error', 'Ошибка удаления');
    } finally {
      setDeletingSlide(false);
    }
  };

  const handleAddFeature = async () => {
    if (!newFeature.icon.trim() || !newFeature.title.trim()) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newFeature),
      });
      if (res.ok) {
        const feature = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                features: [...prev.features, feature].sort((a, b) => a.sortOrder - b.sortOrder),
              }
            : prev
        );
        setNewFeature(EMPTY_NEW_FEATURE);
        showMessage('success', 'Преимущество добавлено');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const handleUpdateFeature = async (id: string, icon: string, title: string) => {
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/features/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ icon, title }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                features: prev.features.map((f) => (f.id === id ? { ...f, icon, title } : f)),
              }
            : prev
        );
        setEditingFeature(null);
        showMessage('success', 'Преимущество обновлено');
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleUploadFeatureIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = iconUploadTargetRef.current;
    if (!file || !target) return;
    setUploadingIcon(target);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/features/icon`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (res.ok) {
        const { icon } = await res.json();
        if (target === 'new') {
          setNewFeature((p) => ({ ...p, icon }));
        } else {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  features: prev.features.map((x) => (x.id === target ? { ...x, icon } : x)),
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

  const handleDeleteFeature = async (id: string) => {
    if (!confirm('Удалить это преимущество?')) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/features/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, features: prev.features.filter((f) => f.id !== id) } : prev
        );
        showMessage('success', 'Преимущество удалено');
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
    uploading,
    message,
    editingFeature,
    setEditingFeature,
    newFeature,
    setNewFeature,
    slideToDelete,
    setSlideToDelete,
    deletingSlide,
    uploadingIcon,
    iconUploadTargetRef,
    fileInputRef,
    iconFileInputRef,
    imageUrl,
    isIconImageUrl,
    handleSaveBlock,
    handleBlockChange,
    handleUploadSlide,
    handleDeleteSlide,
    handleAddFeature,
    handleUpdateFeature,
    handleUploadFeatureIcon,
    handleDeleteFeature,
  };
}

export type HeroSectionPageModel = ReturnType<typeof useHeroSectionPage>;
