'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import type { AdminPhotoCategory, AdminPhotoProject } from '@/shared/api/admin-photo';
import {
  createPhotoCategory,
  deletePhotoCategory,
  deletePhotoProject,
  getAdminPhotoCategories,
  getAdminProjects,
} from '@/shared/api/admin-photo';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import styles from './PhotoSectionPage.module.css';

const DISPLAY_MODE_LABELS: Record<string, string> = {
  grid: 'Сетка',
  masonry: 'Кирпичная кладка',
  slider: 'Слайдер',
};

export function PhotoSectionPage() {
  const [categories, setCategories] = useState<AdminPhotoCategory[]>([]);
  const [projects, setProjects] = useState<AdminPhotoProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'project';
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadCategories = useCallback(async () => {
    try {
      const data = await getAdminPhotoCategories();
      setCategories(data);
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminProjects({
        categoryId: categoryFilter || undefined,
        page,
        limit: 12,
      });
      setProjects(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setProjects([]);
      showMessage('error', 'Ошибка загрузки объектов');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, page]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'category') {
        await deletePhotoCategory(deleteTarget.id);
        showMessage('success', 'Категория удалена');
        loadCategories();
      } else {
        await deletePhotoProject(deleteTarget.id);
        showMessage('success', 'Объект удалён');
      }
      setDeleteTarget(null);
      loadProjects();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeleting(false);
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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !newCategorySlug.trim()) {
      showMessage('error', 'Заполните название и slug');
      return;
    }
    try {
      await createPhotoCategory({
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

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return `${apiUrl}${url}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Фото</h1>
        <div className={styles.headerActions}>
          <Link href="/admin/content/photo/projects/new" className={styles.createButton}>
            + Добавить объект
          </Link>
          <Link href="/photo" target="_blank" rel="noreferrer" className={styles.viewLink}>
            Просмотр на сайте
          </Link>
        </div>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Категории</h2>
        <ul className={styles.categoriesList}>
          {categories.map((cat) => (
            <li key={cat.id} className={styles.categoryItem}>
              <Link
                href={`/photo/${cat.slug}`}
                target="_blank"
                rel="noreferrer"
                className={styles.categoryLink}
              >
                {cat.name}
              </Link>
              <span className={styles.categoryCount}>({cat._count?.projects ?? 0})</span>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
        {showNewCategory ? (
          <div className={styles.addForm}>
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
            className={styles.addButton}
            onClick={() => setShowNewCategory(true)}
          >
            + Добавить категорию
          </button>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Объекты (проекты с фото)</h2>
        <div className={styles.filters}>
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

        {loading ? (
          <p className={styles.loading}>Загрузка...</p>
        ) : projects.length === 0 ? (
          <p className={styles.empty}>Объектов пока нет. Создайте объект и загрузите фото.</p>
        ) : (
          <>
            <div className={styles.projectsGrid}>
              {projects.map((project) => (
                <div key={project.id} className={styles.projectCard}>
                  <div className={styles.projectImage}>
                    {project.photos[0] ? (
                      <img src={getImageUrl(project.photos[0].imageUrl)} alt={project.title} />
                    ) : (
                      <div className={styles.projectImagePlaceholder}>Нет фото</div>
                    )}
                  </div>
                  <div className={styles.projectInfo}>
                    <h3 className={styles.projectTitle}>{project.title}</h3>
                    {project.category && (
                      <span className={styles.projectCategory}>{project.category.name}</span>
                    )}
                    <span className={styles.projectDisplayMode}>
                      {DISPLAY_MODE_LABELS[project.displayMode] ?? project.displayMode}
                    </span>
                    <span className={styles.projectPhotoCount}>{project.photos.length} фото</span>
                    {project.description && (
                      <p className={styles.projectDescription}>
                        {project.description.slice(0, 100)}
                        {project.description.length > 100 ? '…' : ''}
                      </p>
                    )}
                  </div>
                  <div className={styles.projectActions}>
                    <Link
                      href={`/admin/content/photo/projects/${project.id}/edit`}
                      className={styles.editLink}
                    >
                      Редактировать
                    </Link>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() =>
                        setDeleteTarget({ type: 'project', id: project.id, name: project.title })
                      }
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Назад
                </button>
                <span className={styles.pageInfo}>
                  Страница {page} из {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Вперёд →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Подтверждение удаления"
        message={
          deleteTarget
            ? `Удалить ${deleteTarget.type === 'category' ? 'категорию' : 'объект'} «${deleteTarget.name}»?`
            : ''
        }
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
