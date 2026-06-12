'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { categories } from '@/widgets/home/lib/constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useHomeDirectionsPage() {
  const { getAuthHeaders } = useAuth();
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/directions/images`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setImages(data || {});
      }
    } catch {
      console.error('Failed to load home directions images');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const previewUrl = (url: string) => (url ? publicUploadUrl(url) : null);

  const handleFileChange = async (slug: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setUploading(slug);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/directions/upload/${slug}`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Ошибка загрузки');
        return;
      }
      const data = await res.json();
      setImages((prev) => ({ ...prev, [slug]: data.imageUrl }));
      setSuccess(`Картинка для «${categories.find((c) => c.slug === slug)?.name}» обновлена`);
    } catch {
      setError('Ошибка подключения к серверу');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const setFileInputRef = (slug: string, el: HTMLInputElement | null) => {
    fileInputRefs.current[slug] = el;
  };

  const triggerFileInput = (slug: string) => {
    fileInputRefs.current[slug]?.click();
  };

  return {
    images,
    loading,
    uploading,
    error,
    success,
    previewUrl,
    handleFileChange,
    setFileInputRef,
    triggerFileInput,
  };
}

export type HomeDirectionsPageModel = ReturnType<typeof useHomeDirectionsPage>;
