'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  type AdminComponentCatalogItem,
  type AdminComponentCatalogTreeResponse,
  fetchAdminComponentCatalogTree,
} from '@/shared/api/admin-component-catalog';

import { COMPONENT_CATALOG_TREE_KEY } from '../list/hooks/useComponentCatalogPage';

export const COMPONENT_CATALOG_FIELD_HINT_LIMIT = 12;

type CatalogHintField = 'name' | 'size' | 'color' | 'material';

export type ComponentCatalogFieldHints = Record<CatalogHintField, string[]>;

const EMPTY_HINTS: ComponentCatalogFieldHints = {
  name: [],
  size: [],
  color: [],
  material: [],
};

function collectItems(tree: AdminComponentCatalogTreeResponse): AdminComponentCatalogItem[] {
  const items: AdminComponentCatalogItem[] = [...tree.ungroupedItems];
  for (const series of tree.series) {
    for (const subgroup of series.subgroups) {
      for (const link of subgroup.items) {
        items.push(link.catalogItem);
      }
    }
  }
  return items;
}

function distinctFieldValues(
  items: AdminComponentCatalogItem[],
  field: CatalogHintField,
  kindId: string
): string[] {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const item of items) {
    if (kindId && item.kindId !== kindId) continue;
    const value = (item[field] ?? '').trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase('ru-RU');
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
  }

  return values
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .slice(0, COMPONENT_CATALOG_FIELD_HINT_LIMIT);
}

function buildHints(
  items: AdminComponentCatalogItem[],
  kindId: string
): ComponentCatalogFieldHints {
  return {
    name: distinctFieldValues(items, 'name', kindId),
    size: distinctFieldValues(items, 'size', kindId),
    color: distinctFieldValues(items, 'color', kindId),
    material: distinctFieldValues(items, 'material', kindId),
  };
}

export function useComponentCatalogFieldHints(
  open: boolean,
  kindId: string
): ComponentCatalogFieldHints {
  const { data: tree } = useQuery({
    queryKey: [COMPONENT_CATALOG_TREE_KEY, 'field-hints'],
    queryFn: () => fetchAdminComponentCatalogTree({ isActive: true }),
    enabled: open,
    staleTime: 60_000,
  });

  return useMemo(() => {
    if (!tree) return EMPTY_HINTS;
    return buildHints(collectItems(tree), kindId);
  }, [tree, kindId]);
}
