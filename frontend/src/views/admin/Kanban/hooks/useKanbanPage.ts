'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminSectionPermission } from '@/features/admin';
import { type AdminUserItem, getAdminAccessUsers } from '@/shared/api/admin-access';
import {
  type KanbanBoardDetail,
  type KanbanBoardSummary,
  type KanbanCard,
  type KanbanCardPriority,
  type KanbanChecklistItem,
  type KanbanColumn,
  addKanbanComment,
  createKanbanBoard,
  createKanbanCard,
  createKanbanColumn,
  deleteKanbanBoard,
  deleteKanbanCard,
  deleteKanbanColumn,
  deleteKanbanComment,
  getKanbanBoard,
  getKanbanTrashCount,
  listKanbanBoards,
  moveKanbanCard,
  updateKanbanBoard,
  updateKanbanCard,
  updateKanbanColumn,
} from '@/shared/api/kanban/admin-kanban';

import { newChecklistId } from '../kanban.utils';

export type KanbanPageModel = ReturnType<typeof useKanbanPage>;

export function useKanbanPage() {
  const { canEdit } = useAdminSectionPermission();

  const [boards, setBoards] = useState<KanbanBoardSummary[]>([]);
  const [board, setBoard] = useState<KanbanBoardDetail | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<KanbanCardPriority | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [creatingInColumnId, setCreatingInColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [boardModalMode, setBoardModalMode] = useState<'create' | 'rename'>('create');
  const [boardFormName, setBoardFormName] = useState('');
  const [boardFormDescription, setBoardFormDescription] = useState('');
  const [deleteBoardModalOpen, setDeleteBoardModalOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<KanbanColumn | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [columnFormName, setColumnFormName] = useState('');
  const [columnFormColor, setColumnFormColor] = useState('#64748b');
  const [columnFormWip, setColumnFormWip] = useState('');

  const refreshTrashCount = useCallback(async () => {
    try {
      setTrashCount(await getKanbanTrashCount());
    } catch {
      setTrashCount(0);
    }
  }, []);

  const loadBoards = useCallback(async () => {
    const list = await listKanbanBoards();
    setBoards(list);
    return list;
  }, []);

  const loadBoard = useCallback(async (boardId: string) => {
    const detail = await getKanbanBoard(boardId);
    setBoard(detail);
    setSelectedBoardId(detail.id);
    return detail;
  }, []);

  useEffect(() => {
    void refreshTrashCount();
  }, [refreshTrashCount]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [list, accessUsers] = await Promise.all([
          listKanbanBoards(),
          getAdminAccessUsers().catch(() => [] as AdminUserItem[]),
        ]);
        if (cancelled) return;
        setBoards(list);
        setUsers(accessUsers);
        if (list.length > 0) {
          const detail = await getKanbanBoard(list[0].id);
          if (cancelled) return;
          setBoard(detail);
          setSelectedBoardId(detail.id);
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e instanceof Error ? e.message : 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allLabels = useMemo(() => {
    if (!board) return [];
    const set = new Set<string>();
    for (const col of board.columns) {
      for (const card of col.cards) {
        for (const label of card.labels) set.add(label);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [board]);

  const filteredBoard = useMemo(() => {
    if (!board) return null;
    const q = search.trim().toLowerCase();
    const columns = board.columns.map((col) => ({
      ...col,
      cards: col.cards.filter((card) => {
        if (priorityFilter && card.priority !== priorityFilter) return false;
        if (assigneeFilter && card.assigneeId !== assigneeFilter) return false;
        if (labelFilter && !card.labels.includes(labelFilter)) return false;
        if (!q) return true;
        const hay =
          `${card.title} ${card.description ?? ''} ${card.labels.join(' ')}`.toLowerCase();
        return hay.includes(q);
      }),
    }));
    return { ...board, columns };
  }, [board, search, priorityFilter, assigneeFilter, labelFilter]);

  const selectedCard = useMemo(() => {
    if (!board || !selectedCardId) return null;
    for (const col of board.columns) {
      const found = col.cards.find((c) => c.id === selectedCardId);
      if (found) return found;
    }
    return null;
  }, [board, selectedCardId]);

  const selectedCardColumn = useMemo(() => {
    if (!board || !selectedCard) return null;
    return board.columns.find((c) => c.id === selectedCard.columnId) ?? null;
  }, [board, selectedCard]);

  const withBusy = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setErrorMessage(null);
    try {
      return await fn();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Ошибка операции');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const selectBoard = useCallback(
    async (boardId: string) => {
      await withBusy(async () => {
        await loadBoard(boardId);
      });
    },
    [loadBoard, withBusy]
  );

  const openCreateBoard = useCallback(() => {
    setBoardModalMode('create');
    setBoardFormName('');
    setBoardFormDescription('');
    setBoardModalOpen(true);
  }, []);

  const openRenameBoard = useCallback(() => {
    if (!board || !canEdit) return;
    setBoardModalMode('rename');
    setBoardFormName(board.name);
    setBoardFormDescription(board.description ?? '');
    setBoardModalOpen(true);
  }, [board, canEdit]);

  const submitBoard = useCallback(async () => {
    const name = boardFormName.trim();
    if (!name) return;
    if (boardModalMode === 'rename') {
      if (!board || !canEdit) return;
      if (
        name === board.name &&
        (boardFormDescription.trim() || null) === (board.description ?? null)
      ) {
        setBoardModalOpen(false);
        return;
      }
      await withBusy(async () => {
        await updateKanbanBoard(board.id, {
          name,
          description: boardFormDescription.trim() || null,
        });
        await loadBoards();
        await loadBoard(board.id);
        setBoardModalOpen(false);
      });
      return;
    }
    await withBusy(async () => {
      const created = await createKanbanBoard({
        name,
        description: boardFormDescription.trim() || null,
      });
      await loadBoards();
      setBoard(created);
      setSelectedBoardId(created.id);
      setBoardModalOpen(false);
    });
  }, [
    board,
    boardFormDescription,
    boardFormName,
    boardModalMode,
    canEdit,
    loadBoard,
    loadBoards,
    withBusy,
  ]);

  const openDeleteBoard = useCallback(() => {
    if (!board || !canEdit) return;
    setDeleteBoardModalOpen(true);
  }, [board, canEdit]);

  const confirmDeleteBoard = useCallback(async () => {
    if (!board || !canEdit) return;
    await withBusy(async () => {
      await deleteKanbanBoard(board.id);
      const list = await loadBoards();
      setDeleteBoardModalOpen(false);
      await refreshTrashCount();
      if (list.length > 0) {
        await loadBoard(list[0].id);
      } else {
        setBoard(null);
        setSelectedBoardId(null);
      }
    });
  }, [board, canEdit, loadBoard, loadBoards, refreshTrashCount, withBusy]);

  const reload = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await loadBoards();
      await refreshTrashCount();
      if (selectedBoardId && list.some((b) => b.id === selectedBoardId)) {
        await loadBoard(selectedBoardId);
      } else if (list.length > 0) {
        await loadBoard(list[0].id);
      } else {
        setBoard(null);
        setSelectedBoardId(null);
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [loadBoard, loadBoards, refreshTrashCount, selectedBoardId]);

  const openCreateColumn = useCallback(() => {
    setEditingColumn(null);
    setColumnFormName('');
    setColumnFormColor('#64748b');
    setColumnFormWip('');
    setColumnModalOpen(true);
  }, []);

  const openEditColumn = useCallback((column: KanbanColumn) => {
    setEditingColumn(column);
    setColumnFormName(column.name);
    setColumnFormColor(column.color || '#64748b');
    setColumnFormWip(column.wipLimit != null ? String(column.wipLimit) : '');
    setColumnModalOpen(true);
  }, []);

  const submitColumn = useCallback(async () => {
    if (!board || !canEdit) return;
    const name = columnFormName.trim();
    if (!name) return;
    const wip = columnFormWip.trim() ? Number(columnFormWip) : null;
    await withBusy(async () => {
      if (editingColumn) {
        await updateKanbanColumn(editingColumn.id, {
          name,
          color: columnFormColor,
          wipLimit: Number.isFinite(wip) && wip && wip > 0 ? wip : null,
        });
      } else {
        await createKanbanColumn(board.id, {
          name,
          color: columnFormColor,
          wipLimit: Number.isFinite(wip) && wip && wip > 0 ? wip : null,
        });
      }
      await loadBoard(board.id);
      setColumnModalOpen(false);
    });
  }, [
    board,
    canEdit,
    columnFormColor,
    columnFormName,
    columnFormWip,
    editingColumn,
    loadBoard,
    withBusy,
  ]);

  const openDeleteColumn = useCallback(
    (column: KanbanColumn) => {
      if (!board || !canEdit) return;
      if (column.cards.length > 0) {
        setErrorMessage(
          'Нельзя удалить колонку с карточками. Сначала переместите или удалите карточки.'
        );
        return;
      }
      if (board.columns.length <= 1) {
        setErrorMessage('На доске должна остаться хотя бы одна колонка');
        return;
      }
      setColumnToDelete(column);
    },
    [board, canEdit]
  );

  const confirmDeleteColumn = useCallback(async () => {
    if (!board || !canEdit || !columnToDelete) return;
    await withBusy(async () => {
      await deleteKanbanColumn(columnToDelete.id);
      setColumnToDelete(null);
      await loadBoard(board.id);
    });
  }, [board, canEdit, columnToDelete, loadBoard, withBusy]);

  const startQuickCreate = useCallback((columnId: string) => {
    setCreatingInColumnId(columnId);
    setNewCardTitle('');
  }, []);

  const submitQuickCreate = useCallback(async () => {
    if (!board || !creatingInColumnId || !canEdit) return;
    const title = newCardTitle.trim();
    if (!title) {
      setCreatingInColumnId(null);
      return;
    }
    await withBusy(async () => {
      const card = await createKanbanCard(creatingInColumnId, { title });
      await loadBoard(board.id);
      setCreatingInColumnId(null);
      setNewCardTitle('');
      setSelectedCardId(card.id);
    });
  }, [board, canEdit, creatingInColumnId, loadBoard, newCardTitle, withBusy]);

  const moveCardOptimistic = useCallback(
    async (cardId: string, targetColumnId: string, sortOrder: number) => {
      if (!board || !canEdit) return;
      const prev = board;

      setBoard((current) => {
        if (!current) return current;
        let moving: KanbanCard | null = null;
        const without = current.columns.map((col) => {
          const idx = col.cards.findIndex((c) => c.id === cardId);
          if (idx === -1) return col;
          moving = col.cards[idx];
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        });
        if (!moving) return current;
        return {
          ...current,
          columns: without.map((col) => {
            if (col.id !== targetColumnId) return col;
            const nextCards = [...col.cards];
            const insertAt = Math.max(0, Math.min(sortOrder, nextCards.length));
            nextCards.splice(insertAt, 0, { ...moving!, columnId: targetColumnId });
            return {
              ...col,
              cards: nextCards.map((c, i) => ({ ...c, sortOrder: i })),
            };
          }),
        };
      });

      const result = await withBusy(async () => {
        await moveKanbanCard(cardId, { columnId: targetColumnId, sortOrder });
        await loadBoard(board.id);
      });
      if (result === null) {
        setBoard(prev);
      }
    },
    [board, canEdit, loadBoard, withBusy]
  );

  const saveCard = useCallback(
    async (
      cardId: string,
      payload: Partial<{
        title: string;
        description: string | null;
        priority: KanbanCardPriority;
        labels: string[];
        dueDate: string | null;
        assigneeId: string | null;
        checklist: KanbanChecklistItem[];
      }>
    ) => {
      if (!board || !canEdit) return;
      await withBusy(async () => {
        const updated = await updateKanbanCard(cardId, payload);
        setBoard((current) => {
          if (!current) return current;
          return {
            ...current,
            columns: current.columns.map((col) => ({
              ...col,
              cards: col.cards.map((c) => (c.id === cardId ? { ...c, ...updated } : c)),
            })),
          };
        });
      });
    },
    [board, canEdit, withBusy]
  );

  const removeCard = useCallback(
    async (cardId: string) => {
      if (!board || !canEdit) return;
      if (!window.confirm('Удалить карточку?')) return;
      await withBusy(async () => {
        await deleteKanbanCard(cardId);
        setSelectedCardId(null);
        await loadBoard(board.id);
      });
    },
    [board, canEdit, loadBoard, withBusy]
  );

  const postComment = useCallback(
    async (cardId: string, body: string) => {
      if (!body.trim()) return;
      await withBusy(async () => {
        const comment = await addKanbanComment(cardId, body.trim());
        setBoard((current) => {
          if (!current) return current;
          return {
            ...current,
            columns: current.columns.map((col) => ({
              ...col,
              cards: col.cards.map((c) =>
                c.id === cardId ? { ...c, comments: [...c.comments, comment] } : c
              ),
            })),
          };
        });
      });
    },
    [withBusy]
  );

  const removeComment = useCallback(
    async (cardId: string, commentId: string) => {
      if (!canEdit) return;
      await withBusy(async () => {
        await deleteKanbanComment(commentId);
        setBoard((current) => {
          if (!current) return current;
          return {
            ...current,
            columns: current.columns.map((col) => ({
              ...col,
              cards: col.cards.map((c) =>
                c.id === cardId
                  ? { ...c, comments: c.comments.filter((cm) => cm.id !== commentId) }
                  : c
              ),
            })),
          };
        });
      });
    },
    [canEdit, withBusy]
  );

  const toggleChecklistItem = useCallback(
    async (card: KanbanCard, itemId: string) => {
      if (!canEdit) return;
      const checklist = (card.checklist ?? []).map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      );
      await saveCard(card.id, { checklist });
    },
    [canEdit, saveCard]
  );

  const addChecklistItem = useCallback(
    async (card: KanbanCard, text: string) => {
      if (!canEdit || !text.trim()) return;
      const checklist = [
        ...(card.checklist ?? []),
        { id: newChecklistId(), text: text.trim(), done: false },
      ];
      await saveCard(card.id, { checklist });
    },
    [canEdit, saveCard]
  );

  return {
    canEdit,
    boards,
    board: filteredBoard,
    rawBoard: board,
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
  };
}
