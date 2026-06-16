'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import type { AdminKnowledgeMaterial, AdminKnowledgeModule } from '@/shared/api/admin-knowledge';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { VideoProgressFill } from '@/shared/ui/VideoProgressFill/VideoProgressFill';

import { KnowledgePlatformInfoTip } from '../shared/KnowledgePlatformInfoTip';
import {
  formatDate,
  formatReadingTime,
  getMaterialReadingTime,
  getMaterialTypeIcon,
  getMaterialTypeLabel,
  getStatusLabel,
  hasTargetAudiences,
  slugify,
} from '../shared/knowledge-utils';
import styles from './KnowledgeTerritoryPage.module.css';
import type { KnowledgeTerritoryPageModel } from './hooks/useKnowledgeTerritoryPage';
import { TYPE_FILTERS } from './knowledge-territory-page.constants';

type KnowledgeTerritoryPageViewProps = {
  model: KnowledgeTerritoryPageModel;
};

function MaterialCard({
  material: m,
  canEdit,
  styles: s,
  onTogglePin,
  onPublish,
  onDelete,
}: {
  material: AdminKnowledgeMaterial;
  canEdit: boolean;
  styles: typeof styles;
  onTogglePin: (id: string) => void;
  onPublish: (id: string) => void;
  onDelete: (target: { type: 'material'; id: string; name: string }) => void;
}) {
  return (
    <article key={m.id} className={`${s.card} ${m.isPinned ? s.cardPinned : ''}`}>
      <Link href={`/admin/knowledge/materials/${m.id}`} className={s.cardLink}>
        <div className={s.cardThumb}>
          {m.isPinned && <span className={s.pinBadge}>📌</span>}
          {m.thumbnailUrl ? (
            <img src={publicUploadUrl(m.thumbnailUrl)} alt="" className={s.cardImage} />
          ) : (
            <div className={s.cardPlaceholder}>
              <span aria-hidden>{getMaterialTypeIcon(m.type)}</span>
            </div>
          )}
          <span className={s.typeBadge}>{getMaterialTypeLabel(m.type)}</span>
          {canEdit && m.status !== 'PUBLISHED' && (
            <span className={s.statusBadge}>{getStatusLabel(m.status)}</span>
          )}
        </div>
        <div className={s.cardBody}>
          <h3 className={s.cardTitle}>{m.title}</h3>
          {m.excerpt && <p className={s.cardExcerpt}>{m.excerpt}</p>}
          {m.type === 'ARTICLE' &&
          (hasTargetAudiences(m.targetAudiences) ||
            getMaterialReadingTime(m) ||
            m.myQuizStatus?.hasQuiz) ? (
            <div className={s.cardTags}>
              {m.targetAudiences?.map((audience) => (
                <span key={audience.id} className={s.cardTag}>
                  👥 {audience.label}
                </span>
              ))}
              {formatReadingTime(getMaterialReadingTime(m)) ? (
                <span className={s.cardTag}>⏱ {formatReadingTime(getMaterialReadingTime(m))}</span>
              ) : null}
              {m.myQuizStatus?.hasQuiz ? (
                <span
                  className={`${s.cardTag} ${m.myQuizStatus.passed ? s.cardTagSuccess : s.cardTagPending}`}
                >
                  {m.myQuizStatus.passed
                    ? `✓ Тест ${m.myQuizStatus.scorePercent}%`
                    : '○ Тест не пройден'}
                </span>
              ) : null}
            </div>
          ) : null}
          {m.type === 'VIDEO' && m.myVideoProgress && (
            <div className={s.videoProgress}>
              <div className={s.videoProgressBar}>
                <VideoProgressFill
                  percent={m.myVideoProgress.progressPercent}
                  className={s.videoProgressFill}
                />
              </div>
              <span className={s.videoProgressText}>
                {m.myVideoProgress.completed
                  ? 'Просмотрено'
                  : `${m.myVideoProgress.progressPercent}%`}
              </span>
            </div>
          )}
          <div className={s.cardMeta}>
            <span>
              {m.module?.name ?? m.category.name}
              {m.module ? ` · ${m.category.name}` : ''}
            </span>
            <span>{formatDate(m.publishedAt || m.createdAt)}</span>
          </div>
        </div>
      </Link>
      {canEdit && (
        <div className={s.cardActions}>
          <button
            type="button"
            className={s.actionBtn}
            onClick={() => onTogglePin(m.id)}
            title={m.isPinned ? 'Открепить' : 'Закрепить'}
          >
            {m.isPinned ? 'Открепить' : 'Закрепить'}
          </button>
          <Link href={`/admin/knowledge/materials/${m.id}/edit`} className={s.actionLink}>
            Редактировать
          </Link>
          {m.status !== 'PUBLISHED' && (
            <button type="button" className={s.actionBtn} onClick={() => onPublish(m.id)}>
              Опубликовать
            </button>
          )}
          <button
            type="button"
            className={s.dangerBtn}
            onClick={() => onDelete({ type: 'material', id: m.id, name: m.title })}
          >
            Удалить
          </button>
        </div>
      )}
    </article>
  );
}

export function KnowledgeTerritoryPageView({ model }: KnowledgeTerritoryPageViewProps) {
  const {
    canEdit,
    materials,
    categories,
    modules,
    selectedCategory,
    stats,
    loading,
    message,
    page,
    setPage,
    totalPages,
    search,
    searchInput,
    setSearchInput,
    categoryFilter,
    setCategoryFilter,
    moduleFilter,
    setModuleFilter,
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
    handleSearchSubmit,
    handleDelete,
    handlePublish,
    handleTogglePin,
    handleAddCategory,
    handleUpdateCategory,
    handleAddModule,
    handleUpdateModule,
  } = model;

  const showGroupedByModule =
    Boolean(categoryFilter) && !moduleFilter && !search && modules.length > 0;

  const groupedMaterials = useMemo(() => {
    if (!showGroupedByModule) return null;

    const groups: Array<{
      key: string;
      module: AdminKnowledgeModule | null;
      items: AdminKnowledgeMaterial[];
    }> = [];

    for (const mod of modules) {
      const items = materials.filter((m) => m.moduleId === mod.id);
      if (items.length > 0) {
        groups.push({ key: mod.id, module: mod, items });
      }
    }

    const unassigned = materials.filter((m) => !m.moduleId);
    if (unassigned.length > 0) {
      groups.push({ key: 'none', module: null, items: unassigned });
    }

    return groups.length > 0 ? groups : null;
  }, [showGroupedByModule, modules, materials]);

  const deleteModalTitle =
    deleteTarget?.type === 'material'
      ? 'Удалить материал?'
      : deleteTarget?.type === 'module'
        ? 'Удалить модуль?'
        : 'Удалить категорию?';

  const deleteModalMessage =
    deleteTarget?.type === 'category'
      ? `Категория «${deleteTarget?.name}» и все материалы в ней будут удалены.`
      : deleteTarget?.type === 'module'
        ? `Модуль «${deleteTarget?.name}» будет удалён. Материалы останутся в категории без модуля.`
        : `Материал «${deleteTarget?.name}» будет удалён безвозвратно.`;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInfoTip}>
          <KnowledgePlatformInfoTip />
        </div>
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
            onClick={() => setCategoryFilter('')}
          >
            Все материалы
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.categoryChip} ${categoryFilter === cat.id ? styles.categoryChipActive : ''}`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.name}
              <span className={styles.categoryCount}>{cat._count?.materials ?? 0}</span>
            </button>
          ))}

          {categoryFilter && (
            <div className={styles.modulesSection}>
              <h2 className={styles.sidebarTitle}>
                Модули{selectedCategory ? `: ${selectedCategory.name}` : ''}
              </h2>
              <button
                type="button"
                className={`${styles.moduleChip} ${!moduleFilter ? styles.moduleChipActive : ''}`}
                onClick={() => setModuleFilter('')}
              >
                <span>Все модули</span>
              </button>
              {modules.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  className={`${styles.moduleChip} ${moduleFilter === mod.id ? styles.moduleChipActive : ''}`}
                  onClick={() => setModuleFilter(mod.id)}
                >
                  <span>
                    {mod.name}
                    {mod.description ? (
                      <span className={styles.moduleDescription}>{mod.description}</span>
                    ) : null}
                  </span>
                  <span className={styles.categoryCount}>{mod._count?.materials ?? 0}</span>
                </button>
              ))}
              <button
                type="button"
                className={`${styles.moduleChip} ${moduleFilter === 'none' ? styles.moduleChipActive : ''}`}
                onClick={() => setModuleFilter('none')}
              >
                <span>Без модуля</span>
              </button>

              {canEdit && (
                <div className={styles.categoryManage}>
                  <button
                    type="button"
                    className={styles.addCategoryBtn}
                    onClick={() => setShowNewModule(!showNewModule)}
                  >
                    {showNewModule ? 'Отмена' : '+ Модуль'}
                  </button>
                  {showNewModule && (
                    <div className={styles.newCategoryForm}>
                      <input
                        type="text"
                        placeholder="Название модуля"
                        value={newModuleName}
                        onChange={(e) => {
                          setNewModuleName(e.target.value);
                          if (!newModuleSlug || newModuleSlug === slugify(newModuleName)) {
                            setNewModuleSlug(slugify(e.target.value));
                          }
                        }}
                        className={styles.input}
                      />
                      <input
                        type="text"
                        placeholder="slug"
                        value={newModuleSlug}
                        onChange={(e) => setNewModuleSlug(e.target.value)}
                        className={styles.input}
                      />
                      <textarea
                        placeholder="Краткое описание модуля"
                        value={newModuleDescription}
                        onChange={(e) => setNewModuleDescription(e.target.value)}
                        className={styles.input}
                        rows={2}
                      />
                      <button
                        type="button"
                        className={styles.saveCategoryBtn}
                        onClick={handleAddModule}
                      >
                        Создать
                      </button>
                    </div>
                  )}
                  {modules.length > 0 && (
                    <ul className={styles.categoryEditList}>
                      {modules.map((mod) => (
                        <li key={mod.id} className={styles.categoryEditItem}>
                          {editingModuleId === mod.id ? (
                            <div className={styles.newCategoryForm}>
                              <input
                                type="text"
                                value={editModuleName}
                                onChange={(e) => setEditModuleName(e.target.value)}
                                className={styles.input}
                              />
                              <input
                                type="text"
                                value={editModuleSlug}
                                onChange={(e) => setEditModuleSlug(e.target.value)}
                                className={styles.input}
                              />
                              <textarea
                                value={editModuleDescription}
                                onChange={(e) => setEditModuleDescription(e.target.value)}
                                className={styles.input}
                                rows={2}
                              />
                              <div className={styles.categoryEditActions}>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateModule(mod.id)}
                                  className={styles.saveCategoryBtn}
                                >
                                  Сохранить
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingModuleId(null)}
                                  className={styles.cancelBtn}
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.categoryEditRow}>
                              <span>{mod.name}</span>
                              <div className={styles.categoryEditActions}>
                                <button
                                  type="button"
                                  className={styles.linkBtn}
                                  onClick={() => {
                                    setEditingModuleId(mod.id);
                                    setEditModuleName(mod.name);
                                    setEditModuleSlug(mod.slug);
                                    setEditModuleDescription(mod.description || '');
                                  }}
                                >
                                  Изм.
                                </button>
                                <button
                                  type="button"
                                  className={styles.dangerBtn}
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'module',
                                      id: mod.id,
                                      name: mod.name,
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
            </div>
          )}

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
              {groupedMaterials ? (
                groupedMaterials.map((group) => (
                  <section key={group.key} className={styles.moduleGroup}>
                    <h3 className={styles.moduleGroupTitle}>
                      {group.module?.name ?? 'Без модуля'}
                    </h3>
                    {group.module?.description ? (
                      <p className={styles.moduleGroupDescription}>{group.module.description}</p>
                    ) : null}
                    <div className={styles.grid}>
                      {group.items.map((m) => (
                        <MaterialCard
                          key={m.id}
                          material={m}
                          canEdit={canEdit}
                          styles={styles}
                          onTogglePin={handleTogglePin}
                          onPublish={handlePublish}
                          onDelete={setDeleteTarget}
                        />
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className={styles.grid}>
                  {materials.map((m) => (
                    <MaterialCard
                      key={m.id}
                      material={m}
                      canEdit={canEdit}
                      styles={styles}
                      onTogglePin={handleTogglePin}
                      onPublish={handlePublish}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              )}

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
        title={deleteModalTitle}
        message={deleteModalMessage}
        confirmText={deleting ? 'Удаление…' : 'Удалить'}
        cancelText="Отмена"
        onConfirm={handleDelete}
        onClose={() => !deleting && setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
