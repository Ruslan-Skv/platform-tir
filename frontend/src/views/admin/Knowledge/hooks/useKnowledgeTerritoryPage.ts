'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type AdminKnowledgeCategory,
  type AdminKnowledgeMaterial,
  type KnowledgeMaterialType,
  type KnowledgeStats,
  createKnowledgeCategory,
  deleteKnowledgeCategory,
  deleteKnowledgeMaterial,
  getKnowledgeCategories,
  getKnowledgeMaterials,
  getKnowledgeStats,
  publishKnowledgeMaterial,
  toggleKnowledgeMaterialPin,
  updateKnowledgeCategory,
} from '@/shared/api/admin-knowledge';

import { MATERIALS_PAGE_LIMIT } from '../knowledge-territory-page.constants';
import type { DeleteTarget, PageMessage } from '../knowledge-territory-page.types';
import { isKnowledgeEditor } from '../knowledge-utils';

export function useKnowledgeTerritoryPage() {
  const { user } = useAuth();
  const canEdit = isKnowledgeEditor(user?.role);

  const [materials, setMaterials] = useState<AdminKnowledgeMaterial[]>([]);
  const [categories, setCategories] = useState<AdminKnowledgeCategory[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<KnowledgeMaterialType | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategorySlug, setEditCategorySlug] = useState('');

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getKnowledgeMaterials({
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        type: typeFilter || undefined,
        status: canEdit && statusFilter ? statusFilter : undefined,
        page,
        limit: MATERIALS_PAGE_LIMIT,
      });
      setMaterials(res.data);
      setTotalPages(res.totalPages);
    } catch {
      setMaterials([]);
      showMessage('error', 'Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, typeFilter, statusFilter, page, canEdit, showMessage]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getKnowledgeCategories();
      setCategories(data);
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, [showMessage]);

  const loadStats = useCallback(async () => {
    try {
      const data = await getKnowledgeStats();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  useEffect(() => {
    loadCategories();
    loadStats();
  }, [loadCategories, loadStats]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'material') {
        await deleteKnowledgeMaterial(deleteTarget.id);
        showMessage('success', 'Материал удалён');
      } else {
        await deleteKnowledgeCategory(deleteTarget.id);
        showMessage('success', 'Категория удалена');
        loadCategories();
      }
      setDeleteTarget(null);
      loadMaterials();
      loadStats();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishKnowledgeMaterial(id);
      showMessage('success', 'Материал опубликован');
      loadMaterials();
      loadStats();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка публикации');
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      await toggleKnowledgeMaterialPin(id);
      showMessage('success', 'Закрепление обновлено');
      loadMaterials();
      loadStats();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка закрепления');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !newCategorySlug.trim()) {
      showMessage('error', 'Заполните название и slug');
      return;
    }
    try {
      await createKnowledgeCategory({
        name: newCategoryName.trim(),
        slug: newCategorySlug.trim(),
      });
      showMessage('success', 'Категория создана');
      setNewCategoryName('');
      setNewCategorySlug('');
      setShowNewCategory(false);
      loadCategories();
      loadStats();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка создания');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCategoryName.trim() || !editCategorySlug.trim()) return;
    try {
      await updateKnowledgeCategory(id, {
        name: editCategoryName.trim(),
        slug: editCategorySlug.trim(),
      });
      showMessage('success', 'Категория обновлена');
      setEditingCategoryId(null);
      loadCategories();
      loadMaterials();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка обновления');
    }
  };

  return {
    canEdit,
    materials,
    categories,
    stats,
    loading,
    message,
    page,
    setPage,
    totalPages,
    searchInput,
    setSearchInput,
    categoryFilter,
    setCategoryFilter,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    deleteTarget,
    setDeleteTarget,
    deleting,
    showNewCategory,
    setShowNewCategory,
    newCategoryName,
    setNewCategoryName,
    newCategorySlug,
    setNewCategorySlug,
    editingCategoryId,
    setEditingCategoryId,
    editCategoryName,
    setEditCategoryName,
    editCategorySlug,
    setEditCategorySlug,
    handleSearchSubmit,
    handleDelete,
    handlePublish,
    handleTogglePin,
    handleAddCategory,
    handleUpdateCategory,
  };
}

export type KnowledgeTerritoryPageModel = ReturnType<typeof useKnowledgeTerritoryPage>;
