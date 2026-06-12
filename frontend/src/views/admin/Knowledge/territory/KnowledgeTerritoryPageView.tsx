'use client';

import Link from 'next/link';

import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import {
  formatDate,
  getMaterialTypeIcon,
  getMaterialTypeLabel,
  getStatusLabel,
  slugify,
} from '../shared/knowledge-utils';
import styles from './KnowledgeTerritoryPage.module.css';
import type { KnowledgeTerritoryPageModel } from './hooks/useKnowledgeTerritoryPage';
import { TYPE_FILTERS } from './knowledge-territory-page.constants';

type KnowledgeTerritoryPageViewProps = {
  model: KnowledgeTerritoryPageModel;
};

export function KnowledgeTerritoryPageView({ model }: KnowledgeTerritoryPageViewProps) {
  const {
    canEdit,
    materials,
    categories,
    stats,
    loading,
    message,
    page,
    setPage,
    totalPages,
    searchInput,
    setSearchInput,
    categoryFilter,
    setCategoryFilter,
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
    editingCategoryId,
    setEditingCategoryId,
    editCategoryName,
    setEditCategoryName,
    editCategorySlug,
    setEditCategorySlug,
    handleSearchSubmit,
    handleDelete,
    handlePublish,
    handleTogglePin,
    handleAddCategory,
    handleUpdateCategory,
  } = model;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroHeading}>
            <span className={styles.heroTitle}>Территория знаний</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Видео, инструкции и полезные материалы — всё, чтобы уверенно расти в профессии и вместе
            развивать компанию
          </p>
        </div>
        {canEdit && (
          <Link href="/admin/knowledge/materials/new" className={styles.createButton}>
            + Добавить материал
          </Link>
        )}
      </header>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      {stats && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.publishedMaterials}</span>
            <span className={styles.statLabel}>Опубликовано</span>
          </div>
          {canEdit && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.draftMaterials}</span>
              <span className={styles.statLabel}>Черновиков</span>
            </div>
          )}
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.videoCount}</span>
            <span className={styles.statLabel}>Видео</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.articleCount}</span>
            <span className={styles.statLabel}>Статей</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.categoryCount}</span>
            <span className={styles.statLabel}>Категорий</span>
          </div>
          {(stats.pinnedCount ?? 0) > 0 && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.pinnedCount}</span>
              <span className={styles.statLabel}>Закреплено</span>
            </div>
          )}
        </div>
      )}

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Категории</h2>
          <button
            type="button"
            className={`${styles.categoryChip} ${!categoryFilter ? styles.categoryChipActive : ''}`}
            onClick={() => {
              setCategoryFilter('');
              setPage(1);
            }}
          >
            Все материалы
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.categoryChip} ${categoryFilter === cat.id ? styles.categoryChipActive : ''}`}
              onClick={() => {
                setCategoryFilter(cat.id);
                setPage(1);
              }}
            >
              {cat.name}
              <span className={styles.categoryCount}>{cat._count?.materials ?? 0}</span>
            </button>
          ))}

          {canEdit && (
            <div className={styles.categoryManage}>
              <button
                type="button"
                className={styles.addCategoryBtn}
                onClick={() => setShowNewCategory(!showNewCategory)}
              >
                {showNewCategory ? 'Отмена' : '+ Категория'}
              </button>
              {showNewCategory && (
                <div className={styles.newCategoryForm}>
                  <input
                    type="text"
                    placeholder="Название"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      if (!newCategorySlug || newCategorySlug === slugify(newCategoryName)) {
                        setNewCategorySlug(slugify(e.target.value));
                      }
                    }}
                    className={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="slug"
                    value={newCategorySlug}
                    onChange={(e) => setNewCategorySlug(e.target.value)}
                    className={styles.input}
                  />
                  <button
                    type="button"
                    className={styles.saveCategoryBtn}
                    onClick={handleAddCategory}
                  >
                    Создать
                  </button>
                </div>
              )}
              {categories.length > 0 && (
                <ul className={styles.categoryEditList}>
                  {categories.map((cat) => (
                    <li key={cat.id} className={styles.categoryEditItem}>
                      {editingCategoryId === cat.id ? (
                        <div className={styles.newCategoryForm}>
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className={styles.input}
                          />
                          <input
                            type="text"
                            value={editCategorySlug}
                            onChange={(e) => setEditCategorySlug(e.target.value)}
                            className={styles.input}
                          />
                          <div className={styles.categoryEditActions}>
                            <button
                              type="button"
                              onClick={() => handleUpdateCategory(cat.id)}
                              className={styles.saveCategoryBtn}
                            >
                              Сохранить
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryId(null)}
                              className={styles.cancelBtn}
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.categoryEditRow}>
                          <span>{cat.name}</span>
                          <div className={styles.categoryEditActions}>
                            <button
                              type="button"
                              className={styles.linkBtn}
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditCategoryName(cat.name);
                                setEditCategorySlug(cat.slug);
                              }}
                            >
                              Изм.
                            </button>
                            <button
                              type="button"
                              className={styles.dangerBtn}
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'category',
                                  id: cat.id,
                                  name: cat.name,
                                })
                              }
                            >
                              Удал.
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>

        <main className={styles.main}>
          <div className={styles.toolbar}>
            <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
              <input
                type="search"
                placeholder="Поиск по названию и описанию…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchBtn}>
                Найти
              </button>
            </form>

            <div className={styles.filters}>
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.value || 'all'}
                  type="button"
                  className={`${styles.filterChip} ${typeFilter === f.value ? styles.filterChipActive : ''}`}
                  onClick={() => {
                    setTypeFilter(f.value);
                    setPage(1);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {canEdit && (
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className={styles.select}
              >
                <option value="">Все статусы</option>
                <option value="PUBLISHED">Опубликован</option>
                <option value="DRAFT">Черновик</option>
                <option value="ARCHIVED">Архив</option>
              </select>
            )}
          </div>

          {loading ? (
            <div className={styles.loading}>Загрузка…</div>
          ) : materials.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon} aria-hidden>
                📚
              </div>
              <h2 className={styles.emptyTitle}>Материалы не найдены</h2>
              <p className={styles.emptyText}>
                {canEdit
                  ? 'Добавьте первый обучающий материал или измените фильтры поиска.'
                  : 'Пока нет опубликованных материалов в этой категории.'}
              </p>
              {canEdit && (
                <Link href="/admin/knowledge/materials/new" className={styles.createButton}>
                  + Добавить материал
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {materials.map((m) => (
                  <article
                    key={m.id}
                    className={`${styles.card} ${m.isPinned ? styles.cardPinned : ''}`}
                  >
                    <Link href={`/admin/knowledge/materials/${m.id}`} className={styles.cardLink}>
                      <div className={styles.cardThumb}>
                        {m.isPinned && <span className={styles.pinBadge}>📌</span>}
                        {m.thumbnailUrl ? (
                          <img
                            src={publicUploadUrl(m.thumbnailUrl)}
                            alt=""
                            className={styles.cardImage}
                          />
                        ) : (
                          <div className={styles.cardPlaceholder}>
                            <span aria-hidden>{getMaterialTypeIcon(m.type)}</span>
                          </div>
                        )}
                        <span className={styles.typeBadge}>{getMaterialTypeLabel(m.type)}</span>
                        {canEdit && m.status !== 'PUBLISHED' && (
                          <span className={styles.statusBadge}>{getStatusLabel(m.status)}</span>
                        )}
                      </div>
                      <div className={styles.cardBody}>
                        <h3 className={styles.cardTitle}>{m.title}</h3>
                        {m.excerpt && <p className={styles.cardExcerpt}>{m.excerpt}</p>}
                        {m.type === 'VIDEO' && m.myVideoProgress && (
                          <div className={styles.videoProgress}>
                            <div className={styles.videoProgressBar}>
                              <div
                                className={styles.videoProgressFill}
                                style={{ width: `${m.myVideoProgress.progressPercent}%` }}
                              />
                            </div>
                            <span className={styles.videoProgressText}>
                              {m.myVideoProgress.completed
                                ? 'Просмотрено'
                                : `${m.myVideoProgress.progressPercent}%`}
                            </span>
                          </div>
                        )}
                        <div className={styles.cardMeta}>
                          <span>{m.category.name}</span>
                          <span>{formatDate(m.publishedAt || m.createdAt)}</span>
                        </div>
                      </div>
                    </Link>
                    {canEdit && (
                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleTogglePin(m.id)}
                          title={m.isPinned ? 'Открепить' : 'Закрепить'}
                        >
                          {m.isPinned ? 'Открепить' : 'Закрепить'}
                        </button>
                        <Link
                          href={`/admin/knowledge/materials/${m.id}/edit`}
                          className={styles.actionLink}
                        >
                          Редактировать
                        </Link>
                        {m.status !== 'PUBLISHED' && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => handlePublish(m.id)}
                          >
                            Опубликовать
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() =>
                            setDeleteTarget({ type: 'material', id: m.id, name: m.title })
                          }
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className={styles.pageBtn}
                  >
                    ← Назад
                  </button>
                  <span className={styles.pageInfo}>
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className={styles.pageBtn}
                  >
                    Вперёд →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.type === 'material' ? 'Удалить материал?' : 'Удалить категорию?'}
        message={
          deleteTarget?.type === 'category'
            ? `Категория «${deleteTarget?.name}» и все материалы в ней будут удалены.`
            : `Материал «${deleteTarget?.name}» будет удалён безвозвратно.`
        }
        confirmText={deleting ? 'Удаление…' : 'Удалить'}
        cancelText="Отмена"
        onConfirm={handleDelete}
        onClose={() => !deleting && setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
