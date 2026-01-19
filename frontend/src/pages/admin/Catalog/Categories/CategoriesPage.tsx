'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';

import styles from './CategoriesPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  order: number;
  parentId: string | null;
  children?: Category[];
  _count?: {
    products: number;
  };
}

export function CategoriesPage() {
  const router = useRouter();
  const { getAuthHeaders: _getAuthHeaders } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        // Expand all by default
        const ids = new Set<string>();
        const collectIds = (cats: Category[]) => {
          cats.forEach((cat) => {
            if (cat.children && cat.children.length > 0) {
              ids.add(cat.id);
              collectIds(cat.children);
            }
          });
        };
        collectIds(data);
        setExpandedCategories(ids);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleManageAttributes = (categoryId: string) => {
    router.push(`/admin/catalog/categories/${categoryId}/attributes`);
  };

  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className={styles.categoryItem}>
        <div className={styles.categoryRow} style={{ paddingLeft: `${level * 24 + 16}px` }}>
          <div className={styles.categoryInfo}>
            {hasChildren ? (
              <button className={styles.expandButton} onClick={() => toggleExpand(category.id)}>
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className={styles.expandPlaceholder} />
            )}
            <span className={styles.categoryName}>{category.name}</span>
            <span className={styles.categorySlug}>{category.slug}</span>
            {category._count && (
              <span className={styles.productCount}>{category._count.products} товаров</span>
            )}
          </div>
          <div className={styles.categoryActions}>
            <button
              className={styles.attributesButton}
              onClick={() => handleManageAttributes(category.id)}
              title="Управление атрибутами"
            >
              ⚙️ Атрибуты
            </button>
            <button
              className={styles.editButton}
              onClick={() => router.push(`/admin/catalog/categories/${category.id}/edit`)}
              title="Редактировать"
            >
              ✏️
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className={styles.children}>
            {category.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка категорий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Категории</h1>
        <button
          className={styles.addButton}
          onClick={() => router.push('/admin/catalog/categories/new')}
        >
          + Добавить категорию
        </button>
      </div>

      <div className={styles.categoriesTree}>
        {categories.length > 0 ? (
          categories.map((category) => renderCategory(category))
        ) : (
          <div className={styles.empty}>
            <p>Категории не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}
