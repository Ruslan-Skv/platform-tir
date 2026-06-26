import type {
  AdminKnowledgeCategory,
  AdminKnowledgeMaterial,
  AdminKnowledgeModule,
} from '@/shared/api/admin-knowledge';

import type { KnowledgeTerritoryFiltersState } from './knowledge-territory-filters-storage';

export type KnowledgeMaterialsCacheEntry = {
  data: AdminKnowledgeMaterial[];
  totalPages: number;
};

let categoriesCache: AdminKnowledgeCategory[] | null = null;
const modulesCache = new Map<string, AdminKnowledgeModule[]>();
const materialsCache = new Map<string, KnowledgeMaterialsCacheEntry>();

export function buildKnowledgeTerritoryMaterialsScopeKey(
  state: Pick<
    KnowledgeTerritoryFiltersState,
    'categoryFilter' | 'moduleFilter' | 'favoritesOnly' | 'search' | 'typeFilter' | 'statusFilter'
  >
): string {
  return JSON.stringify({
    categoryFilter: state.categoryFilter,
    moduleFilter: state.moduleFilter,
    favoritesOnly: state.favoritesOnly,
    search: state.search,
    typeFilter: state.typeFilter,
    statusFilter: state.statusFilter,
  });
}

export function readCachedKnowledgeCategories(): AdminKnowledgeCategory[] | null {
  return categoriesCache;
}

export function writeCachedKnowledgeCategories(data: AdminKnowledgeCategory[]): void {
  categoriesCache = data;
}

export function readCachedKnowledgeModules(categoryId: string): AdminKnowledgeModule[] | null {
  if (!modulesCache.has(categoryId)) return null;
  return modulesCache.get(categoryId)!;
}

export function writeCachedKnowledgeModules(
  categoryId: string,
  data: AdminKnowledgeModule[]
): void {
  modulesCache.set(categoryId, data);
}

export function readCachedKnowledgeMaterials(
  scopeKey: string
): KnowledgeMaterialsCacheEntry | null {
  return materialsCache.get(scopeKey) ?? null;
}

export function writeCachedKnowledgeMaterials(
  scopeKey: string,
  data: AdminKnowledgeMaterial[],
  totalPages: number
): void {
  materialsCache.set(scopeKey, { data, totalPages });
}
