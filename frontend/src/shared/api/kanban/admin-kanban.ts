import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.message === 'string'
        ? err.message
        : Array.isArray(err.message)
          ? err.message.join(', ')
          : fallbackMessage
    );
  }
  return res.json() as Promise<T>;
}

export type KanbanCardPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface KanbanUserRef {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar?: string | null;
}

export interface KanbanChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface KanbanCardComment {
  id: string;
  cardId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: KanbanUserRef;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: KanbanCardPriority;
  labels: string[];
  dueDate: string | null;
  assigneeId: string | null;
  sortOrder: number;
  checklist: KanbanChecklistItem[] | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignee: KanbanUserRef | null;
  createdBy: Omit<KanbanUserRef, 'avatar'>;
  comments: KanbanCardComment[];
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  name: string;
  color: string | null;
  wipLimit: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  cards: KanbanCard[];
}

export interface KanbanBoardSummary {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  columnsCount: number;
  cardsCount: number;
}

export interface KanbanTrashBoardItem {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  deletedAt: string | null;
  deletedBy: KanbanUserRef | null;
  columnsCount: number;
  cardsCount: number;
  permanentDeleteAt: string | null;
}

export interface KanbanBoardDetail {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  columns: KanbanColumn[];
}

export async function listKanbanBoards(): Promise<KanbanBoardSummary[]> {
  const res = await apiFetch(`${API_URL}/admin/kanban/boards`, {
    headers: getAuthHeaders(),
  });
  return parseJson(res, 'Не удалось загрузить доски');
}

export async function getKanbanBoard(boardId: string): Promise<KanbanBoardDetail> {
  const res = await apiFetch(`${API_URL}/admin/kanban/boards/${boardId}`, {
    headers: getAuthHeaders(),
  });
  return parseJson(res, 'Не удалось загрузить доску');
}

export async function createKanbanBoard(payload: {
  name: string;
  description?: string | null;
  color?: string | null;
}): Promise<KanbanBoardDetail> {
  const res = await apiFetch(`${API_URL}/admin/kanban/boards`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res, 'Не удалось создать доску');
}

export async function updateKanbanBoard(
  boardId: string,
  payload: { name?: string; description?: string | null; color?: string | null }
): Promise<KanbanBoardSummary> {
  const res = await apiFetch(`${API_URL}/admin/kanban/boards/${boardId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res, 'Не удалось обновить доску');
}

export async function deleteKanbanBoard(boardId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/kanban/boards/${boardId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseJson(res, 'Не удалось удалить доску');
}

export async function getKanbanTrashCount(): Promise<number> {
  const res = await apiFetch(`${API_URL}/admin/kanban/trash/count`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJson<{ count: number }>(res, 'Не удалось загрузить счётчик корзины');
  return data.count ?? 0;
}

export async function getKanbanTrash(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: KanbanTrashBoardItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  trashRetentionDays?: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  searchParams.set('page', String(params?.page ?? 1));
  searchParams.set('limit', String(params?.limit ?? 15));
  const res = await apiFetch(`${API_URL}/admin/kanban/trash?${searchParams}`, {
    headers: getAuthHeaders(),
  });
  return parseJson(res, 'Не удалось загрузить корзину');
}

export async function restoreKanbanBoard(boardId: string): Promise<KanbanBoardDetail> {
  const res = await apiFetch(`${API_URL}/admin/kanban/boards/${boardId}/restore`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({}),
  });
  return parseJson(res, 'Не удалось восстановить доску');
}

export async function createKanbanColumn(
  boardId: string,
  payload: { name: string; color?: string | null; wipLimit?: number | null }
): Promise<KanbanColumn> {
  const res = await apiFetch(`${API_URL}/admin/kanban/boards/${boardId}/columns`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res, 'Не удалось создать колонку');
}

export async function updateKanbanColumn(
  columnId: string,
  payload: {
    name?: string;
    color?: string | null;
    wipLimit?: number | null;
    sortOrder?: number;
  }
): Promise<KanbanColumn> {
  const res = await apiFetch(`${API_URL}/admin/kanban/columns/${columnId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res, 'Не удалось обновить колонку');
}

export async function deleteKanbanColumn(columnId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/kanban/columns/${columnId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseJson(res, 'Не удалось удалить колонку');
}

export async function createKanbanCard(
  columnId: string,
  payload: {
    title: string;
    description?: string | null;
    priority?: KanbanCardPriority;
    labels?: string[];
    dueDate?: string | null;
    assigneeId?: string | null;
    checklist?: KanbanChecklistItem[];
  }
): Promise<KanbanCard> {
  const res = await apiFetch(`${API_URL}/admin/kanban/columns/${columnId}/cards`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res, 'Не удалось создать карточку');
}

export async function updateKanbanCard(
  cardId: string,
  payload: Partial<{
    title: string;
    description: string | null;
    priority: KanbanCardPriority;
    labels: string[];
    dueDate: string | null;
    assigneeId: string | null;
    checklist: KanbanChecklistItem[];
    sortOrder: number;
  }>
): Promise<KanbanCard> {
  const res = await apiFetch(`${API_URL}/admin/kanban/cards/${cardId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res, 'Не удалось обновить карточку');
}

export async function moveKanbanCard(
  cardId: string,
  payload: { columnId: string; sortOrder?: number }
): Promise<KanbanCard> {
  const res = await apiFetch(`${API_URL}/admin/kanban/cards/${cardId}/move`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res, 'Не удалось переместить карточку');
}

export async function deleteKanbanCard(cardId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/kanban/cards/${cardId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseJson(res, 'Не удалось удалить карточку');
}

export async function addKanbanComment(cardId: string, body: string): Promise<KanbanCardComment> {
  const res = await apiFetch(`${API_URL}/admin/kanban/cards/${cardId}/comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ body }),
  });
  return parseJson(res, 'Не удалось добавить комментарий');
}

export async function deleteKanbanComment(commentId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/kanban/comments/${commentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseJson(res, 'Не удалось удалить комментарий');
}
