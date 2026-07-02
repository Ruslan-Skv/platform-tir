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
import { ensureFreshAccessToken, hasUsableStoredAccessToken } from '@/shared/lib/auth-session';
import { useAdminTrashCount } from '@/shared/ui/admin/AdminToolbarIconButton/useAdminTrashCount';
import { newURLSearchParamsLive } from '@/views/catalog/lib/newURLSearchParamsLive';

import { parseKnowledgeOutlineImportFile } from '../../shared/import/parseKnowledgeOutlineImport';
import {
  KNOWLEDGE_RESOURCE_ID,
  KNOWLEDGE_TESTS_RESOURCE_ID,
  buildKnowledgeCategoryResourceId,
  canViewKnowledgeTrainingAnalytics,
  getKnowledgeCategoryResourceLabel,
  isKnowledgeTraineeRole,
} from '../../shared/knowledge-utils';
import {
  buildKnowledgeTerritoryMaterialsScopeKey,
  readCachedKnowledgeCategories,
  readCachedKnowledgeMaterials,
  readCachedKnowledgeModules,
  writeCachedKnowledgeCategories,
  writeCachedKnowledgeMaterials,
  writeCachedKnowledgeModules,
} from '../knowledge-territory-data-cache';
import {
  type KnowledgeTerritoryFiltersState,
  buildKnowledgeTerritoryUrl,
  isKnowledgeTerritoryFiltersSyncedWithUrl,
  knowledgeTerritoryUrlFiltersSignature,
  readInitialKnowledgeTerritoryFilters,
  writeKnowledgeTerritoryFilters,
} from '../knowledge-territory-filters-storage';
import { MATERIALS_PAGE_LIMIT } from '../knowledge-territory-page.constants';
import type { DeleteTarget, PageMessage } from '../knowledge-territory-page.types';
import { useKnowledgePlatformFeedbackUnreadCount } from './useKnowledgePlatformFeedbackUnreadCount';

function createInitialTerritoryState() {
  const initialFilters = readInitialKnowledgeTerritoryFilters();
  const materialsScopeKey = buildKnowledgeTerritoryMaterialsScopeKey(initialFilters);
  const cachedMaterials = readCachedKnowledgeMaterials(materialsScopeKey);
  const cachedCategories = readCachedKnowledgeCategories();
  const cachedModules = initialFilters.categoryFilter
    ? readCachedKnowledgeModules(initialFilters.categoryFilter)
    : null;

  return {
    initialFilters,
    materialsScopeKey,
    cachedMaterials,
    cachedCategories,
    cachedModules,
  };
}

export function useKnowledgeTerritoryPage() {
  const { user, isLoading: authLoading, token: authToken } = useAuth();
  const {
    canView,
    canEdit,
    canParticipate,
    isLoading: permissionsLoading,
  } = useAdminResourcePermission(KNOWLEDGE_RESOURCE_ID);
  const { canView: canViewTestsBlock, isLoading: testsPermissionsLoading } =
    useAdminResourcePermission(KNOWLEDGE_TESTS_RESOURCE_ID);
  const sessionReady = Boolean(authToken) || hasUsableStoredAccessToken(0);
  const knowledgeAccessReady =
    !authLoading && !permissionsLoading && !testsPermissionsLoading && canView && sessionReady;
  const canViewTrainingAnalytics = canViewKnowledgeTrainingAnalytics(user?.role, canView);
  const isTrainee = isKnowledgeTraineeRole(user?.role);
  const traineeView = !authLoading && isTrainee;
  const router = useRouter();
  const pathname = usePathname();
  const [initialTerritory] = useState(createInitialTerritoryState);
  const filtersHydratedRef = useRef(false);
  const favoritesFromUrlOnMountRef = useRef(initialTerritory.initialFilters.favoritesOnly);
  const prevCategoryFilterRef = useRef<string | null>(
    initialTerritory.initialFilters.categoryFilter
  );
  const traineeFavoritesNormalizedRef = useRef(false);
  const materialsLoadSeqRef = useRef(0);
  const categoriesLoadSeqRef = useRef(0);
  const categoriesLoadedRef = useRef(false);
  const [categoriesSettled, setCategoriesSettled] = useState(false);
  const modulesLoadSeqRef = useRef(0);
  const categoryErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const materialsRef = useRef<AdminKnowledgeMaterial[]>([]);
  const materialsScopeKeyRef = useRef<string | null>(initialTerritory.materialsScopeKey);
  const lastUrlSyncSignatureRef = useRef('');
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [materials, setMaterials] = useState<AdminKnowledgeMaterial[]>(
    () => initialTerritory.cachedMaterials?.data ?? []
  );
  materialsRef.current = materials;
  const [categories, setCategories] = useState<AdminKnowledgeCategory[]>(
    () => initialTerritory.cachedCategories ?? []
  );
  const [modules, setModules] = useState<AdminKnowledgeModule[]>(
    () => initialTerritory.cachedModules ?? []
  );
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(() => initialTerritory.cachedMaterials === null);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [page, setPage] = useState(initialTerritory.initialFilters.page);
  const [totalPages, setTotalPages] = useState(
    () => initialTerritory.cachedMaterials?.totalPages ?? 1
  );
  const [search, setSearch] = useState(initialTerritory.initialFilters.search);
  const [searchInput, setSearchInput] = useState(initialTerritory.initialFilters.searchInput);
  const [categoryFilter, setCategoryFilter] = useState(
    initialTerritory.initialFilters.categoryFilter
  );
  const [moduleFilter, setModuleFilter] = useState(initialTerritory.initialFilters.moduleFilter);
  const [typeFilter, setTypeFilter] = useState<KnowledgeMaterialType | ''>(
    initialTerritory.initialFilters.typeFilter
  );
  const [statusFilter, setStatusFilter] = useState(initialTerritory.initialFilters.statusFilter);
  const [favoritesOnly, setFavoritesOnly] = useState(initialTerritory.initialFilters.favoritesOnly);
  const [modulesLoading, setModulesLoading] = useState(
    () =>
      Boolean(initialTerritory.initialFilters.categoryFilter) &&
      initialTerritory.cachedModules === null
  );
  const [loadedModulesCategoryId, setLoadedModulesCategoryId] = useState<string | null>(() =>
    initialTerritory.initialFilters.categoryFilter && initialTerritory.cachedModules !== null
      ? initialTerritory.initialFilters.categoryFilter
      : null
  );
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
      buildKnowledgeTerritoryMaterialsScopeKey({
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
      if (!categoriesLoadedRef.current) {
        return;
      }
      setMaterials([]);
      setTotalPages(1);
      setLoading(false);
      setModulesLoading(false);
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
    const hasCachedMaterials = readCachedKnowledgeMaterials(materialsScopeKey) !== null;
    if (!hasCachedMaterials) {
      setLoading(true);
    }
    try {
      await ensureFreshAccessToken(0);
      if (!hasUsableStoredAccessToken(0)) return;
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
      writeCachedKnowledgeMaterials(materialsScopeKey, res.data, res.totalPages);
      setMaterials(res.data);
      setTotalPages(res.totalPages);
    } catch {
      if (seq !== materialsLoadSeqRef.current) return;
      if (!hasCachedMaterials) {
        setMaterials([]);
        showMessage('error', 'Ошибка загрузки материалов');
      }
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
    materialsScopeKey,
    canEdit,
    traineeView,
    knowledgeAccessReady,
    categories,
    showMessage,
  ]);

  const loadCategories = useCallback(async () => {
    if (!knowledgeAccessReady) return;
    const seq = ++categoriesLoadSeqRef.current;
    try {
      await ensureFreshAccessToken(0);
      if (!hasUsableStoredAccessToken(0)) return;
      const data = await getKnowledgeCategories();
      if (seq !== categoriesLoadSeqRef.current) return;
      if (categoryErrorTimerRef.current) {
        clearTimeout(categoryErrorTimerRef.current);
        categoryErrorTimerRef.current = null;
      }
      writeCachedKnowledgeCategories(data);
      setCategories(data);
    } catch {
      if (seq !== categoriesLoadSeqRef.current) return;
      if (readCachedKnowledgeCategories()?.length) return;
      if (categoryErrorTimerRef.current) {
        clearTimeout(categoryErrorTimerRef.current);
      }
      categoryErrorTimerRef.current = setTimeout(() => {
        if (seq !== categoriesLoadSeqRef.current) return;
        showMessage('error', 'Ошибка загрузки категорий');
      }, 500);
    } finally {
      if (seq === categoriesLoadSeqRef.current) {
        categoriesLoadedRef.current = true;
        setCategoriesSettled(true);
        if (traineeView) {
          setLoading(false);
          setModulesLoading(false);
        }
      }
    }
  }, [knowledgeAccessReady, showMessage, traineeView]);

  const loadModules = useCallback(async () => {
    if (!categoryFilter) {
      setModules([]);
      setLoadedModulesCategoryId(null);
      setModulesLoading(false);
      return;
    }
    if (traineeView && categoryFilter && categories.length === 0) {
      if (!categoriesLoadedRef.current) {
        const cached = readCachedKnowledgeModules(categoryFilter);
        if (cached === null) {
          setModulesLoading(true);
        }
        return;
      }
      setModules([]);
      setLoadedModulesCategoryId(categoryFilter);
      setModulesLoading(false);
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

    const seq = ++modulesLoadSeqRef.current;
    const cached = readCachedKnowledgeModules(categoryFilter);
    const hasCached = cached !== null;

    if (!hasCached) {
      setModulesLoading(true);
      setModules([]);
      setLoadedModulesCategoryId(null);
    }

    try {
      const data = await getKnowledgeModules(categoryFilter);
      if (seq !== modulesLoadSeqRef.current) return;
      writeCachedKnowledgeModules(categoryFilter, data);
      setModules(data);
      setLoadedModulesCategoryId(categoryFilter);
    } catch {
      if (seq !== modulesLoadSeqRef.current) return;
      if (!hasCached) {
        setModules([]);
        showMessage('error', 'Ошибка загрузки модулей');
      }
      setLoadedModulesCategoryId(categoryFilter);
    } finally {
      if (seq === modulesLoadSeqRef.current) {
        setModulesLoading(false);
      }
    }
  }, [categoryFilter, traineeView, categories, showMessage]);

  const loadStats = useCallback(async () => {
    if (!knowledgeAccessReady) return;
    try {
      await ensureFreshAccessToken(0);
      if (!hasUsableStoredAccessToken(0)) return;
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
    if (materialsScopeKeyRef.current === materialsScopeKey) return;
    materialsScopeKeyRef.current = materialsScopeKey;
    const cached = readCachedKnowledgeMaterials(materialsScopeKey);
    if (cached) {
      setMaterials(cached.data);
      setTotalPages(cached.totalPages);
      setLoading(false);
      return;
    }
    setMaterials([]);
  }, [materialsScopeKey]);

  useEffect(() => {
    return () => {
      if (categoryErrorTimerRef.current) {
        clearTimeout(categoryErrorTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadCategories();
    loadStats();
  }, [loadCategories, loadStats]);

  useEffect(() => {
    if (authLoading || permissionsLoading || testsPermissionsLoading) return;
    if (!canView) {
      setLoading(false);
      setModulesLoading(false);
    }
  }, [authLoading, canView, permissionsLoading, testsPermissionsLoading]);

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

      if (urlSyncTimerRef.current) {
        clearTimeout(urlSyncTimerRef.current);
      }

      urlSyncTimerRef.current = setTimeout(() => {
        urlSyncTimerRef.current = null;
        if (pathname !== '/admin/knowledge') return;

        const nextSignature = knowledgeTerritoryUrlFiltersSignature(snapshot);
        if (lastUrlSyncSignatureRef.current === nextSignature) return;

        const nextParams = newURLSearchParamsLive(pathname, '');
        if (isKnowledgeTerritoryFiltersSyncedWithUrl(nextParams, snapshot)) {
          lastUrlSyncSignatureRef.current = nextSignature;
          return;
        }

        lastUrlSyncSignatureRef.current = nextSignature;
        router.replace(buildKnowledgeTerritoryUrl(snapshot), { scroll: false });
      }, 50);
    },
    [pathname, router]
  );

  useEffect(() => {
    return () => {
      if (urlSyncTimerRef.current) {
        clearTimeout(urlSyncTimerRef.current);
      }
    };
  }, []);

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
    (!needsModuleLayout ||
      (!modulesLoading &&
        (loadedModulesCategoryId === categoryFilter ||
          !categoryFilter ||
          (categoriesSettled && categories.length === 0)))) &&
    !(
      loading &&
      materials.length === 0 &&
      readCachedKnowledgeMaterials(materialsScopeKey) === null
    );

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
    canViewTestsBlock,
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
