'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type AdminKnowledgeCategory,
  type AdminKnowledgeMaterial,
  type AdminKnowledgeModule,
  type KnowledgeMaterialType,
  type KnowledgeStats,
  createKnowledgeCategory,
  createKnowledgeModule,
  deleteKnowledgeCategory,
  deleteKnowledgeMaterial,
  deleteKnowledgeModule,
  getKnowledgeCategories,
  getKnowledgeMaterials,
  getKnowledgeModules,
  getKnowledgeStats,
  publishKnowledgeMaterial,
  toggleKnowledgeMaterialPin,
  updateKnowledgeCategory,
  updateKnowledgeModule,
} from '@/shared/api/admin-knowledge';

import { isKnowledgeEditor } from '../../shared/knowledge-utils';
import { MATERIALS_PAGE_LIMIT } from '../knowledge-territory-page.constants';
import type { DeleteTarget, PageMessage } from '../knowledge-territory-page.types';

export function useKnowledgeTerritoryPage() {
  const { user } = useAuth();
  const canEdit = isKnowledgeEditor(user?.role);

  const [materials, setMaterials] = useState<AdminKnowledgeMaterial[]>([]);
  const [categories, setCategories] = useState<AdminKnowledgeCategory[]>([]);
  const [modules, setModules] = useState<AdminKnowledgeModule[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
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
  const [showNewModule, setShowNewModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleSlug, setNewModuleSlug] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleName, setEditModuleName] = useState('');
  const [editModuleSlug, setEditModuleSlug] = useState('');
  const [editModuleDescription, setEditModuleDescription] = useState('');

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
        moduleId: moduleFilter || undefined,
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
  }, [search, categoryFilter, moduleFilter, typeFilter, statusFilter, page, canEdit, showMessage]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getKnowledgeCategories();
      setCategories(data);
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, [showMessage]);

  const loadModules = useCallback(async () => {
    if (!categoryFilter) {
      setModules([]);
      return;
    }
    try {
      const data = await getKnowledgeModules(categoryFilter);
      setModules(data);
    } catch {
      setModules([]);
      showMessage('error', 'Ошибка загрузки модулей');
    }
  }, [categoryFilter, showMessage]);

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

  useEffect(() => {
    setModuleFilter('');
    loadModules();
  }, [categoryFilter, loadModules]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleCategoryFilterChange = (categoryId: string) => {
    setCategoryFilter(categoryId);
    setModuleFilter('');
    setPage(1);
  };

  const handleModuleFilterChange = (moduleId: string) => {
    setModuleFilter(moduleId);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'material') {
        await deleteKnowledgeMaterial(deleteTarget.id);
        showMessage('success', 'Материал удалён');
      } else if (deleteTarget.type === 'category') {
        await deleteKnowledgeCategory(deleteTarget.id);
        showMessage('success', 'Категория удалена');
        if (categoryFilter === deleteTarget.id) {
          setCategoryFilter('');
          setModuleFilter('');
        }
        loadCategories();
      } else {
        await deleteKnowledgeModule(deleteTarget.id);
        showMessage('success', 'Модуль удалён');
        if (moduleFilter === deleteTarget.id) {
          setModuleFilter('');
        }
        loadModules();
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

  const handleAddModule = async () => {
    if (!categoryFilter) {
      showMessage('error', 'Сначала выберите категорию');
      return;
    }
    if (!newModuleName.trim() || !newModuleSlug.trim()) {
      showMessage('error', 'Заполните название и slug модуля');
      return;
    }
    try {
      await createKnowledgeModule({
        categoryId: categoryFilter,
        name: newModuleName.trim(),
        slug: newModuleSlug.trim(),
        description: newModuleDescription.trim() || undefined,
        order: modules.length + 1,
      });
      showMessage('success', 'Модуль создан');
      setNewModuleName('');
      setNewModuleSlug('');
      setNewModuleDescription('');
      setShowNewModule(false);
      loadModules();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка создания модуля');
    }
  };

  const handleUpdateModule = async (id: string) => {
    if (!editModuleName.trim() || !editModuleSlug.trim()) return;
    try {
      await updateKnowledgeModule(id, {
        name: editModuleName.trim(),
        slug: editModuleSlug.trim(),
        description: editModuleDescription.trim() || undefined,
      });
      showMessage('success', 'Модуль обновлён');
      setEditingModuleId(null);
      loadModules();
      loadMaterials();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка обновления модуля');
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryFilter);

  return {
    canEdit,
    materials,
    categories,
    modules,
    selectedCategory,
    stats,
    loading,
    message,
    page,
    setPage,
    totalPages,
    search,
    searchInput,
    setSearchInput,
    categoryFilter,
    setCategoryFilter: handleCategoryFilterChange,
    moduleFilter,
    setModuleFilter: handleModuleFilterChange,
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
    showNewModule,
    setShowNewModule,
    newModuleName,
    setNewModuleName,
    newModuleSlug,
    setNewModuleSlug,
    newModuleDescription,
    setNewModuleDescription,
    editingModuleId,
    setEditingModuleId,
    editModuleName,
    setEditModuleName,
    editModuleSlug,
    setEditModuleSlug,
    editModuleDescription,
    setEditModuleDescription,
    handleSearchSubmit,
    handleDelete,
    handlePublish,
    handleTogglePin,
    handleAddCategory,
    handleUpdateCategory,
    handleAddModule,
    handleUpdateModule,
  };
}

export type KnowledgeTerritoryPageModel = ReturnType<typeof useKnowledgeTerritoryPage>;
