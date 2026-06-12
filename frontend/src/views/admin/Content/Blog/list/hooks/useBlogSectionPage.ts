'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type AdminBlogCategory,
  type AdminBlogPost,
  createBlogCategory,
  deleteBlogCategory,
  deleteBlogPost,
  getAdminBlogCategories,
  getAdminBlogPosts,
  getAdminBlogStats,
  publishBlogPost,
  updateBlogCategory,
} from '@/shared/api/admin-blog';

import { BLOG_POSTS_PAGE_LIMIT } from '../blog-section-page.constants';
import type { BlogStats, DeleteTarget, PageMessage } from '../blog-section-page.types';

export function useBlogSectionPage() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [categories, setCategories] = useState<AdminBlogCategory[]>([]);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminBlogPosts({
        status: statusFilter || undefined,
        categoryId: categoryFilter || undefined,
        page,
        limit: BLOG_POSTS_PAGE_LIMIT,
      });
      setPosts(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      setPosts([]);
      showMessage('error', 'Ошибка загрузки постов');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, showMessage]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getAdminBlogCategories();
      setCategories(data);
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, [showMessage]);

  const loadStats = useCallback(async () => {
    try {
      const data = await getAdminBlogStats();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    loadCategories();
    loadStats();
  }, [loadCategories, loadStats]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'post') {
        await deleteBlogPost(deleteTarget.id);
        showMessage('success', 'Статья удалена');
      } else {
        await deleteBlogCategory(deleteTarget.id);
        showMessage('success', 'Категория удалена');
        loadCategories();
      }
      setDeleteTarget(null);
      loadPosts();
      loadStats();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishBlogPost(id);
      showMessage('success', 'Статья опубликована');
      loadPosts();
      loadStats();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка публикации');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !newCategorySlug.trim()) {
      showMessage('error', 'Заполните название и slug');
      return;
    }
    try {
      await createBlogCategory({
        name: newCategoryName.trim(),
        slug: newCategorySlug.trim(),
      });
      showMessage('success', 'Категория создана');
      setNewCategoryName('');
      setNewCategorySlug('');
      setShowNewCategory(false);
      loadCategories();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка создания');
    }
  };

  const handleUpdateCategory = async (id: string, name: string, slug: string) => {
    try {
      await updateBlogCategory(id, { name, slug });
      showMessage('success', 'Категория обновлена');
      setEditingCategory(null);
      loadCategories();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка обновления');
    }
  };

  return {
    posts,
    categories,
    stats,
    loading,
    message,
    page,
    setPage,
    totalPages,
    total,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    deleteTarget,
    setDeleteTarget,
    deleting,
    editingCategory,
    setEditingCategory,
    newCategoryName,
    setNewCategoryName,
    newCategorySlug,
    setNewCategorySlug,
    showNewCategory,
    setShowNewCategory,
    handleDelete,
    handlePublish,
    handleAddCategory,
    handleUpdateCategory,
  };
}

export type BlogSectionPageModel = ReturnType<typeof useBlogSectionPage>;
