'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

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
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './BlogSectionPage.module.css';

export function BlogSectionPage() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [categories, setCategories] = useState<AdminBlogCategory[]>([]);
  const [stats, setStats] = useState<{
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    pendingComments: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'post' | 'category';
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminBlogPosts({
        status: statusFilter || undefined,
        categoryId: categoryFilter || undefined,
        page,
        limit: 20,
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
  }, [page, statusFilter, categoryFilter]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getAdminBlogCategories();
      setCategories(data);
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, []);

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
        showMessage('success', 'Пост удалён');
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
      showMessage('success', 'Пост опубликован');
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

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[а-яё]/g, (c) => {
        const map: Record<string, string> = {
          а: 'a',
          б: 'b',
          в: 'v',
          г: 'g',
          д: 'd',
          е: 'e',
          ё: 'e',
          ж: 'zh',
          з: 'z',
          и: 'i',
          й: 'y',
          к: 'k',
          л: 'l',
          м: 'm',
          н: 'n',
          о: 'o',
          п: 'p',
          р: 'r',
          с: 's',
          т: 't',
          у: 'u',
          ф: 'f',
          х: 'h',
          ц: 'ts',
          ч: 'ch',
          ш: 'sh',
          щ: 'sch',
          ъ: '',
          ы: 'y',
          ь: '',
          э: 'e',
          ю: 'yu',
          я: 'ya',
        };
        return map[c] || c;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.blogSectionPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>Блог</h1>
        <Link href="/admin/content/blog/new" className={styles.createButton}>
          + Создать пост
        </Link>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      {stats && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.totalPosts}</span>
            <span className={styles.statLabel}>Всего постов</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.publishedPosts}</span>
            <span className={styles.statLabel}>Опубликовано</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.draftPosts}</span>
            <span className={styles.statLabel}>Черновиков</span>
          </div>
          {stats.pendingComments > 0 && (
            <Link href="/admin/content/comments" className={styles.stat}>
              <span className={styles.statValue}>{stats.pendingComments}</span>
              <span className={styles.statLabel}>Комментариев на модерации</span>
            </Link>
          )}
        </div>
      )}

      <div className={styles.filters}>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={styles.select}
        >
          <option value="">Все статусы</option>
          <option value="DRAFT">Черновик</option>
          <option value="PUBLISHED">Опубликован</option>
          <option value="ARCHIVED">Архив</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className={styles.select}
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrapper}>
        <DataTable<AdminBlogPost>
          data={posts}
          columns={[
            {
              key: 'title',
              title: 'Заголовок',
              render: (p) => (
                <Link href={`/admin/content/blog/${p.id}/edit`} className={styles.postLink}>
                  {p.title}
                </Link>
              ),
            },
            {
              key: 'status',
              title: 'Статус',
              render: (p) => (
                <span className={`${styles.status} ${styles[`status${p.status}`]}`}>
                  {p.status === 'DRAFT'
                    ? 'Черновик'
                    : p.status === 'PUBLISHED'
                      ? 'Опубликован'
                      : 'Архив'}
                </span>
              ),
            },
            {
              key: 'category',
              title: 'Категория',
              render: (p) => p.category?.name || '—',
            },
            {
              key: 'publishedAt',
              title: 'Дата',
              render: (p) => formatDate(p.publishedAt || p.createdAt),
            },
            {
              key: 'actions',
              title: 'Действия',
              render: (p) => (
                <div className={styles.actions}>
                  <Link href={`/admin/content/blog/${p.id}/edit`} className={styles.actionLink}>
                    Редактировать
                  </Link>
                  {p.status !== 'PUBLISHED' && (
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => handlePublish(p.id)}
                    >
                      Опубликовать
                    </button>
                  )}
                  <a
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.actionLink}
                  >
                    Просмотр
                  </a>
                  <button
                    type="button"
                    className={styles.actionButtonDanger}
                    onClick={() => setDeleteTarget({ type: 'post', id: p.id, name: p.title })}
                  >
                    Удалить
                  </button>
                </div>
              ),
            },
          ]}
          keyExtractor={(p) => p.id}
          loading={loading}
          emptyMessage="Постов пока нет"
          pagination={
            totalPages > 1
              ? {
                  page,
                  limit: 20,
                  total,
                  onPageChange: setPage,
                }
              : undefined
          }
        />
      </div>

      <section className={styles.categoriesSection}>
        <h2 className={styles.sectionTitle}>Категории</h2>
        <ul className={styles.categoriesList}>
          {categories.map((cat) => (
            <li key={cat.id} className={styles.categoryItem}>
              {editingCategory === cat.id ? (
                <div className={styles.categoryEdit}>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setNewCategorySlug(slugify(e.target.value));
                    }}
                    placeholder="Название"
                    className={styles.input}
                  />
                  <input
                    type="text"
                    value={newCategorySlug}
                    onChange={(e) => setNewCategorySlug(e.target.value)}
                    placeholder="Slug"
                    className={styles.input}
                  />
                  <button
                    type="button"
                    className={styles.saveButton}
                    onClick={() => handleUpdateCategory(cat.id, newCategoryName, newCategorySlug)}
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => {
                      setEditingCategory(null);
                      setNewCategoryName('');
                      setNewCategorySlug('');
                    }}
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <>
                  <span className={styles.categoryName}>
                    {cat.name}
                    {cat._count?.posts != null && (
                      <span className={styles.categoryCount}> ({cat._count.posts})</span>
                    )}
                  </span>
                  <div className={styles.categoryActions}>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => {
                        setEditingCategory(cat.id);
                        setNewCategoryName(cat.name);
                        setNewCategorySlug(cat.slug);
                      }}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className={styles.actionButtonDanger}
                      onClick={() =>
                        setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })
                      }
                    >
                      Удалить
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        {showNewCategory ? (
          <div className={styles.newCategoryForm}>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                setNewCategorySlug(slugify(e.target.value));
              }}
              placeholder="Название"
              className={styles.input}
            />
            <input
              type="text"
              value={newCategorySlug}
              onChange={(e) => setNewCategorySlug(e.target.value)}
              placeholder="Slug"
              className={styles.input}
            />
            <button type="button" className={styles.saveButton} onClick={handleAddCategory}>
              Создать
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => {
                setShowNewCategory(false);
                setNewCategoryName('');
                setNewCategorySlug('');
              }}
            >
              Отмена
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.addCategoryButton}
            onClick={() => setShowNewCategory(true)}
          >
            + Добавить категорию
          </button>
        )}
      </section>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Подтверждение удаления"
        message={deleteTarget ? `Вы уверены, что хотите удалить "${deleteTarget.name}"?` : ''}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
