'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import type { AdminBlogPost } from '@/shared/api/admin-blog';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './BlogSectionPage.module.css';
import { BLOG_POSTS_PAGE_LIMIT } from './blog-section-page.constants';
import { formatBlogDate, getPostAuthorDisplay, slugify } from './blog-section-page.utils';
import type { BlogSectionPageModel } from './hooks/useBlogSectionPage';

type BlogSectionPageViewProps = {
  model: BlogSectionPageModel;
};

export function BlogSectionPageView({ model }: BlogSectionPageViewProps) {
  const {
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
  } = model;

  const columns = useMemo(
    () => [
      {
        key: 'title',
        title: 'Заголовок',
        render: (p: AdminBlogPost) => (
          <div className={styles.titleCell}>
            {p.badge?.trim() && <span className={styles.badge}>{p.badge.trim()}</span>}
            <Link href={`/admin/content/blog/${p.id}/edit`} className={styles.postLink}>
              {p.title}
            </Link>
          </div>
        ),
      },
      {
        key: 'sortOrder',
        title: 'Порядок',
        render: (p: AdminBlogPost) => p.sortOrder ?? 0,
      },
      {
        key: 'reading',
        title: 'Чтение',
        render: (p: AdminBlogPost) => `${p.readingTimeMinutes ?? 1} мин`,
      },
      {
        key: 'authorLine',
        title: 'Автор',
        render: (p: AdminBlogPost) => getPostAuthorDisplay(p),
      },
      {
        key: 'status',
        title: 'Статус',
        render: (p: AdminBlogPost) => (
          <span className={`${styles.status} ${styles[`status${p.status}`]}`}>
            {p.status === 'DRAFT' ? 'Черновик' : p.status === 'PUBLISHED' ? 'Опубликован' : 'Архив'}
          </span>
        ),
      },
      {
        key: 'category',
        title: 'Категория',
        render: (p: AdminBlogPost) => p.category?.name || '—',
      },
      {
        key: 'publishedAt',
        title: 'Дата',
        render: (p: AdminBlogPost) => formatBlogDate(p.publishedAt || p.createdAt),
      },
      {
        key: 'actions',
        title: 'Действия',
        render: (p: AdminBlogPost) => (
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
    ],
    [handlePublish, setDeleteTarget]
  );

  return (
    <div className={styles.blogSectionPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>Полезные статьи</h1>
        <Link href="/admin/content/blog/new" className={styles.createButton}>
          + Создать статью
        </Link>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      {stats && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.totalPosts}</span>
            <span className={styles.statLabel}>Всего статей</span>
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
          columns={columns}
          keyExtractor={(p) => p.id}
          loading={loading}
          emptyMessage="Статей пока нет"
          pagination={
            totalPages > 1
              ? {
                  page,
                  limit: BLOG_POSTS_PAGE_LIMIT,
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
