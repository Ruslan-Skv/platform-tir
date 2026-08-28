'use client';

import { type CSSProperties, useCallback, useMemo, useState } from 'react';

import type { KanbanCardPriority, KanbanColumn } from '@/shared/api/kanban/admin-kanban';
import { useAdminNarrowViewport } from '@/shared/lib/hooks/useAdminNarrowViewport';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import {
  AdminListRefreshButton,
  AdminToolbarTrashButton,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import { contractsListFilterFieldClass } from '@/views/admin/ContractDocuments/packages/pages/contracts/list/contractsListFormatters';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from './KanbanPage.module.css';
import { KanbanRulesInfoTip } from './KanbanRulesInfoTip';
import type { KanbanPageModel } from './hooks/useKanbanPage';
import { KanbanMobileCards } from './list/KanbanMobileCards';
import { KanbanBoardModal } from './modals/KanbanBoardModal';
import { KanbanCardModal } from './modals/KanbanCardModal';
import { KanbanColumnModal } from './modals/KanbanColumnModal';
import { KanbanDeleteBoardModal } from './modals/KanbanDeleteBoardModal';
import { KanbanDeleteColumnModal } from './modals/KanbanDeleteColumnModal';
import { KanbanTrashModal } from './modals/KanbanTrashModal';
import {
  PRIORITY_LABELS,
  checklistProgress,
  formatDueDate,
  formatKanbanUser,
  isOverdue,
  userInitials,
} from './shared/kanban.utils';

type Props = { model: KanbanPageModel };
type ViewMode = 'board' | 'list';
type PriorityFilter = KanbanCardPriority | '';

const KANBAN_VIEW_MODE_KEY = 'admin_kanban_view_mode';

function filterChipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function cardMatchesBaseFilters(
  card: { title: string; description?: string | null; labels: string[]; assigneeId: string | null },
  q: string,
  assigneeFilter: string,
  labelFilter: string
): boolean {
  if (assigneeFilter && card.assigneeId !== assigneeFilter) return false;
  if (labelFilter && !card.labels.includes(labelFilter)) return false;
  if (!q) return true;
  const hay = `${card.title} ${card.description ?? ''} ${card.labels.join(' ')}`.toLowerCase();
  return hay.includes(q);
}

export function KanbanPageView({ model }: Props) {
  const {
    canEdit,
    boards,
    board,
    rawBoard,
    selectedBoardId,
    users,
    loading,
    busy,
    errorMessage,
    reload,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    search,
    setSearch,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    labelFilter,
    setLabelFilter,
    allLabels,
    selectedCard,
    selectedCardColumn,
    setSelectedCardId,
    creatingInColumnId,
    newCardTitle,
    setNewCardTitle,
    startQuickCreate,
    submitQuickCreate,
    setCreatingInColumnId,
    boardModalOpen,
    setBoardModalOpen,
    boardModalMode,
    boardFormName,
    setBoardFormName,
    boardFormDescription,
    setBoardFormDescription,
    openCreateBoard,
    openRenameBoard,
    submitBoard,
    openDeleteBoard,
    confirmDeleteBoard,
    deleteBoardModalOpen,
    setDeleteBoardModalOpen,
    selectBoard,
    columnModalOpen,
    setColumnModalOpen,
    editingColumn,
    columnFormName,
    setColumnFormName,
    columnFormColor,
    setColumnFormColor,
    columnFormWip,
    setColumnFormWip,
    openCreateColumn,
    openEditColumn,
    submitColumn,
    openDeleteColumn,
    confirmDeleteColumn,
    columnToDelete,
    setColumnToDelete,
    moveCardOptimistic,
    saveCard,
    removeCard,
    postComment,
    removeComment,
    toggleChecklistItem,
    addChecklistItem,
  } = model;

  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [viewModeState, setViewModeState] = useState<ViewMode>(() =>
    typeof window !== 'undefined' && localStorage.getItem(KANBAN_VIEW_MODE_KEY) === 'list'
      ? 'list'
      : 'board'
  );
  const isNarrow = useAdminNarrowViewport();

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(KANBAN_VIEW_MODE_KEY, mode);
  }, []);

  const cardsCount = board?.columns.reduce((sum, col) => sum + col.cards.length, 0) ?? 0;
  const boardTitle = board?.name ?? 'Канбан-доска';
  const searchQuery = search.trim().toLowerCase();

  const cardsForFilterCounts = useMemo(() => {
    if (!rawBoard) return [];
    return rawBoard.columns
      .flatMap((col) => col.cards)
      .filter((card) => cardMatchesBaseFilters(card, searchQuery, assigneeFilter, labelFilter));
  }, [rawBoard, searchQuery, assigneeFilter, labelFilter]);

  const priorityCounts = useMemo(() => {
    const priorities = Object.keys(PRIORITY_LABELS) as KanbanCardPriority[];
    return {
      '': cardsForFilterCounts.length,
      ...Object.fromEntries(
        priorities.map((priority) => [
          priority,
          cardsForFilterCounts.filter((card) => card.priority === priority).length,
        ])
      ),
    } as Record<PriorityFilter, number>;
  }, [cardsForFilterCounts]);

  const assigneeCounts = useMemo(() => {
    const counts: Record<string, number> = { '': cardsForFilterCounts.length };
    for (const user of users) {
      counts[user.id] = cardsForFilterCounts.filter((card) => card.assigneeId === user.id).length;
    }
    return counts;
  }, [cardsForFilterCounts, users]);

  const labelCounts = useMemo(() => {
    const counts: Record<string, number> = { '': cardsForFilterCounts.length };
    for (const label of allLabels) {
      counts[label] = cardsForFilterCounts.filter((card) => card.labels.includes(label)).length;
    }
    return counts;
  }, [allLabels, cardsForFilterCounts]);

  const mobileListItems = useMemo(() => {
    if (!board) return [];
    return board.columns.flatMap((col) =>
      col.cards.map((card) => ({
        card,
        columnName: col.name,
        columnColor: col.color || '#64748b',
      }))
    );
  }, [board]);

  const countTitle =
    cardsCount === (rawBoard?.columns.reduce((sum, col) => sum + col.cards.length, 0) ?? 0)
      ? `${cardsCount} карточек`
      : `${cardsCount} из ${rawBoard?.columns.reduce((sum, col) => sum + col.cards.length, 0) ?? 0} карточек`;

  return (
    <div
      className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage} ${styles.kanbanPage}`}
    >
      <div className={`${cdHub.editorHeader} ${styles.header}`}>
        <div className={`${cdHub.contractsListHeaderLeft} ${styles.headerLeft}`}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={`${cdHub.title} ${styles.title}`}>{boardTitle}</h1>
                <KanbanRulesInfoTip />
              </div>
              <span className={`${cdHub.contractsListCount} ${styles.count}`} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{cardsCount}</span>
              </span>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={loading || busy}
                busy={loading}
                title="Обновить"
                aria-label={loading ? 'Обновление доски' : 'Обновить доску'}
                onClick={() => void reload()}
              />
              <AdminToolbarTrashButton
                trashCount={trashCount}
                onClick={() => setTrashOpen(true)}
                title="Корзина канбан-досок"
                aria-label="Корзина канбан-досок"
              />
            </div>
          </div>
        </div>
        <div
          className={`${cdChrome.headerButtonsRow} ${styles.headerActions} ${styles.headerActionsDesktop}`}
        >
          {canEdit ? (
            <>
              <button
                type="button"
                className={cdChrome.contractsListHeaderAddBtn}
                disabled={busy}
                onClick={openCreateBoard}
              >
                + Новая доска
              </button>
              {board ? (
                <>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={busy}
                    onClick={openRenameBoard}
                  >
                    Переименовать
                  </button>
                  <button
                    type="button"
                    className={cdChrome.contractsListHeaderAddBtn}
                    disabled={busy}
                    onClick={openCreateColumn}
                  >
                    + Колонка
                  </button>
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    disabled={busy}
                    onClick={openDeleteBoard}
                  >
                    Удалить доску
                  </button>
                </>
              ) : null}
            </>
          ) : null}
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminToolbarTrashButton
              trashCount={trashCount}
              onClick={() => setTrashOpen(true)}
              title="Корзина канбан-досок"
              aria-label="Корзина канбан-досок"
            />
            <AdminListRefreshButton
              disabled={loading || busy}
              busy={loading}
              title="Обновить"
              aria-label={loading ? 'Обновление доски' : 'Обновить доску'}
              onClick={() => void reload()}
            />
          </div>
        </div>
      </div>

      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      {loading && !board ? (
        <p className={styles.loading}>Загрузка канбан-доски...</p>
      ) : !board ? (
        <div className={styles.emptyState}>
          <h2>Пока нет досок</h2>
          <p>
            Создайте первую канбан-доску — колонки «Бэклог → В работе → На проверке → Готово»
            появятся автоматически.
          </p>
          {canEdit ? (
            <button
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              onClick={openCreateBoard}
              disabled={busy}
            >
              + Создать доску
            </button>
          ) : (
            <p className={styles.emptyHint}>Нет доступа на создание досок.</p>
          )}
        </div>
      ) : (
        <>
          <div className={styles.viewModeRow} role="group" aria-label="Режим отображения">
            <button
              type="button"
              className={`${styles.viewModeBtn} ${styles.viewModeBtnBoard}${
                viewModeState === 'board' ? ` ${styles.viewModeBtnActive}` : ''
              }`}
              onClick={() => setViewMode('board')}
            >
              Доска
            </button>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${styles.viewModeBtnList}${
                viewModeState === 'list' ? ` ${styles.viewModeBtnActive}` : ''
              }`}
              onClick={() => setViewMode('list')}
            >
              Список
            </button>
          </div>

          <div className={cdHub.contractsListFiltersPanel}>
            <div className={cdHub.contractsListFiltersStack}>
              <div
                className={cdHub.contractsListDateFilters}
                role="group"
                aria-label="Доска и поиск"
              >
                <label className={cdHub.contractsListDateLabel}>
                  <span className={cdHub.contractsListDateLabelText}>Доска</span>
                  <select
                    value={selectedBoardId ?? ''}
                    onChange={(e) => void selectBoard(e.target.value)}
                    disabled={loading || busy}
                    className={contractsListFilterFieldClass(
                      cdHub.contractsListDateInput,
                      Boolean(selectedBoardId),
                      cdHub.contractsListFilterActive
                    )}
                    aria-label="Выбор доски"
                  >
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.cardsCount})
                      </option>
                    ))}
                  </select>
                </label>
                <label className={cdHub.contractsListDateLabel}>
                  <span className={cdHub.contractsListDateLabelText}>Поиск</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="По карточкам..."
                    disabled={loading || busy}
                    className={contractsListFilterFieldClass(
                      cdHub.contractsListDateInput,
                      Boolean(search.trim()),
                      cdHub.contractsListFilterActive
                    )}
                    aria-label="Поиск по карточкам"
                  />
                </label>
              </div>

              <div className={cdHub.contractsListChipRow} role="group" aria-label="Приоритет">
                <span className={cdHub.contractsListChipRowLabel}>Приоритет</span>
                <button
                  type="button"
                  disabled={loading || busy}
                  className={filterChipClass(!priorityFilter)}
                  onClick={() => setPriorityFilter('')}
                >
                  Все ({priorityCounts['']})
                </button>
                {(Object.keys(PRIORITY_LABELS) as KanbanCardPriority[]).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    disabled={loading || busy}
                    className={filterChipClass(priorityFilter === priority)}
                    onClick={() => setPriorityFilter(priority)}
                  >
                    {PRIORITY_LABELS[priority]} ({priorityCounts[priority]})
                  </button>
                ))}
              </div>

              {users.length > 0 ? (
                <div className={cdHub.contractsListChipRow} role="group" aria-label="Исполнитель">
                  <span className={cdHub.contractsListChipRowLabel}>Исполнитель</span>
                  <button
                    type="button"
                    disabled={loading || busy}
                    className={filterChipClass(!assigneeFilter)}
                    onClick={() => setAssigneeFilter('')}
                  >
                    Все ({assigneeCounts['']})
                  </button>
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      disabled={loading || busy}
                      className={filterChipClass(assigneeFilter === user.id)}
                      onClick={() => setAssigneeFilter(user.id)}
                    >
                      {formatKanbanUser(user)} ({assigneeCounts[user.id] ?? 0})
                    </button>
                  ))}
                </div>
              ) : null}

              {allLabels.length > 0 ? (
                <div className={cdHub.contractsListChipRow} role="group" aria-label="Метка">
                  <span className={cdHub.contractsListChipRowLabel}>Метка</span>
                  <button
                    type="button"
                    disabled={loading || busy}
                    className={filterChipClass(!labelFilter)}
                    onClick={() => setLabelFilter('')}
                  >
                    Все ({labelCounts['']})
                  </button>
                  {allLabels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      disabled={loading || busy}
                      className={filterChipClass(labelFilter === label)}
                      onClick={() => setLabelFilter(label)}
                    >
                      {label} ({labelCounts[label] ?? 0})
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.viewPanels}>
            <div
              className={`${styles.viewPanel} ${styles.viewPanelBoard}${
                viewModeState === 'board' ? ` ${styles.viewPanelActive}` : ''
              }`}
              aria-hidden={viewModeState !== 'board'}
            >
              <div className={styles.board}>
                {board.columns.map((column) => (
                  <ColumnView
                    key={column.id}
                    column={column}
                    canEdit={canEdit}
                    enableDrag={canEdit && viewModeState === 'board' && !isNarrow}
                    busy={busy}
                    dragCardId={dragCardId}
                    dragOverColumnId={dragOverColumnId}
                    creatingInColumnId={creatingInColumnId}
                    newCardTitle={newCardTitle}
                    setNewCardTitle={setNewCardTitle}
                    onStartCreate={() => startQuickCreate(column.id)}
                    onCancelCreate={() => setCreatingInColumnId(null)}
                    onSubmitCreate={submitQuickCreate}
                    onEditColumn={() => openEditColumn(column)}
                    onRemoveColumn={() => openDeleteColumn(column)}
                    canDeleteColumn={
                      canEdit && column.cards.length === 0 && board.columns.length > 1
                    }
                    onOpenCard={(id) => setSelectedCardId(id)}
                    onDragStart={(id) => setDragCardId(id)}
                    onDragEnd={() => {
                      setDragCardId(null);
                      setDragOverColumnId(null);
                    }}
                    onDragOverColumn={() => setDragOverColumnId(column.id)}
                    onDropCard={(sortOrder) => {
                      if (!dragCardId) return;
                      void moveCardOptimistic(dragCardId, column.id, sortOrder);
                      setDragCardId(null);
                      setDragOverColumnId(null);
                    }}
                  />
                ))}
              </div>
            </div>
            <div
              className={`${styles.viewPanel} ${styles.viewPanelList}${
                viewModeState === 'list' ? ` ${styles.viewPanelActive}` : ''
              }`}
              aria-hidden={viewModeState !== 'list'}
            >
              <KanbanMobileCards
                items={mobileListItems}
                loading={loading}
                onOpenCard={(id) => setSelectedCardId(id)}
              />
            </div>
          </div>
        </>
      )}

      <KanbanBoardModal
        open={boardModalOpen}
        busy={busy}
        mode={boardModalMode}
        name={boardFormName}
        description={boardFormDescription}
        onNameChange={setBoardFormName}
        onDescriptionChange={setBoardFormDescription}
        onClose={() => setBoardModalOpen(false)}
        onSubmit={submitBoard}
      />

      <KanbanDeleteBoardModal
        open={deleteBoardModalOpen}
        busy={busy}
        boardName={board?.name ?? ''}
        onClose={() => setDeleteBoardModalOpen(false)}
        onConfirm={confirmDeleteBoard}
      />

      <KanbanDeleteColumnModal
        open={Boolean(columnToDelete)}
        busy={busy}
        columnName={columnToDelete?.name ?? ''}
        onClose={() => setColumnToDelete(null)}
        onConfirm={confirmDeleteColumn}
      />

      <KanbanTrashModal
        isOpen={trashOpen}
        onClose={() => {
          setTrashOpen(false);
          void refreshTrashCount();
        }}
        onRestored={() => {
          void reload();
          void refreshTrashCount();
        }}
      />

      <KanbanColumnModal
        open={columnModalOpen}
        busy={busy}
        isEdit={Boolean(editingColumn)}
        name={columnFormName}
        color={columnFormColor}
        wipLimit={columnFormWip}
        onNameChange={setColumnFormName}
        onColorChange={setColumnFormColor}
        onWipLimitChange={setColumnFormWip}
        onClose={() => setColumnModalOpen(false)}
        onSubmit={submitColumn}
      />

      <KanbanCardModal
        open={Boolean(selectedCard)}
        card={selectedCard}
        columnName={selectedCardColumn?.name ?? ''}
        canEdit={canEdit}
        busy={busy}
        users={users}
        onClose={() => setSelectedCardId(null)}
        onSave={(payload) => {
          if (!selectedCard) return;
          void saveCard(selectedCard.id, payload);
        }}
        onDelete={() => {
          if (!selectedCard) return;
          void removeCard(selectedCard.id);
        }}
        onPostComment={async (body) => {
          if (!selectedCard) return;
          await postComment(selectedCard.id, body);
        }}
        onRemoveComment={(commentId) => {
          if (!selectedCard) return;
          void removeComment(selectedCard.id, commentId);
        }}
        onToggleChecklist={(itemId) => {
          if (!selectedCard) return;
          void toggleChecklistItem(selectedCard, itemId);
        }}
        onAddChecklist={async (text) => {
          if (!selectedCard) return;
          await addChecklistItem(selectedCard, text);
        }}
      />
    </div>
  );
}

function ColumnView({
  column,
  canEdit,
  enableDrag,
  busy,
  dragCardId,
  dragOverColumnId,
  creatingInColumnId,
  newCardTitle,
  setNewCardTitle,
  onStartCreate,
  onCancelCreate,
  onSubmitCreate,
  onEditColumn,
  onRemoveColumn,
  canDeleteColumn,
  onOpenCard,
  onDragStart,
  onDragEnd,
  onDragOverColumn,
  onDropCard,
}: {
  column: KanbanColumn;
  canEdit: boolean;
  enableDrag: boolean;
  busy: boolean;
  dragCardId: string | null;
  dragOverColumnId: string | null;
  creatingInColumnId: string | null;
  newCardTitle: string;
  setNewCardTitle: (v: string) => void;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onSubmitCreate: () => void;
  onEditColumn: () => void;
  onRemoveColumn: () => void;
  canDeleteColumn: boolean;
  onOpenCard: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverColumn: () => void;
  onDropCard: (sortOrder: number) => void;
}) {
  const overLimit = column.wipLimit != null && column.cards.length > column.wipLimit;
  const accentStyle = {
    ['--kanban-column-accent' as string]: column.color || '#64748b',
  } as CSSProperties;

  return (
    <section className={styles.column} style={accentStyle}>
      <header className={styles.columnHeader}>
        <div className={styles.columnTitleRow}>
          <span className={styles.columnAccent} aria-hidden />
          <h2 className={styles.columnName}>{column.name}</h2>
        </div>
        <div className={styles.columnMeta}>
          <span className={`${styles.badge} ${overLimit ? styles.badgeWarn : ''}`}>
            {column.wipLimit != null
              ? `${column.cards.length}/${column.wipLimit}`
              : column.cards.length}
          </span>
          {canEdit ? (
            <>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={onEditColumn}
                title="Настройки колонки"
              >
                ⚙
              </button>
              {canDeleteColumn ? (
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={onRemoveColumn}
                  title="Удалить пустую колонку"
                >
                  ×
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </header>

      <div
        className={`${styles.columnBody} ${
          dragOverColumnId === column.id ? styles.columnBodyDragOver : ''
        }`}
        onDragOver={(e) => {
          if (!enableDrag) return;
          e.preventDefault();
          onDragOverColumn();
        }}
        onDrop={(e) => {
          if (!enableDrag) return;
          e.preventDefault();
          onDropCard(
            column.cards.length > 0 ? Math.max(...column.cards.map((c) => c.sortOrder)) + 1 : 0
          );
        }}
      >
        {column.cards.map((card) => (
          <article
            key={card.id}
            className={`${styles.card} ${dragCardId === card.id ? styles.cardDragging : ''}`}
            draggable={enableDrag}
            onDragStart={() => onDragStart(card.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => {
              if (!enableDrag) return;
              e.preventDefault();
              e.stopPropagation();
              onDragOverColumn();
            }}
            onDrop={(e) => {
              if (!enableDrag) return;
              e.preventDefault();
              e.stopPropagation();
              onDropCard(card.sortOrder);
            }}
            onClick={() => onOpenCard(card.id)}
          >
            <h3 className={styles.cardTitle}>{card.title}</h3>
            {card.labels.length > 0 ? (
              <div className={styles.cardLabels}>
                {card.labels.map((label) => (
                  <span key={label} className={styles.labelChip}>
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
            <div className={styles.cardMeta}>
              <div className={styles.cardMetaLeft}>
                <span className={`${styles.priority} ${styles[`priority${card.priority}`]}`}>
                  {PRIORITY_LABELS[card.priority]}
                </span>
                {card.dueDate ? (
                  <span
                    className={`${styles.due} ${isOverdue(card.dueDate) ? styles.dueOverdue : ''}`}
                  >
                    {formatDueDate(card.dueDate)}
                  </span>
                ) : null}
                {(() => {
                  const progress = checklistProgress(card.checklist);
                  return progress ? (
                    <span className={styles.checklistMini}>
                      ✓ {progress.done}/{progress.total}
                    </span>
                  ) : null;
                })()}
              </div>
              {card.assignee ? (
                <span className={styles.avatar} title={formatKanbanUser(card.assignee)}>
                  {userInitials(card.assignee)}
                </span>
              ) : null}
            </div>
          </article>
        ))}

        {canEdit ? (
          creatingInColumnId === column.id ? (
            <div className={styles.quickAdd}>
              <input
                className={`${cdHub.contractsListDateInput}`}
                autoFocus
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void onSubmitCreate();
                  if (e.key === 'Escape') onCancelCreate();
                }}
                placeholder="Название карточки"
              />
              <div className={styles.quickAddActions}>
                <button
                  type="button"
                  className={cdChrome.contractsListHeaderAddBtn}
                  onClick={() => void onSubmitCreate()}
                  disabled={busy || !newCardTitle.trim()}
                >
                  Добавить
                </button>
                <button type="button" className={styles.secondaryBtn} onClick={onCancelCreate}>
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`${styles.secondaryBtn} ${styles.addCardBtn}`}
              onClick={onStartCreate}
            >
              + Карточка
            </button>
          )
        ) : null}
      </div>
    </section>
  );
}
