'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AdminPhotoCategory, AdminPhotoProject } from '@/shared/api/admin-photo';
import {
  createPhotoCategory,
  deletePhotoCategory,
  deletePhotoProject,
  getAdminPhotoCategories,
  getAdminProjects,
} from '@/shared/api/admin-photo';

import { PHOTO_PROJECTS_PAGE_LIMIT } from '../photo-section-page.constants';
import type {
  PhotoSectionDeleteTarget,
  PhotoSectionPageMessage,
} from '../photo-section-page.types';

export function usePhotoSectionPage() {
  const [categories, setCategories] = useState<AdminPhotoCategory[]>([]);
  const [projects, setProjects] = useState<AdminPhotoProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [message, setMessage] = useState<PhotoSectionPageMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PhotoSectionDeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getAdminPhotoCategories();
      setCategories(data);
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, [showMessage]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminProjects({
        categoryId: categoryFilter || undefined,
        page,
        limit: PHOTO_PROJECTS_PAGE_LIMIT,
      });
      setProjects(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setProjects([]);
      showMessage('error', 'Ошибка загрузки объектов');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, page, showMessage]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'category') {
        await deletePhotoCategory(deleteTarget.id);
        showMessage('success', 'Категория удалена');
        await loadCategories();
      } else {
        await deletePhotoProject(deleteTarget.id);
        showMessage('success', 'Объект удалён');
      }
      setDeleteTarget(null);
      await loadProjects();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !newCategorySlug.trim()) {
      showMessage('error', 'Заполните название и slug');
      return;
    }
    try {
      await createPhotoCategory({
        name: newCategoryName.trim(),
        slug: newCategorySlug.trim(),
      });
      showMessage('success', 'Категория создана');
      setNewCategoryName('');
      setNewCategorySlug('');
      setShowNewCategory(false);
      await loadCategories();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка создания');
    }
  };

  const cancelNewCategory = useCallback(() => {
    setShowNewCategory(false);
    setNewCategoryName('');
    setNewCategorySlug('');
  }, []);

  const handleCategoryFilterChange = useCallback((value: string) => {
    setCategoryFilter(value);
    setPage(1);
  }, []);

  return {
    categories,
    projects,
    total,
    page,
    setPage,
    totalPages,
    loading,
    categoryFilter,
    handleCategoryFilterChange,
    message,
    deleteTarget,
    setDeleteTarget,
    deleting,
    showNewCategory,
    setShowNewCategory,
    newCategoryName,
    setNewCategoryName,
    newCategorySlug,
    setNewCategorySlug,
    handleDelete,
    handleAddCategory,
    cancelNewCategory,
  };
}

export type PhotoSectionPageModel = ReturnType<typeof usePhotoSectionPage>;
