'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import type { ContactFormBlock } from '@/shared/api/contact-form';
import { getAdminContactFormBlock, updateAdminContactFormBlock } from '@/shared/api/contact-form';
import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useContactFormSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<ContactFormBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const d = await getAdminContactFormBlock();
        if (!cancelled) setData(d);
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
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await updateAdminContactFormBlock(data);
      showMessage('success', 'Изменения успешно сохранены');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ContactFormBlock, value: string) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  const handleOpacityChange = (value: number) => {
    if (!data) return;
    setData({ ...data, backgroundOpacity: value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data) return;
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/contact-form/upload`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showMessage('error', err.message || 'Ошибка загрузки');
        return;
      }
      const { imageUrl } = (await res.json()) as { imageUrl: string };
      setData({ ...data, backgroundImage: imageUrl });
      showMessage('success', 'Картинка загружена. Нажмите «Сохранить».');
    } catch {
      showMessage('error', 'Ошибка подключения к серверу');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleBackgroundImageChange = (value: string) => {
    if (!data) return;
    const v = value.trim();
    setData({ ...data, backgroundImage: v || null });
  };

  return {
    data,
    setData,
    loading,
    saving,
    uploading,
    message,
    fileInputRef,
    handleSave,
    handleChange,
    handleOpacityChange,
    handleFileChange,
    handleBackgroundImageChange,
  };
}

export type ContactFormSectionPageModel = ReturnType<typeof useContactFormSectionPage>;
