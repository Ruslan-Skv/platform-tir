'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL, INITIAL_PARTNER_EDIT_FORM } from '../partner-edit-page.constants';
import type { PartnerEditFormData, PartnerEditPageMessage } from '../partner-edit-page.types';
import { logoPreviewUrl, parsePartnerPhones } from '../partner-edit-page.utils';

export type UsePartnerEditPageOptions = {
  partnerId?: string;
};

export function usePartnerEditPage({ partnerId }: UsePartnerEditPageOptions) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();

  const isEditMode = Boolean(partnerId);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<PartnerEditPageMessage | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<PartnerEditFormData>(() => ({
    ...INITIAL_PARTNER_EDIT_FORM,
  }));

  const showTransientMessage = useCallback((next: PartnerEditPageMessage, ms: number) => {
    setMessage(next);
    setTimeout(() => setMessage(null), ms);
  }, []);

  const fetchPartner = useCallback(async () => {
    if (!partnerId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`${API_URL}/admin/partners/${partnerId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Партнёр не найден');
        } else {
          setError('Ошибка загрузки партнёра');
        }
        return;
      }

      const data = await response.json();

      setFormData({
        name: data.name || '',
        logoUrl: data.logoUrl || '',
        showLogoOnCards: data.showLogoOnCards ?? true,
        tooltipText: data.tooltipText || '',
        showTooltip: data.showTooltip ?? true,
        website: data.website || '',
        email: data.email || '',
        phones: parsePartnerPhones(data.phone),
        description: data.description || '',
        isActive: data.isActive ?? true,
      });
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [partnerId, getAuthHeaders]);

  useEffect(() => {
    if (isEditMode && partnerId) {
      void fetchPartner();
    }
  }, [isEditMode, partnerId, fetchPartner]);

  const goBack = useCallback(() => {
    router.push('/admin/partners');
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
    if (!allowed) {
      showTransientMessage(
        { type: 'error', text: 'Допустимы только изображения: jpg, png, webp, gif, svg' },
        3000
      );
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showTransientMessage({ type: 'error', text: 'Размер файла не должен превышать 2 МБ' }, 3000);
      return;
    }
    setUploadingLogo(true);
    setMessage(null);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    try {
      const res = await apiFetch(`${API_URL}/admin/partners/upload/logo`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formDataUpload,
      });
      if (res.ok) {
        const { logoUrl } = await res.json();
        setFormData((prev) => ({ ...prev, logoUrl }));
        showTransientMessage({ type: 'success', text: 'Логотип загружен' }, 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        showTransientMessage(
          {
            type: 'error',
            text: typeof err.message === 'string' ? err.message : 'Ошибка загрузки логотипа',
          },
          3000
        );
      }
    } catch {
      showTransientMessage({ type: 'error', text: 'Ошибка сети' }, 3000);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const updatePhone = (index: number, value: string) => {
    setFormData((prev) => {
      const phones = [...prev.phones];
      phones[index] = value;
      return { ...prev, phones };
    });
  };

  const removePhone = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index),
    }));
  };

  const addPhone = () => {
    setFormData((prev) => ({ ...prev, phones: [...prev.phones, ''] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    if (!formData.name.trim()) {
      setError('Название обязательно для заполнения');
      setSaving(false);
      return;
    }

    try {
      const partnerData: Record<string, unknown> = {
        name: formData.name.trim(),
        isActive: formData.isActive,
      };

      if (formData.logoUrl.trim()) partnerData.logoUrl = formData.logoUrl.trim();
      partnerData.showLogoOnCards = formData.showLogoOnCards;
      if (formData.tooltipText.trim()) partnerData.tooltipText = formData.tooltipText.trim();
      partnerData.showTooltip = formData.showTooltip;
      if (formData.website.trim()) partnerData.website = formData.website.trim();
      if (formData.email.trim()) partnerData.email = formData.email.trim();
      if (formData.description.trim()) partnerData.description = formData.description.trim();
      if (formData.phones.length > 0) {
        partnerData.phone = formData.phones.filter((p) => p.trim()).map((p) => p.trim());
      }

      const url = isEditMode
        ? `${API_URL}/admin/partners/${partnerId}`
        : `${API_URL}/admin/partners`;

      const response = await apiFetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(partnerData),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: isEditMode ? 'Партнёр обновлён' : 'Партнёр создан',
        });
        setTimeout(() => {
          router.push('/admin/partners');
        }, 1500);
      } else {
        let errorData: Record<string, unknown> = {};
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        const errorMessage =
          (typeof errorData.message === 'string' ? errorData.message : '') ||
          (Array.isArray(errorData)
            ? errorData.map((item) => (item as { message?: string }).message).join(', ')
            : '') ||
          (typeof errorData.error === 'string' ? errorData.error : '') ||
          `Ошибка ${isEditMode ? 'обновления' : 'создания'} партнёра (${response.status})`;

        setError(errorMessage);
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  return {
    isEditMode,
    loading,
    saving,
    uploadingLogo,
    error,
    message,
    formData,
    setFormData,
    logoFileInputRef,
    logoPreviewUrl,
    goBack,
    handleChange,
    handleLogoUpload,
    updatePhone,
    removePhone,
    addPhone,
    handleSubmit,
  };
}

export type PartnerEditPageModel = ReturnType<typeof usePartnerEditPage>;
