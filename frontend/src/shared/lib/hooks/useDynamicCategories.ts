'use client';

import { useCallback, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface CategoryFromAPI {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  parentId: string | null;
  isActive: boolean;
  children?: CategoryFromAPI[];
  _count?: {
    products: number;
  };
}

export interface NavigationCategory {
  name: string;
  slug: string;
  href: string;
  productCount: number;
  icon: string | null;
  image: string | null;
  hasSubmenu: boolean;
  submenu: {
    name: string;
    slug: string;
    href: string;
    productCount: number;
    icon: string | null;
    image: string | null;
  }[];
}

export function useDynamicCategories() {
  const [categories, setCategories] = useState<CategoryFromAPI[]>([]);
  const [navigationCategories, setNavigationCategories] = useState<NavigationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/categories`);

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data: CategoryFromAPI[] = await response.json();
      setCategories(data);

      // Преобразуем в формат навигации
      const navCategories: NavigationCategory[] = data.map((root) => ({
        name: root.name,
        slug: root.slug,
        href: `/catalog/products/${root.slug}`,
        productCount: root._count?.products || 0,
        icon: root.icon,
        image: root.image,
        hasSubmenu: (root.children?.length || 0) > 0,
        submenu: (root.children || []).map((child) => {
          return {
            name: child.name,
            slug: child.slug,
            // Используем полный slug подкатегории для URL
            href: `/catalog/products/${root.slug}/${child.slug}`,
            productCount: child._count?.products || 0,
            icon: child.icon,
            image: child.image,
          };
        }),
      }));

      setNavigationCategories(navCategories);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    navigationCategories,
    loading,
    error,
    refetch: fetchCategories,
  };
}
