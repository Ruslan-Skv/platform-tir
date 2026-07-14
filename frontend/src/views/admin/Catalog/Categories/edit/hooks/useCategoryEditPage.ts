'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL } from '../../shared/categories-page.constants';
import type { Category, FlatCategoryOption } from '../../shared/categories-page.types';
import { generateSlug } from '../../shared/categories-page.utils';
import { INITIAL_CATEGORY_EDIT_FORM } from '../category-edit-page.constants';
import type { CategoryEditFormData, CategoryEditPageMessage } from '../category-edit-page.types';

export type UseCategoryEditPageOptions = {
  categoryId: string;
};

export function useCategoryEditPage({ categoryId }: UseCategoryEditPageOptions) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<CategoryEditPageMessage | null>(null);

  const [category, setCategory] = useState<Category | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState<CategoryEditFormData>(() => ({
    ...INITIAL_CATEGORY_EDIT_FORM,
  }));

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCategory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`${API_URL}/categories/${categoryId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Категория не найдена');
        } else {
          setError('Ошибка загрузки категории');
        }
        return;
      }

      const data: Category = await response.json();
      setCategory(data);
      setFormData({
        name: data.name || '',
        slug: data.slug || '',
        description: data.description || '',
        parentId: data.parentId || '',
        icon: data.icon || '',
        image: data.image || '',
        isActive: data.isActive ?? true,
        sizesRequired: data.sizesRequired ?? true,
        order: data.order || 0,
      });

      if (data.image) {
        setImagePreview(data.image);
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [categoryId, getAuthHeaders]);

  const fetchAllCategories = useCallback(async () => {
    try {
      const response = await apiFetch(`${API_URL}/categories/flat`);
      if (response.ok) {
        const data: Category[] = await response.json();
        setAllCategories(data.filter((cat) => cat.id !== categoryId));
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [categoryId]);

  useEffect(() => {
    void fetchCategory();
    void fetchAllCategories();
  }, [fetchCategory, fetchAllCategories]);

  const flatCategories = useMemo<FlatCategoryOption[]>(
    () =>
      allCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
      })),
    [allCategories]
  );

  const goBack = useCallback(() => {
    router.push('/admin/catalog/categories');
  }, [router]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setFormData((prev) => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      setMessage({ type: 'error', text: 'Заполните название и slug' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const updateData: Record<string, unknown> = {
        name: formData.name,
        slug: formData.slug,
        isActive: formData.isActive,
        sizesRequired: formData.sizesRequired,
        order: formData.order,
      };

      if (formData.description.trim()) {
        updateData.description = formData.description.trim();
      } else {
        updateData.description = null;
      }

      if (formData.parentId.trim()) {
        updateData.parentId = formData.parentId;
      } else {
        updateData.parentId = null;
      }

      if (formData.icon.trim()) {
        updateData.icon = formData.icon.trim();
      } else {
        updateData.icon = null;
      }

      if (formData.image.trim()) {
        updateData.image = formData.image.trim();
      } else {
        updateData.image = null;
      }

      const response = await apiFetch(`${API_URL}/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Категория сохранена' });
        setTimeout(() => {
          router.push('/admin/catalog/categories');
        }, 1000);
      } else {
        const data = await response.json().catch(() => ({}));
        setMessage({
          type: 'error',
          text: typeof data.message === 'string' ? data.message : 'Ошибка сохранения',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Ошибка сети' });
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    error,
    message,
    category,
    formData,
    setFormData,
    showIconPicker,
    setShowIconPicker,
    imagePreview,
    fileInputRef,
    flatCategories,
    generateSlug,
    goBack,
    handleImageSelect,
    clearImage,
    handleSave,
  };
}

export type CategoryEditPageModel = ReturnType<typeof useCategoryEditPage>;
