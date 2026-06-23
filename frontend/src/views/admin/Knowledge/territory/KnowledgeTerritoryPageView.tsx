'use client';

import { useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type {
  AdminKnowledgeMaterial,
  AdminKnowledgeModule,
  KnowledgeMaterialSearchSuggestion,
} from '@/shared/api/admin-knowledge';
import { buildPaginationPageSlots } from '@/shared/lib/pagination-page-slots';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { VideoProgressFill } from '@/shared/ui/VideoProgressFill/VideoProgressFill';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminToolbarTrashButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import toolbarButtonStyles from '@/shared/ui/admin/AdminToolbarIconButton/AdminToolbarIconButton.module.css';
import {
  CommentIcon,
  DeleteIcon,
  EditIcon,
  InterestingMaterialIcon,
  KnowledgeFavoriteIcon,
  PlatformFeedbackIcon,
  PublishIcon,
  TrainingStatisticsIcon,
} from '@/shared/ui/icons';
import { AdminAccessIcon } from '@/shared/ui/icons/AdminAccessIcon';
import { AccessModal } from '@/widgets/admin/Sidebar/AccessModal';

import { KnowledgeMaterialInterestingBadge } from '../shared/KnowledgeMaterialInterestingBadge';
import { KnowledgePlatformFeedbackButton } from '../shared/KnowledgePlatformFeedbackButton';
import { KnowledgePlatformInfoTip } from '../shared/KnowledgePlatformInfoTip';
import { KNOWLEDGE_MATERIAL_COMMENTS_SECTION_ID } from '../shared/knowledge-comments.constants';
import {
  formatDate,
  formatReadingTime,
  formatVideoDuration,
  getKnowledgeTopicDisplayNumber,
  getMaterialReadingTime,
  getMaterialTypeIcon,
  getMaterialTypeLabel,
  getMaterialVideoDuration,
  getStatusLabel,
  hasTargetAudiences,
  slugify,
  sortKnowledgeMaterialGroupsDraftsLast,
  sortKnowledgeMaterialsForCategory,
  sortKnowledgeMaterialsNewestFirst,
} from '../shared/knowledge-utils';
import styles from './KnowledgeTerritoryPage.module.css';
import { KnowledgeTerritorySearchField } from './KnowledgeTerritorySearchField';
import { formatKnowledgePlatformFeedbackBadgeCount } from './hooks/useKnowledgePlatformFeedbackUnreadCount';
import type { KnowledgeTerritoryPageModel } from './hooks/useKnowledgeTerritoryPage';
import { TYPE_FILTERS } from './knowledge-territory-page.constants';
import { KnowledgeTrashModal } from './modals/KnowledgeTrashModal';
import { KNOWLEDGE_TRASH_RETENTION_NOTICE } from './modals/knowledgeTrashRetention';

type KnowledgeTerritoryPageViewProps = {
  model: KnowledgeTerritoryPageModel;
};

function MaterialCard({
  material: m,
  canEdit,
  canParticipate,
  styles: s,
  onToggleFavorite,
  onToggleLike,
  onPublish,
  onDelete,
  onOpenMaterial,
  topicNumber,
}: {
  material: AdminKnowledgeMaterial;
  canEdit: boolean;
  canParticipate: boolean;
  styles: typeof styles;
  onToggleFavorite: (id: string) => void;
  onToggleLike: (id: string) => void;
  onPublish: (id: string) => void;
  onDelete: (target: { type: 'material'; id: string; name: string }) => void;
  onOpenMaterial: () => void;
  topicNumber?: number;
}) {
  const router = useRouter();
  const likeCount = m.likeCount ?? 0;
  const likedByMe = m.likedByMe ?? false;
  const favoritedByMe = m.favoritedByMe ?? false;
  const commentCount = m.commentCount ?? 0;
  const canMarkInteresting = m.status === 'PUBLISHED';
  const canComment = m.status === 'PUBLISHED';
  const isLocked = !canEdit && Boolean(m.sequentialLocked);

  const cardInner = (
    <>
      <div className={s.cardThumb}>
        {isLocked ? (
          <div className={s.cardLockOverlay}>
            <span className={s.cardLockIcon} aria-hidden>
              🔒
            </span>
            <span className={s.cardLockText}>Сначала изучите предыдущий материал</span>
          </div>
        ) : null}
        {favoritedByMe ? <span className={s.favoriteBadge}>🔖</span> : null}
        {likeCount > 0 ? (
          <KnowledgeMaterialInterestingBadge
            materialId={m.id}
            likeCount={likeCount}
            className={s.interestingBadge}
          >
            ★ {likeCount}
          </KnowledgeMaterialInterestingBadge>
        ) : null}
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
        <h3 className={s.cardTitle}>
          {topicNumber != null ? <span className={s.cardTopicNumber}>{topicNumber}.</span> : null}
          {m.title}
        </h3>
        {m.excerpt && <p className={s.cardExcerpt}>{m.excerpt}</p>}
        {(m.type === 'ARTICLE' || m.type === 'VIDEO') &&
        (hasTargetAudiences(m.targetAudiences) ||
          (m.type === 'ARTICLE' && (getMaterialReadingTime(m) || m.myQuizStatus?.hasQuiz)) ||
          (m.type === 'VIDEO' && getMaterialVideoDuration(m))) ? (
          <div className={s.cardTags}>
            {m.targetAudiences?.map((audience) => (
              <span key={audience.id} className={s.cardTag}>
                👥 {audience.label}
              </span>
            ))}
            {m.type === 'ARTICLE' && formatReadingTime(getMaterialReadingTime(m)) ? (
              <span className={s.cardTag}>⏱ {formatReadingTime(getMaterialReadingTime(m))}</span>
            ) : null}
            {m.type === 'VIDEO' && formatVideoDuration(getMaterialVideoDuration(m)) ? (
              <span className={s.cardTag}>
                ⏱ {formatVideoDuration(getMaterialVideoDuration(m))}
              </span>
            ) : null}
            {m.type === 'ARTICLE' && m.myQuizStatus?.hasQuiz ? (
              <span
                className={`${s.cardTag} ${m.myQuizStatus.passed ? s.cardTagSuccess : s.cardTagPending}`}
              >
                {m.myQuizStatus.passed
                  ? `✓ Тест ${m.myQuizStatus.scorePercent}%`
                  : '○ Тест не пройден'}
              </span>
            ) : null}
            {!canEdit && m.studyCompleted ? (
              <span className={`${s.cardTag} ${s.cardTagSuccess}`}>✓ Изучено</span>
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
    </>
  );

  return (
    <article
      key={m.id}
      className={`${s.card} ${favoritedByMe ? s.cardFavorited : ''} ${likeCount > 0 ? s.cardInteresting : ''} ${isLocked ? s.cardLocked : ''}`}
    >
      {isLocked ? (
        <div className={`${s.cardLink} ${s.cardLinkDisabled}`} aria-disabled="true">
          {cardInner}
        </div>
      ) : (
        <Link
          href={`/admin/knowledge/materials/${m.id}`}
          className={s.cardLink}
          onClick={onOpenMaterial}
        >
          {cardInner}
        </Link>
      )}
      <div className={s.cardActions}>
        <AdminTableIconButton
          aria-label={favoritedByMe ? 'Убрать из избранного' : 'Добавить в избранное'}
          title={
            canParticipate
              ? favoritedByMe
                ? 'Убрать из избранного'
                : 'Добавить в избранное — быстрый доступ в разделе «Избранное»'
              : 'Избранное доступно при уровне доступа «Участие»'
          }
          disabled={!canParticipate}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(m.id);
          }}
        >
          <KnowledgeFavoriteIcon favorited={favoritedByMe} />
        </AdminTableIconButton>
        <AdminTableIconButton
          aria-label={likedByMe ? 'Снять отметку «интересный»' : 'Отметить как интересный материал'}
          title={
            canMarkInteresting && canParticipate
              ? likedByMe
                ? `Снять отметку «интересный»${likeCount > 0 ? ` (${likeCount})` : ''}`
                : `Отметить как интересный${likeCount > 0 ? ` — уже отметили: ${likeCount}` : ''}`
              : canMarkInteresting
                ? 'Отметить можно при уровне доступа «Участие»'
                : 'Отметить можно только опубликованные материалы'
          }
          disabled={!canMarkInteresting || !canParticipate}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleLike(m.id);
          }}
        >
          <InterestingMaterialIcon marked={likedByMe} />
        </AdminTableIconButton>
        <AdminTableIconButton
          aria-label={commentCount > 0 ? `Комментарии (${commentCount})` : 'Оставить комментарий'}
          title={
            canComment
              ? commentCount > 0
                ? `Комментарии: ${commentCount}. Перейти к обсуждению материала`
                : 'Оставить комментарий под материалом'
              : 'Комментарии доступны только к опубликованным материалам'
          }
          disabled={!canComment || isLocked}
          onClick={(e) => {
            if (isLocked) return;
            e.preventDefault();
            e.stopPropagation();
            router.push(
              `/admin/knowledge/materials/${m.id}#${KNOWLEDGE_MATERIAL_COMMENTS_SECTION_ID}`
            );
          }}
        >
          <CommentIcon active={commentCount > 0} />
        </AdminTableIconButton>
        {canEdit ? (
          <>
            <AdminTableIconButton
              aria-label="Редактировать"
              title="Редактировать материал"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/admin/knowledge/materials/${m.id}/edit`);
              }}
            >
              <EditIcon />
            </AdminTableIconButton>
            {m.status !== 'PUBLISHED' ? (
              <AdminTableIconButton
                aria-label="Опубликовать"
                title="Опубликовать: материал станет доступен менеджерам и стажёрам"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPublish(m.id);
                }}
              >
                <PublishIcon />
              </AdminTableIconButton>
            ) : null}
            <AdminTableIconButton
              aria-label="В корзину"
              title="В корзину (восстановить можно из корзины в шапке страницы)"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete({ type: 'material', id: m.id, name: m.title });
              }}
            >
              <DeleteIcon />
            </AdminTableIconButton>
          </>
        ) : null}
      </div>
    </article>
  );
}

export function KnowledgeTerritoryPageView({ model }: KnowledgeTerritoryPageViewProps) {
  const {
    canEdit,
    canParticipate,
    canViewTrainingAnalytics,
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
    favoritesOnly,
    setFavoritesOnly,
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
    newCategoryOutlineFile,
    newCategoryOutlineInputRef,
    creatingCategory,
    handleNewCategoryOutlineFileChange,
    editingCategoryId,
    setEditingCategoryId,
    editCategoryName,
    setEditCategoryName,
    editCategorySlug,
    setEditCategorySlug,
    reorderingCategoryId,
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
    reorderingModuleId,
    handleSearchApply,
    handleDelete,
    handlePublish,
    handleToggleFavorite,
    handleToggleLike,
    handleAddCategory,
    handleUpdateCategory,
    handleMoveCategory,
    handleAddModule,
    handleUpdateModule,
    handleMoveModule,
    trashOpen,
    setTrashOpen,
    trashCount,
    feedbackUnreadCount,
    handleTrashRestored,
    persistTerritoryFilters,
    isSuperAdmin,
    categoryAccessModal,
    setCategoryAccessModal,
    openCategoryAccessModal,
  } = model;

  const router = useRouter();

  const handlePickSearchMaterial = useCallback(
    (suggestion: KnowledgeMaterialSearchSuggestion) => {
      persistTerritoryFilters();
      router.push(`/admin/knowledge/materials/${suggestion.slug || suggestion.id}`);
    },
    [persistTerritoryFilters, router]
  );

  const showGroupedByModule =
    Boolean(categoryFilter) && !favoritesOnly && !moduleFilter && !search && modules.length > 0;

  const showTopicNumbers = Boolean(categoryFilter);

  const displayMaterials = useMemo(() => {
    if (!categoryFilter) {
      return sortKnowledgeMaterialsNewestFirst(materials);
    }
    return sortKnowledgeMaterialsForCategory(materials);
  }, [categoryFilter, materials]);

  const groupedMaterials = useMemo(() => {
    if (!showGroupedByModule) return null;

    const groups: Array<{
      key: string;
      module: AdminKnowledgeModule | null;
      items: AdminKnowledgeMaterial[];
    }> = [];

    for (const mod of modules) {
      const items = sortKnowledgeMaterialsForCategory(
        displayMaterials.filter((m) => m.moduleId === mod.id)
      );
      if (items.length > 0) {
        groups.push({ key: mod.id, module: mod, items });
      }
    }

    const unassigned = sortKnowledgeMaterialsForCategory(
      displayMaterials.filter((m) => !m.moduleId)
    );
    if (unassigned.length > 0) {
      groups.push({ key: 'none', module: null, items: unassigned });
    }

    if (groups.length === 0) return null;
    return sortKnowledgeMaterialGroupsDraftsLast(groups);
  }, [showGroupedByModule, modules, displayMaterials]);

  const paginationSlots = useMemo(
    () => buildPaginationPageSlots(totalPages, page),
    [page, totalPages]
  );

  const deleteModalTitle =
    deleteTarget?.type === 'material'
      ? 'Переместить материал в корзину?'
      : deleteTarget?.type === 'module'
        ? 'Переместить модуль в корзину?'
        : 'Переместить категорию в корзину?';

  const deleteModalMessage =
    deleteTarget?.type === 'category'
      ? `Категория «${deleteTarget?.name}» будет перемещена в корзину вместе с модулями внутри неё (без материалов). Восстановить можно из корзины в шапке страницы. ${KNOWLEDGE_TRASH_RETENTION_NOTICE}`
      : deleteTarget?.type === 'module'
        ? `Модуль «${deleteTarget?.name}» будет скрыт из списка. Материалы останутся в категории без этого модуля. ${KNOWLEDGE_TRASH_RETENTION_NOTICE}`
        : `Материал «${deleteTarget?.name}» будет скрыт из списка. ${KNOWLEDGE_TRASH_RETENTION_NOTICE}`;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInfoTip}>
          {canViewTrainingAnalytics ? (
            <Link
              href="/admin/knowledge/analytics"
              className={`${toolbarButtonStyles.button} ${styles.heroInfoTipButton}`}
              title="Статистика обучения"
              aria-label="Статистика обучения"
            >
              <TrainingStatisticsIcon />
            </Link>
          ) : null}
          <KnowledgePlatformInfoTip triggerClassName={toolbarButtonStyles.button} />
          <KnowledgePlatformFeedbackButton
            triggerClassName={toolbarButtonStyles.button}
            canParticipate={canParticipate}
          />
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
        <div className={styles.heroActions}>
          {canEdit ? (
            <span className={styles.feedbackLinkWrap}>
              <Link
                href="/admin/knowledge/feedback"
                className={`${toolbarButtonStyles.button} ${styles.heroToolbarLink}`}
                title={
                  feedbackUnreadCount > 0
                    ? `Обратная связь по платформе (${formatKnowledgePlatformFeedbackBadgeCount(feedbackUnreadCount)} непрочитанных)`
                    : 'Обратная связь по платформе'
                }
                aria-label={
                  feedbackUnreadCount > 0
                    ? `Обратная связь по платформе, непрочитанных сообщений: ${feedbackUnreadCount > 99 ? 'более 99' : feedbackUnreadCount}`
                    : 'Обратная связь по платформе'
                }
              >
                <PlatformFeedbackIcon size={16} />
              </Link>
              {feedbackUnreadCount > 0 ? (
                <span className={styles.feedbackBadge} aria-hidden>
                  {formatKnowledgePlatformFeedbackBadgeCount(feedbackUnreadCount)}
                </span>
              ) : null}
            </span>
          ) : null}
          {canEdit ? (
            <>
              <AdminToolbarTrashButton
                trashCount={trashCount}
                onClick={() => setTrashOpen(true)}
                title="Корзина базы знаний"
                aria-label="Корзина базы знаний"
              />
              <Link
                data-admin-mutation
                href="/admin/knowledge/materials/new"
                className={styles.createButton}
              >
                + Новый материал
              </Link>
            </>
          ) : null}
        </div>
      </header>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      {stats && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.publishedMaterials}</span>
            <span className={styles.statLabel}>
              <span className={styles.statLabelFull}>Опубликовано</span>
              <span className={styles.statLabelShort}>Опубл.</span>
            </span>
          </div>
          {canEdit && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.draftMaterials}</span>
              <span className={styles.statLabel}>
                <span className={styles.statLabelFull}>Черновиков</span>
                <span className={styles.statLabelShort}>Черн.</span>
              </span>
            </div>
          )}
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.videoCount}</span>
            <span className={styles.statLabel}>Видео</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.articleCount}</span>
            <span className={styles.statLabel}>
              <span className={styles.statLabelFull}>Статей</span>
              <span className={styles.statLabelShort}>Ст.</span>
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.categoryCount}</span>
            <span className={styles.statLabel}>
              <span className={styles.statLabelFull}>Категорий</span>
              <span className={styles.statLabelShort}>Кат.</span>
            </span>
          </div>
          {(stats.myFavoritesCount ?? 0) > 0 && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.myFavoritesCount}</span>
              <span className={styles.statLabel}>
                <span className={styles.statLabelFull}>В избранном</span>
                <span className={styles.statLabelShort}>Избр.</span>
              </span>
            </div>
          )}
        </div>
      )}

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Разделы</h2>
          <div className={styles.categoriesList}>
            <button
              type="button"
              className={`${styles.categoryChip} ${!categoryFilter && !favoritesOnly ? styles.categoryChipActive : ''}`}
              onClick={() => setCategoryFilter('')}
            >
              Все материалы
            </button>
            <button
              type="button"
              className={`${styles.categoryChip} ${favoritesOnly ? styles.categoryChipActive : ''}`}
              onClick={() => setFavoritesOnly(true)}
            >
              Избранное
              {(stats?.myFavoritesCount ?? 0) > 0 ? (
                <span className={styles.categoryCount}>{stats?.myFavoritesCount}</span>
              ) : null}
            </button>
          </div>

          <h2 className={styles.sidebarTitle}>Категории</h2>
          <div className={styles.categoriesList}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.categoryChip} ${categoryFilter === cat.id && !favoritesOnly ? styles.categoryChipActive : ''}`}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.name}
                <span className={styles.categoryCount}>{cat._count?.materials ?? 0}</span>
              </button>
            ))}
          </div>

          {categoryFilter && !favoritesOnly && (
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
                      {modules.map((mod, moduleIndex) => (
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
                                  data-admin-mutation
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
                                {modules.length > 1 ? (
                                  <div
                                    className={styles.reorderGroup}
                                    role="group"
                                    aria-label={`Порядок модуля «${mod.name}»`}
                                  >
                                    <button
                                      type="button"
                                      className={styles.reorderBtn}
                                      disabled={
                                        moduleIndex === 0 ||
                                        reorderingModuleId !== null ||
                                        editingModuleId !== null
                                      }
                                      title="Переместить выше"
                                      aria-label="Переместить модуль выше"
                                      onClick={() => void handleMoveModule(mod.id, -1)}
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.reorderBtn}
                                      disabled={
                                        moduleIndex === modules.length - 1 ||
                                        reorderingModuleId !== null ||
                                        editingModuleId !== null
                                      }
                                      title="Переместить ниже"
                                      aria-label="Переместить модуль ниже"
                                      onClick={() => void handleMoveModule(mod.id, 1)}
                                    >
                                      ↓
                                    </button>
                                  </div>
                                ) : null}
                                <AdminTableIconButton
                                  aria-label="Изменить модуль"
                                  title="Изменить название, slug и описание модуля"
                                  onClick={() => {
                                    setEditingModuleId(mod.id);
                                    setEditModuleName(mod.name);
                                    setEditModuleSlug(mod.slug);
                                    setEditModuleDescription(mod.description || '');
                                  }}
                                >
                                  <EditIcon />
                                </AdminTableIconButton>
                                <AdminTableIconButton
                                  aria-label="Модуль в корзину"
                                  title="В корзину: только этот модуль. Материалы останутся в категории без модуля"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'module',
                                      id: mod.id,
                                      name: mod.name,
                                    })
                                  }
                                >
                                  <DeleteIcon />
                                </AdminTableIconButton>
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
                  <div className={styles.outlineImportBlock}>
                    <input
                      ref={newCategoryOutlineInputRef}
                      type="file"
                      accept=".docx,.txt"
                      className={styles.hiddenInput}
                      onChange={(event) =>
                        handleNewCategoryOutlineFileChange(event.target.files?.[0] ?? null)
                      }
                    />
                    <button
                      type="button"
                      className={styles.outlineImportBtn}
                      onClick={() => newCategoryOutlineInputRef.current?.click()}
                      disabled={creatingCategory}
                    >
                      {newCategoryOutlineFile
                        ? `Файл: ${newCategoryOutlineFile.name}`
                        : 'Загрузить план модулей и конспектов (.docx)'}
                    </button>
                    <p className={styles.outlineImportHint}>
                      Формат Word: строки «Модуль 1. Название», опционально описание модуля, затем
                      темы конспектов «Название (краткое описание)». Все конспекты создаются как
                      черновики.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.saveCategoryBtn}
                    onClick={handleAddCategory}
                    disabled={creatingCategory}
                  >
                    {creatingCategory ? 'Создание…' : 'Создать'}
                  </button>
                </div>
              )}
              {categories.length > 0 && (
                <ul className={styles.categoryEditList}>
                  {categories.map((cat, categoryIndex) => (
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
                              data-admin-mutation
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
                            {categories.length > 1 ? (
                              <div
                                className={styles.reorderGroup}
                                role="group"
                                aria-label={`Порядок категории «${cat.name}»`}
                              >
                                <button
                                  type="button"
                                  className={styles.reorderBtn}
                                  disabled={
                                    categoryIndex === 0 ||
                                    reorderingCategoryId !== null ||
                                    editingCategoryId !== null
                                  }
                                  title="Переместить выше"
                                  aria-label="Переместить категорию выше"
                                  onClick={() => void handleMoveCategory(cat.id, -1)}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className={styles.reorderBtn}
                                  disabled={
                                    categoryIndex === categories.length - 1 ||
                                    reorderingCategoryId !== null ||
                                    editingCategoryId !== null
                                  }
                                  title="Переместить ниже"
                                  aria-label="Переместить категорию ниже"
                                  onClick={() => void handleMoveCategory(cat.id, 1)}
                                >
                                  ↓
                                </button>
                              </div>
                            ) : null}
                            {isSuperAdmin ? (
                              <AdminTableIconButton
                                aria-label={`Доступ к категории «${cat.name}»`}
                                title={`Доступ: настройки видимости категории «${cat.name}» для ролей и пользователей`}
                                onClick={() => openCategoryAccessModal(cat)}
                              >
                                <AdminAccessIcon size={16} />
                              </AdminTableIconButton>
                            ) : null}
                            <AdminTableIconButton
                              aria-label="Изменить категорию"
                              title="Изменить название и адрес (slug) категории"
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditCategoryName(cat.name);
                                setEditCategorySlug(cat.slug);
                              }}
                            >
                              <EditIcon />
                            </AdminTableIconButton>
                            <AdminTableIconButton
                              aria-label="Категорию в корзину"
                              disabled={(cat._count?.materials ?? 0) > 0}
                              title={
                                (cat._count?.materials ?? 0) > 0
                                  ? `Нельзя удалить: в категории есть материалы (${cat._count?.materials ?? 0} шт.). Сначала переместите их в другую категорию или в корзину`
                                  : `В корзину: категория «${cat.name}» и её модули без материалов. Восстановить можно из корзины в шапке`
                              }
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'category',
                                  id: cat.id,
                                  name: cat.name,
                                })
                              }
                            >
                              <DeleteIcon />
                            </AdminTableIconButton>
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
            <KnowledgeTerritorySearchField
              searchInput={searchInput}
              onSearchInputChange={setSearchInput}
              onSearchApply={handleSearchApply}
              onPickMaterial={handlePickSearchMaterial}
              categoryId={categoryFilter || undefined}
              moduleId={moduleFilter || undefined}
              type={typeFilter || undefined}
            />

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
                {favoritesOnly
                  ? 'Добавляйте материалы в избранное с помощью иконки закладки на карточке.'
                  : canEdit
                    ? 'Добавьте первый обучающий материал или измените фильтры поиска.'
                    : 'Пока нет опубликованных материалов в этой категории.'}
              </p>
              {canEdit && (
                <Link href="/admin/knowledge/materials/new" className={styles.createButton}></Link>
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
                      {group.items.map((m, index) => (
                        <MaterialCard
                          key={m.id}
                          material={m}
                          canEdit={canEdit}
                          canParticipate={canParticipate}
                          styles={styles}
                          onToggleFavorite={handleToggleFavorite}
                          onToggleLike={handleToggleLike}
                          onPublish={handlePublish}
                          onDelete={setDeleteTarget}
                          onOpenMaterial={persistTerritoryFilters}
                          topicNumber={
                            showTopicNumbers ? getKnowledgeTopicDisplayNumber(m, index) : undefined
                          }
                        />
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className={styles.grid}>
                  {displayMaterials.map((m, index) => (
                    <MaterialCard
                      key={m.id}
                      material={m}
                      canEdit={canEdit}
                      canParticipate={canParticipate}
                      styles={styles}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleLike={handleToggleLike}
                      onPublish={handlePublish}
                      onDelete={setDeleteTarget}
                      onOpenMaterial={persistTerritoryFilters}
                      topicNumber={
                        showTopicNumbers ? getKnowledgeTopicDisplayNumber(m, index) : undefined
                      }
                    />
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Пагинация материалов">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className={styles.pageBtn}
                    aria-label="Предыдущая страница"
                  >
                    ← Назад
                  </button>
                  <div className={styles.pageNumbers}>
                    {paginationSlots.map((slot, index) =>
                      slot === 'ellipsis' ? (
                        <span key={`ellipsis-${index}`} className={styles.pageEllipsis} aria-hidden>
                          …
                        </span>
                      ) : (
                        <button
                          key={slot}
                          type="button"
                          className={`${styles.pageNumberBtn} ${
                            slot === page ? styles.pageNumberBtnActive : ''
                          }`}
                          onClick={() => setPage(slot)}
                          aria-label={`Страница ${slot}`}
                          aria-current={slot === page ? 'page' : undefined}
                        >
                          {slot}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className={styles.pageBtn}
                    aria-label="Следующая страница"
                  >
                    Вперёд →
                  </button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title={deleteModalTitle}
        message={deleteModalMessage}
        confirmText={deleting ? 'Подождите…' : 'В корзину'}
        cancelText="Отмена"
        onConfirm={handleDelete}
        onClose={() => !deleting && setDeleteTarget(null)}
        variant="danger"
      />

      <KnowledgeTrashModal
        isOpen={trashOpen}
        onClose={() => setTrashOpen(false)}
        onRestored={handleTrashRestored}
      />

      {categoryAccessModal && typeof document !== 'undefined'
        ? createPortal(
            <AccessModal
              resourceId={categoryAccessModal.resourceId}
              resourceLabel={categoryAccessModal.label}
              onClose={() => setCategoryAccessModal(null)}
            />,
            document.body
          )
        : null}
    </div>
  );
}
