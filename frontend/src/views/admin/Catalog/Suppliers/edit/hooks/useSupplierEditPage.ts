'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL, INITIAL_SUPPLIER_EDIT_FORM } from '../supplier-edit-page.constants';
import type { SupplierEditFormData, SupplierEditPageMessage } from '../supplier-edit-page.types';
import { parseSupplierPhones } from '../supplier-edit-page.utils';

export type UseSupplierEditPageOptions = {
  supplierId?: string;
};

export function useSupplierEditPage({ supplierId }: UseSupplierEditPageOptions) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();

  const isEditMode = Boolean(supplierId);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<SupplierEditPageMessage | null>(null);

  const [formData, setFormData] = useState<SupplierEditFormData>(() => ({
    ...INITIAL_SUPPLIER_EDIT_FORM,
  }));

  const fetchSupplier = useCallback(async () => {
    if (!supplierId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`${API_URL}/admin/catalog/suppliers/${supplierId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Поставщик не найден');
        } else {
          setError('Ошибка загрузки поставщика');
        }
        return;
      }

      const data = await response.json();

      setFormData({
        legalName: data.legalName || '',
        commercialName: data.commercialName || '',
        website: data.website || '',
        legalAddress: data.legalAddress || '',
        inn: data.inn || '',
        bankName: data.bankName || '',
        bankAccount: data.bankAccount || '',
        bankBik: data.bankBik || '',
        email: data.email || '',
        phones: parseSupplierPhones(data.phone),
        isActive: data.isActive ?? true,
      });
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [supplierId, getAuthHeaders]);

  useEffect(() => {
    if (isEditMode && supplierId) {
      void fetchSupplier();
    }
  }, [isEditMode, supplierId, fetchSupplier]);

  const goBack = useCallback(() => {
    router.push('/admin/catalog/suppliers');
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

    if (!formData.legalName.trim()) {
      setError('Наименование юридическое обязательно для заполнения');
      setSaving(false);
      return;
    }

    try {
      const supplierData: Record<string, unknown> = {
        legalName: formData.legalName.trim(),
        isActive: formData.isActive,
      };

      if (formData.commercialName.trim())
        supplierData.commercialName = formData.commercialName.trim();
      if (formData.website.trim()) supplierData.website = formData.website.trim();
      if (formData.legalAddress.trim()) supplierData.legalAddress = formData.legalAddress.trim();
      if (formData.inn.trim()) supplierData.inn = formData.inn.trim();
      if (formData.bankName.trim()) supplierData.bankName = formData.bankName.trim();
      if (formData.bankAccount.trim()) supplierData.bankAccount = formData.bankAccount.trim();
      if (formData.bankBik.trim()) supplierData.bankBik = formData.bankBik.trim();
      if (formData.email.trim()) supplierData.email = formData.email.trim();
      if (formData.phones.length > 0) {
        supplierData.phone = formData.phones.filter((p) => p.trim()).map((p) => p.trim());
      }

      const url = isEditMode
        ? `${API_URL}/admin/catalog/suppliers/${supplierId}`
        : `${API_URL}/admin/catalog/suppliers`;

      const response = await apiFetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(supplierData),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: isEditMode ? 'Поставщик обновлен' : 'Поставщик создан',
        });
        setTimeout(() => {
          router.push('/admin/catalog/suppliers');
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
          JSON.stringify(errorData) ||
          `Ошибка ${isEditMode ? 'обновления' : 'создания'} поставщика (${response.status})`;

        setError(errorMessage);
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  return {
    supplierId,
    isEditMode,
    loading,
    saving,
    error,
    message,
    formData,
    setFormData,
    goBack,
    handleChange,
    updatePhone,
    removePhone,
    addPhone,
    handleSubmit,
  };
}

export type SupplierEditPageModel = ReturnType<typeof useSupplierEditPage>;
