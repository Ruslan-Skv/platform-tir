'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useAdminResourcePermission } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
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
  getKnowledgeTrashCount,
  importKnowledgeCategoryOutline,
  publishKnowledgeMaterial,
  toggleKnowledgeMaterialFavorite,
  toggleKnowledgeMaterialLike,
  updateKnowledgeCategory,
  updateKnowledgeModule,
} from '@/shared/api/admin-knowledge';
import { useAdminTrashCount } from '@/shared/ui/admin/AdminToolbarIconButton/useAdminTrashCount';
import { newURLSearchParamsLive } from '@/views/catalog/lib/newURLSearchParamsLive';

import {
  KNOWLEDGE_RESOURCE_ID,
  buildKnowledgeCategoryResourceId,
  canViewKnowledgeTrainingAnalytics,
  getKnowledgeCategoryResourceLabel,
  isKnowledgeTraineeRole,
} from '../../shared/knowledge-utils';
import { parseKnowledgeOutlineImportFile } from '../../shared/parseKnowledgeOutlineImport';
import {
  type KnowledgeTerritoryFiltersState,
  buildKnowledgeTerritoryUrl,
  isKnowledgeTerritoryFiltersSyncedWithUrl,
  knowledgeTerritoryUrlFiltersSignature,
  readKnowledgeTerritoryFilters,
  readKnowledgeTerritorySearchParamsFromLocation,
  writeKnowledgeTerritoryFilters,
} from '../knowledge-territory-filters-storage';
import { MATERIALS_PAGE_LIMIT } from '../knowledge-territory-page.constants';
import type { DeleteTarget, PageMessage } from '../knowledge-territory-page.types';
import { useKnowledgePlatformFeedbackUnreadCount } from './useKnowledgePlatformFeedbackUnreadCount';

export function useKnowledgeTerritoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    canView,
    canEdit,
    canParticipate,
    isLoading: permissionsLoading,
  } = useAdminResourcePermission(KNOWLEDGE_RESOURCE_ID);
  const knowledgeAccessReady = !authLoading && !permissionsLoading && canView;
  const canViewTrainingAnalytics = canViewKnowledgeTrainingAnalytics(user?.role, canView);
  const isTrainee = isKnowledgeTraineeRole(user?.role);
  const traineeView = !authLoading && isTrainee;
  const router = useRouter();
  const pathname = usePathname();
  const filtersHydratedRef = useRef(false);
  const favoritesFromUrlOnMountRef = useRef(false);
  const prevCategoryFilterRef = useRef<string | null>(null);
  const traineeFavoritesNormalizedRef = useRef(false);
  const materialsLoadSeqRef = useRef(0);
  const materialsRef = useRef<AdminKnowledgeMaterial[]>([]);
  const materialsScopeKeyRef = useRef<string | null>(null);
  const lastUrlSyncSignatureRef = useRef('');

  const [materials, setMaterials] = useState<AdminKnowledgeMaterial[]>([]);
  materialsRef.current = materials;
  const [categories, setCategories] = useState<AdminKnowledgeCategory[]>([]);
  const [modules, setModules] = useState<AdminKnowledgeModule[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<KnowledgeMaterialType | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [loadedModulesCategoryId, setLoadedModulesCategoryId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryOutlineFile, setNewCategoryOutlineFile] = useState<File | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const newCategoryOutlineInputRef = useRef<HTMLInputElement>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategorySlug, setEditCategorySlug] = useState('');
  const [reorderingCategoryId, setReorderingCategoryId] = useState<string | null>(null);
  const [showNewModule, setShowNewModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleSlug, setNewModuleSlug] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleName, setEditModuleName] = useState('');
  const [editModuleSlug, setEditModuleSlug] = useState('');
  const [editModuleDescription, setEditModuleDescription] = useState('');
  const [reorderingModuleId, setReorderingModuleId] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [categoryAccessModal, setCategoryAccessModal] = useState<{
    resourceId: string;
    label: string;
  } | null>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { trashCount, refreshTrashCount } = useAdminTrashCount(getKnowledgeTrashCount, 0, canEdit);
  const { feedbackUnreadCount, refreshFeedbackUnreadCount } =
    useKnowledgePlatformFeedbackUnreadCount(canEdit);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  useLayoutEffect(() => {
    if (filtersHydratedRef.current) return;
    filtersHydratedRef.current = true;

    const fromUrl = readKnowledgeTerritorySearchParamsFromLocation();
    const hasUrlFilters = Object.keys(fromUrl).length > 0;

    if (hasUrlFilters) {
      if (fromUrl.categoryFilter !== undefined) setCategoryFilter(fromUrl.categoryFilter);
      if (fromUrl.moduleFilter !== undefined) setModuleFilter(fromUrl.moduleFilter);
      if (fromUrl.typeFilter !== undefined) setTypeFilter(fromUrl.typeFilter);
      if (fromUrl.statusFilter !== undefined) setStatusFilter(fromUrl.statusFilter);
      if (fromUrl.favoritesOnly !== undefined) setFavoritesOnly(fromUrl.favoritesOnly);
      if (fromUrl.search !== undefined) setSearch(fromUrl.search);
      if (fromUrl.searchInput !== undefined) setSearchInput(fromUrl.searchInput);
      if (fromUrl.page !== undefined) setPage(fromUrl.page);
      if (fromUrl.favoritesOnly === true) favoritesFromUrlOnMountRef.current = true;
      prevCategoryFilterRef.current = fromUrl.categoryFilter ?? '';
      return;
    }

    const saved = readKnowledgeTerritoryFilters();

    if (saved) {
      setCategoryFilter(saved.categoryFilter);
      setModuleFilter(saved.moduleFilter);
      setTypeFilter(saved.typeFilter);
      setStatusFilter(saved.statusFilter);
      setFavoritesOnly(isKnowledgeTraineeRole(user?.role) ? false : saved.favoritesOnly);
      setSearch(saved.search);
      setSearchInput(saved.searchInput);
      setPage(saved.page);
      prevCategoryFilterRef.current = saved.categoryFilter;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- восстанавливаем один раз при монтировании
  }, []);

  const filtersSnapshot = useMemo<KnowledgeTerritoryFiltersState>(
    () => ({
      categoryFilter,
      moduleFilter,
      typeFilter,
      statusFilter,
      search,
      searchInput,
      page,
      favoritesOnly,
    }),
    [
      categoryFilter,
      moduleFilter,
      typeFilter,
      statusFilter,
      search,
      searchInput,
      page,
      favoritesOnly,
    ]
  );

  const materialsScopeKey = useMemo(
    () =>
      JSON.stringify({
        categoryFilter,
        moduleFilter,
        favoritesOnly,
        search,
        typeFilter,
        statusFilter,
      }),
    [categoryFilter, moduleFilter, favoritesOnly, search, typeFilter, statusFilter]
  );

  const persistTerritoryFilters = useCallback(() => {
    writeKnowledgeTerritoryFilters(filtersSnapshot);
  }, [filtersSnapshot]);

  const loadMaterials = useCallback(async () => {
    if (!knowledgeAccessReady) return;

    if (traineeView && !categoryFilter && !favoritesOnly) {
      setMaterials([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    if (traineeView && categoryFilter && categories.length === 0) {
      return;
    }

    if (
      traineeView &&
      categoryFilter &&
      categories.length > 0 &&
      !categories.some((category) => category.id === categoryFilter)
    ) {
      return;
    }

    const seq = ++materialsLoadSeqRef.current;
    setLoading(true);
    try {
      const res = await getKnowledgeMaterials({
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        moduleId: moduleFilter || undefined,
        type: typeFilter || undefined,
        status: canEdit && statusFilter ? statusFilter : undefined,
        favoritesOnly: favoritesOnly || undefined,
        page,
        limit: MATERIALS_PAGE_LIMIT,
      });
      if (seq !== materialsLoadSeqRef.current) return;
      setMaterials(res.data);
      setTotalPages(res.totalPages);
    } catch {
      if (seq !== materialsLoadSeqRef.current) return;
      setMaterials([]);
      showMessage('error', 'Ошибка загрузки материалов');
    } finally {
      if (seq === materialsLoadSeqRef.current) {
        setLoading(false);
      }
    }
  }, [
    search,
    categoryFilter,
    moduleFilter,
    typeFilter,
    statusFilter,
    favoritesOnly,
    page,
    canEdit,
    traineeView,
    knowledgeAccessReady,
    categories,
    showMessage,
  ]);

  const loadCategories = useCallback(async () => {
    if (!knowledgeAccessReady) return;
    try {
      const data = await getKnowledgeCategories();
      setCategories(data);
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, [knowledgeAccessReady, showMessage]);

  const loadModules = useCallback(async () => {
    if (!categoryFilter) {
      setModules([]);
      setLoadedModulesCategoryId(null);
      setModulesLoading(false);
      return;
    }
    if (traineeView && categoryFilter && categories.length === 0) {
      setModulesLoading(true);
      return;
    }
    if (
      traineeView &&
      categoryFilter &&
      categories.length > 0 &&
      !categories.some((category) => category.id === categoryFilter)
    ) {
      setModules([]);
      setLoadedModulesCategoryId(categoryFilter);
      setModulesLoading(false);
      return;
    }

    setModulesLoading(true);
    setModules([]);
    setLoadedModulesCategoryId(null);

    try {
      const data = await getKnowledgeModules(categoryFilter);
      setModules(data);
      setLoadedModulesCategoryId(categoryFilter);
    } catch {
      setModules([]);
      setLoadedModulesCategoryId(categoryFilter);
      showMessage('error', 'Ошибка загрузки модулей');
    } finally {
      setModulesLoading(false);
    }
  }, [categoryFilter, traineeView, categories, showMessage]);

  const loadStats = useCallback(async () => {
    if (!knowledgeAccessReady) return;
    try {
      const data = await getKnowledgeStats();
      setStats(data);
    } catch {
      // ignore
    }
  }, [knowledgeAccessReady]);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    loadMaterials();
  }, [loadMaterials]);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    if (materialsScopeKeyRef.current === null) {
      materialsScopeKeyRef.current = materialsScopeKey;
      return;
    }
    if (materialsScopeKeyRef.current === materialsScopeKey) return;
    materialsScopeKeyRef.current = materialsScopeKey;
    setMaterials([]);
  }, [materialsScopeKey]);

  useEffect(() => {
    loadCategories();
    loadStats();
  }, [loadCategories, loadStats]);

  useEffect(() => {
    if (!traineeView || traineeFavoritesNormalizedRef.current) return;

    if (!favoritesFromUrlOnMountRef.current && favoritesOnly) {
      setFavoritesOnly(false);
    }
    traineeFavoritesNormalizedRef.current = true;
  }, [traineeView, favoritesOnly]);

  useEffect(() => {
    if (!filtersHydratedRef.current || !traineeView || favoritesOnly || categories.length === 0) {
      return;
    }

    setCategoryFilter((prev) => {
      if (prev && categories.some((category) => category.id === prev)) {
        return prev;
      }
      return categories[0]?.id ?? '';
    });
  }, [traineeView, favoritesOnly, categories]);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;

    if (prevCategoryFilterRef.current !== categoryFilter) {
      if (prevCategoryFilterRef.current !== null) {
        setModuleFilter('');
      }
      prevCategoryFilterRef.current = categoryFilter;
    }

    loadModules();
  }, [categoryFilter, loadModules]);

  const syncFiltersToUrl = useCallback(
    (snapshot: KnowledgeTerritoryFiltersState) => {
      if (pathname !== '/admin/knowledge') return;

      const signature = knowledgeTerritoryUrlFiltersSignature(snapshot);
      if (lastUrlSyncSignatureRef.current === signature) return;

      const liveParams = newURLSearchParamsLive(pathname, '');
      if (isKnowledgeTerritoryFiltersSyncedWithUrl(liveParams, snapshot)) {
        lastUrlSyncSignatureRef.current = signature;
        return;
      }

      lastUrlSyncSignatureRef.current = signature;
      router.replace(buildKnowledgeTerritoryUrl(snapshot), { scroll: false });
    },
    [pathname, router]
  );

  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    syncFiltersToUrl(filtersSnapshot);
  }, [filtersSnapshot, syncFiltersToUrl]);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    writeKnowledgeTerritoryFilters(filtersSnapshot);
  }, [filtersSnapshot]);

  const handleSearchApply = useCallback((query: string) => {
    setPage(1);
    setSearch(query);
    setSearchInput(query);
  }, []);

  const handleCategoryFilterChange = (categoryId: string) => {
    setCategoryFilter(categoryId);
    setModuleFilter('');
    setFavoritesOnly(false);
    setPage(1);
  };

  const handleFavoritesFilterChange = (active: boolean) => {
    setFavoritesOnly(active);
    if (active) {
      setCategoryFilter('');
      setModuleFilter('');
    }
    setPage(1);
  };

  const openCategoryAccessModal = useCallback((category: AdminKnowledgeCategory) => {
    setCategoryAccessModal({
      resourceId: buildKnowledgeCategoryResourceId(category.id),
      label: getKnowledgeCategoryResourceLabel(category.name),
    });
  }, []);

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
        showMessage('success', 'Материал перемещён в корзину');
      } else if (deleteTarget.type === 'category') {
        await deleteKnowledgeCategory(deleteTarget.id);
        showMessage('success', 'Категория перемещена в корзину');
        if (categoryFilter === deleteTarget.id) {
          setCategoryFilter('');
          setModuleFilter('');
        }
        loadCategories();
      } else {
        await deleteKnowledgeModule(deleteTarget.id);
        showMessage('success', 'Модуль перемещён в корзину');
        if (moduleFilter === deleteTarget.id) {
          setModuleFilter('');
        }
        loadModules();
      }
      setDeleteTarget(null);
      loadMaterials();
      loadStats();
      void refreshTrashCount();
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

  const handleToggleFavorite = async (id: string) => {
    try {
      const result = await toggleKnowledgeMaterialFavorite(id);
      setMaterials((prev) => {
        if (favoritesOnly && !result.favoritedByMe) {
          return prev.filter((material) => material.id !== id);
        }
        return prev.map((material) =>
          material.id === id ? { ...material, favoritedByMe: result.favoritedByMe } : material
        );
      });
      void loadStats();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Не удалось изменить избранное');
    }
  };

  const handleToggleLike = async (id: string) => {
    try {
      const result = await toggleKnowledgeMaterialLike(id);
      setMaterials((prev) =>
        prev.map((material) =>
          material.id === id
            ? { ...material, likedByMe: result.likedByMe, likeCount: result.likeCount }
            : material
        )
      );
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Не удалось изменить отметку');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !newCategorySlug.trim()) {
      showMessage('error', 'Заполните название и slug');
      return;
    }
    setCreatingCategory(true);
    try {
      const category = await createKnowledgeCategory({
        name: newCategoryName.trim(),
        slug: newCategorySlug.trim(),
        order: categories.length + 1,
      });

      let importSummary = '';
      if (newCategoryOutlineFile) {
        const parsed = await parseKnowledgeOutlineImportFile(newCategoryOutlineFile);
        const result = await importKnowledgeCategoryOutline(category.id, {
          modules: parsed.modules.map((module) => ({
            order: module.order,
            name: module.name,
            description: module.description,
            articles: module.articles.map((article, index) => ({
              title: article.title,
              excerpt: article.excerpt,
              sortOrder: index + 1,
            })),
          })),
        });
        importSummary = ` Создано модулей: ${result.modulesCreated}, черновиков конспектов: ${result.articlesCreated}.`;
        if (parsed.warnings.length) {
          importSummary += ` ${parsed.warnings.join(' ')}`;
        }
      }

      showMessage('success', `Категория создана.${importSummary}`);
      setNewCategoryName('');
      setNewCategorySlug('');
      setNewCategoryOutlineFile(null);
      if (newCategoryOutlineInputRef.current) {
        newCategoryOutlineInputRef.current.value = '';
      }
      setShowNewCategory(false);
      setCategoryFilter(category.id);
      setModuleFilter('');
      setPage(1);
      loadCategories();
      loadStats();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка создания');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleNewCategoryOutlineFileChange = (file: File | null) => {
    setNewCategoryOutlineFile(file);
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

  const handleMoveCategory = async (categoryId: string, direction: -1 | 1) => {
    const index = categories.findIndex((cat) => cat.id === categoryId);
    const newIndex = index + direction;
    if (index < 0 || newIndex < 0 || newIndex >= categories.length) return;

    setReorderingCategoryId(categoryId);
    try {
      const reordered = [...categories];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(newIndex, 0, moved);

      const updates = reordered
        .map((cat, orderIndex) => ({ cat, order: orderIndex + 1 }))
        .filter(({ cat, order }) => cat.order !== order);

      await Promise.all(
        updates.map(({ cat, order }) => updateKnowledgeCategory(cat.id, { order }))
      );

      setCategories(reordered.map((cat, orderIndex) => ({ ...cat, order: orderIndex + 1 })));
      showMessage('success', 'Порядок категорий обновлён');
    } catch (e) {
      showMessage(
        'error',
        e instanceof Error ? e.message : 'Не удалось изменить порядок категорий'
      );
      loadCategories();
    } finally {
      setReorderingCategoryId(null);
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

  const handleMoveModule = async (moduleId: string, direction: -1 | 1) => {
    const index = modules.findIndex((mod) => mod.id === moduleId);
    const newIndex = index + direction;
    if (index < 0 || newIndex < 0 || newIndex >= modules.length) return;

    setReorderingModuleId(moduleId);
    try {
      const reordered = [...modules];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(newIndex, 0, moved);

      const updates = reordered
        .map((mod, orderIndex) => ({ mod, order: orderIndex + 1 }))
        .filter(({ mod, order }) => mod.order !== order);

      await Promise.all(updates.map(({ mod, order }) => updateKnowledgeModule(mod.id, { order })));

      setModules(reordered.map((mod, orderIndex) => ({ ...mod, order: orderIndex + 1 })));
      showMessage('success', 'Порядок модулей обновлён');
      loadMaterials();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Не удалось изменить порядок модулей');
      loadModules();
    } finally {
      setReorderingModuleId(null);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryFilter);

  const needsModuleLayout = Boolean(categoryFilter) && !favoritesOnly && !moduleFilter && !search;

  const listLayoutReady =
    (!needsModuleLayout || (!modulesLoading && loadedModulesCategoryId === categoryFilter)) &&
    !(loading && materials.length === 0);

  const handleTrashRestored = useCallback(() => {
    loadMaterials();
    loadCategories();
    loadStats();
    if (categoryFilter) {
      loadModules();
    }
    void refreshTrashCount();
  }, [categoryFilter, loadCategories, loadMaterials, loadModules, loadStats, refreshTrashCount]);

  return {
    canEdit,
    canParticipate,
    canViewTrainingAnalytics,
    isTrainee,
    materials,
    categories,
    modules,
    selectedCategory,
    stats,
    loading,
    listLayoutReady,
    materialsScopeKey,
    message,
    page,
    setPage,
    totalPages,
    search,
    searchInput,
    setSearchInput,
    categoryFilter,
    setCategoryFilter: handleCategoryFilterChange,
    favoritesOnly,
    setFavoritesOnly: handleFavoritesFilterChange,
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
    newCategoryOutlineFile,
    newCategoryOutlineInputRef,
    creatingCategory,
    handleNewCategoryOutlineFileChange,
    editingCategoryId,
    setEditingCategoryId,
    editCategoryName,
    setEditCategoryName,
    editCategorySlug,
    setEditCategorySlug,
    reorderingCategoryId,
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
    reorderingModuleId,
    handleSearchApply,
    handleDelete,
    handlePublish,
    handleToggleFavorite,
    handleToggleLike,
    handleAddCategory,
    handleUpdateCategory,
    handleMoveCategory,
    handleAddModule,
    handleUpdateModule,
    handleMoveModule,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    feedbackUnreadCount,
    refreshFeedbackUnreadCount,
    handleTrashRestored,
    persistTerritoryFilters,
    isSuperAdmin,
    categoryAccessModal,
    setCategoryAccessModal,
    openCategoryAccessModal,
  };
}

export type KnowledgeTerritoryPageModel = ReturnType<typeof useKnowledgeTerritoryPage>;
