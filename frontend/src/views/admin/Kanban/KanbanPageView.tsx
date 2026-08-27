'use client';

import { type CSSProperties, useState } from 'react';

import type { KanbanCardPriority, KanbanColumn } from '@/shared/api/kanban/admin-kanban';
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
import {
  PRIORITY_LABELS,
  checklistProgress,
  formatDueDate,
  formatKanbanUser,
  isOverdue,
  userInitials,
} from './kanban.utils';
import { KanbanBoardModal } from './modals/KanbanBoardModal';
import { KanbanCardModal } from './modals/KanbanCardModal';
import { KanbanColumnModal } from './modals/KanbanColumnModal';
import { KanbanDeleteBoardModal } from './modals/KanbanDeleteBoardModal';
import { KanbanDeleteColumnModal } from './modals/KanbanDeleteColumnModal';
import { KanbanTrashModal } from './modals/KanbanTrashModal';

type Props = { model: KanbanPageModel };

export function KanbanPageView({ model }: Props) {
  const {
    canEdit,
    boards,
    board,
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

  const cardsCount = board?.columns.reduce((sum, col) => sum + col.cards.length, 0) ?? 0;
  const boardTitle = board?.name ?? 'Канбан-доска';

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={`${cdHub.editorHeader} ${styles.header}`}>
        <div className={`${cdHub.contractsListHeaderLeft} ${styles.headerLeft}`}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={`${cdHub.title} ${styles.title}`}>{boardTitle}</h1>
                <KanbanRulesInfoTip />
              </div>
              <span
                className={`${cdHub.contractsListCount} ${styles.count}`}
                title={`${cardsCount} карточек`}
              >
                <span className={cdHub.contractsListCountDesktop}>{cardsCount} карточек</span>
                <span className={cdHub.contractsListCountMobile}>{cardsCount}</span>
              </span>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>
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
        <div className={`${cdChrome.headerButtonsRow} ${styles.headerActions}`}>
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
          <div className={`${cdHub.contractsListFilters} ${styles.filters}`}>
            <label className={`${cdHub.contractsListDateLabel} ${styles.filterLabel}`}>
              <span className={cdHub.contractsListDateLabelText}>Доска</span>
              <select
                value={selectedBoardId ?? ''}
                onChange={(e) => void selectBoard(e.target.value)}
                disabled={loading || busy}
                className={contractsListFilterFieldClass(
                  `${cdHub.contractsListDateInput} ${styles.filterField}`,
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

            <label className={`${cdHub.contractsListDateLabel} ${styles.filterLabel}`}>
              <span className={cdHub.contractsListDateLabelText}>Поиск</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="По карточкам..."
                className={contractsListFilterFieldClass(
                  `${cdHub.contractsListDateInput} ${styles.filterSearch}`,
                  Boolean(search.trim()),
                  cdHub.contractsListFilterActive
                )}
                aria-label="Поиск по карточкам"
              />
            </label>

            <label className={`${cdHub.contractsListDateLabel} ${styles.filterLabel}`}>
              <span className={cdHub.contractsListDateLabelText}>Приоритет</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as KanbanCardPriority | '')}
                className={contractsListFilterFieldClass(
                  `${cdHub.contractsListDateInput} ${styles.filterField}`,
                  Boolean(priorityFilter),
                  cdHub.contractsListFilterActive
                )}
                aria-label="Фильтр приоритета"
              >
                <option value="">Все</option>
                {(Object.keys(PRIORITY_LABELS) as KanbanCardPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>

            <label className={`${cdHub.contractsListDateLabel} ${styles.filterLabel}`}>
              <span className={cdHub.contractsListDateLabelText}>Исполнитель</span>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className={contractsListFilterFieldClass(
                  `${cdHub.contractsListDateInput} ${styles.filterField}`,
                  Boolean(assigneeFilter),
                  cdHub.contractsListFilterActive
                )}
                aria-label="Фильтр исполнителя"
              >
                <option value="">Все</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatKanbanUser(u)}
                  </option>
                ))}
              </select>
            </label>

            <label className={`${cdHub.contractsListDateLabel} ${styles.filterLabel}`}>
              <span className={cdHub.contractsListDateLabelText}>Метка</span>
              <select
                value={labelFilter}
                onChange={(e) => setLabelFilter(e.target.value)}
                className={contractsListFilterFieldClass(
                  `${cdHub.contractsListDateInput} ${styles.filterField}`,
                  Boolean(labelFilter),
                  cdHub.contractsListFilterActive
                )}
                aria-label="Фильтр метки"
              >
                <option value="">Все</option>
                {allLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.board}>
            {board.columns.map((column) => (
              <ColumnView
                key={column.id}
                column={column}
                canEdit={canEdit}
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
                canDeleteColumn={canEdit && column.cards.length === 0 && board.columns.length > 1}
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
          if (!canEdit) return;
          e.preventDefault();
          onDragOverColumn();
        }}
        onDrop={(e) => {
          if (!canEdit) return;
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
            draggable={canEdit}
            onDragStart={() => onDragStart(card.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              e.stopPropagation();
              onDragOverColumn();
            }}
            onDrop={(e) => {
              if (!canEdit) return;
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
