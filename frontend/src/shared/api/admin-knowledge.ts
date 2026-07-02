import { apiFetch } from '@/shared/lib/api-fetch';
import { getStoredAccessToken } from '@/shared/lib/auth-session';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = getStoredAccessToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function getAuthHeadersMultipart(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = getStoredAccessToken();
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export type KnowledgeMaterialType = 'ARTICLE' | 'VIDEO' | 'LINK';
export type KnowledgeMaterialStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type KnowledgeThumbnailDisplay = 'COVER' | 'CONTAIN' | 'NATURAL';

export interface KnowledgeAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  sortOrder: number;
}

export interface KnowledgeVideoProgress {
  id: string;
  progressPercent: number;
  positionSeconds: number;
  completed: boolean;
  updatedAt: string;
}

export interface KnowledgeTargetAudience {
  id: string;
  label: string;
  sortOrder: number;
}

export interface AdminKnowledgeMaterial {
  id: string;
  categoryId: string;
  moduleId: string | null;
  type: KnowledgeMaterialType;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  targetAudiences: KnowledgeTargetAudience[];
  readingTimeMinutes: number | null;
  tutorRecommendation?: string | null;
  managerPracticalAssignment?: string | null;
  videoUrl: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  thumbnailDisplay: KnowledgeThumbnailDisplay;
  sortOrder: number;
  isPinned: boolean;
  status: KnowledgeMaterialStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; firstName: string | null; lastName: string | null };
  category: { id: string; name: string; slug: string };
  module?: { id: string; name: string; slug: string; order: number } | null;
  attachments?: KnowledgeAttachment[];
  myVideoProgress?: KnowledgeVideoProgress | null;
  myQuizStatus?: KnowledgeQuizStatus | null;
  likeCount?: number;
  likedByMe?: boolean;
  favoritedByMe?: boolean;
  commentCount?: number;
  studyCompleted?: boolean;
  sequentialLocked?: boolean;
}

export interface KnowledgeAttachmentInput {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  sortOrder?: number;
}

export interface AdminKnowledgeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  order: number;
  _count?: { materials: number };
}

export interface AdminKnowledgeModule {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  _count?: { materials: number };
}

export interface CreateKnowledgeModuleDto {
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  order?: number;
}

export interface CreateKnowledgeMaterialDto {
  categoryId: string;
  moduleId?: string | null;
  type: KnowledgeMaterialType;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  targetAudienceIds?: string[];
  readingTimeMinutes?: number | null;
  tutorRecommendation?: string;
  managerPracticalAssignment?: string;
  videoUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string | null;
  thumbnailDisplay?: KnowledgeThumbnailDisplay;
  sortOrder?: number;
  isPinned?: boolean;
  status?: KnowledgeMaterialStatus;
  attachments?: KnowledgeAttachmentInput[];
}

export interface CreateKnowledgeCategoryDto {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  order?: number;
}

export interface KnowledgeStats {
  totalMaterials: number;
  publishedMaterials: number;
  draftMaterials: number;
  videoCount: number;
  articleCount: number;
  linkCount: number;
  categoryCount: number;
  pinnedCount: number;
  myFavoritesCount?: number;
}

export interface KnowledgeTrainingAnalytics {
  period: { from: string; to: string };
  summary: {
    totalEmployees: number;
    activeEmployees: number;
    publishedMaterials: number;
    trackableMaterials: number;
    avgCompletionPercent: number;
    videosCompleted: number;
    quizzesPassed: number;
    quizAttempts: number;
    videoUpdates: number;
  };
  statusDistribution: {
    completed: number;
    inProgress: number;
    notStarted: number;
    completedPercent: number;
    inProgressPercent: number;
    notStartedPercent: number;
  };
  activityTimeline: Array<{
    date: string;
    videoProgressUpdates: number;
    quizAttempts: number;
    quizPasses: number;
  }>;
  employees: Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
    completedCount: number;
    trackableCount: number;
    completionPercent: number;
    videosCompleted: number;
    quizzesPassed: number;
    lastActivityAt: string | null;
  }>;
  topMaterials: Array<{
    materialId: string;
    title: string;
    type: KnowledgeMaterialType;
    categoryName: string;
    hasQuiz: boolean;
    completionPercent: number;
    completedCount: number;
    employeeCount: number;
    avgVideoProgress: number | null;
    quizPassRate: number | null;
  }>;
  materialsByType: {
    VIDEO: { total: number; trackable: number };
    ARTICLE: { total: number; withQuiz: number };
    LINK: { total: number; withQuiz: number };
  };
  categories: Array<{
    categoryId: string;
    categoryName: string;
    categoryOrder: number;
    trackableCount: number;
    avgCompletionPercent: number;
    employeeCount: number;
  }>;
  categoryTimeline: Array<{
    date: string;
    categories: Array<{ categoryId: string; completionPercent: number }>;
  }>;
}

export interface KnowledgeMyTrainingProgress {
  period: { from: string; to: string };
  summary: {
    trackableCount: number;
    completedCount: number;
    completionPercent: number;
    videosCompleted: number;
    quizzesPassed: number;
    quizAttempts: number;
    videoUpdates: number;
    lastActivityAt: string | null;
  };
  categories: Array<{
    categoryId: string;
    categoryName: string;
    categoryOrder: number;
    trackableCount: number;
    completedCount: number;
    completionPercent: number;
    inProgressCount: number;
    notStartedCount: number;
  }>;
  categoryTimeline: Array<{
    date: string;
    categories: Array<{ categoryId: string; completionPercent: number }>;
  }>;
  activityTimeline: Array<{
    date: string;
    videoProgressUpdates: number;
    quizAttempts: number;
    quizPasses: number;
  }>;
}

export async function getKnowledgeTrainingAnalytics(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<KnowledgeTrainingAnalytics> {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  const qs = search.toString();
  const res = await apiFetch(`${API_URL}/admin/knowledge/training-analytics${qs ? `?${qs}` : ''}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось загрузить статистику обучения');
  }
  return res.json() as Promise<KnowledgeTrainingAnalytics>;
}

export async function getKnowledgeMyTrainingProgress(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<KnowledgeMyTrainingProgress> {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  const qs = search.toString();
  const res = await apiFetch(
    `${API_URL}/admin/knowledge/my-training-progress${qs ? `?${qs}` : ''}`,
    {
      headers: getAuthHeaders(),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось загрузить статистику обучения');
  }
  return res.json() as Promise<KnowledgeMyTrainingProgress>;
}

export async function getKnowledgeMaterials(params?: {
  status?: string;
  categoryId?: string;
  moduleId?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  favoritesOnly?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params?.moduleId) searchParams.set('moduleId', params.moduleId);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.favoritesOnly) searchParams.set('favoritesOnly', '1');

  const res = await apiFetch(`${API_URL}/admin/knowledge/materials?${searchParams}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить материалы');
  return res.json() as Promise<{
    data: AdminKnowledgeMaterial[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

export interface KnowledgeMaterialSearchSuggestion {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnailUrl: string | null;
  type: KnowledgeMaterialType;
  categoryName: string;
  moduleName: string | null;
}

export async function getKnowledgeMaterialSearchSuggestions(params: {
  q: string;
  limit?: number;
  categoryId?: string;
  moduleId?: string;
  type?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('q', params.q);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.moduleId) searchParams.set('moduleId', params.moduleId);
  if (params.type) searchParams.set('type', params.type);

  const res = await apiFetch(
    `${API_URL}/admin/knowledge/materials/search/suggestions?${searchParams}`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) throw new Error('Не удалось загрузить подсказки');
  return res.json() as Promise<{ suggestions: KnowledgeMaterialSearchSuggestion[] }>;
}

export async function getKnowledgeMaterial(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.message === 'string'
        ? err.message
        : Array.isArray(err.message)
          ? err.message.join(', ')
          : 'Материал не найден'
    );
  }
  return res.json() as Promise<AdminKnowledgeMaterial>;
}

export async function createKnowledgeMaterial(dto: CreateKnowledgeMaterialDto) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось создать материал');
  }
  return res.json() as Promise<AdminKnowledgeMaterial>;
}

export async function updateKnowledgeMaterial(
  id: string,
  dto: Partial<CreateKnowledgeMaterialDto>
) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось обновить материал');
  }
  return res.json() as Promise<AdminKnowledgeMaterial>;
}

export async function publishKnowledgeMaterial(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}/publish`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось опубликовать материал');
  return res.json() as Promise<AdminKnowledgeMaterial>;
}

export async function deleteKnowledgeMaterial(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить материал');
}

export async function getKnowledgeTargetAudiences() {
  const res = await apiFetch(`${API_URL}/admin/knowledge/target-audiences`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить целевые аудитории');
  return res.json() as Promise<KnowledgeTargetAudience[]>;
}

export async function createKnowledgeTargetAudience(label: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/target-audiences`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ label }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось добавить целевую аудиторию');
  }
  return res.json() as Promise<KnowledgeTargetAudience>;
}

export async function getKnowledgeCategories() {
  const res = await apiFetch(`${API_URL}/admin/knowledge/categories`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить категории');
  return res.json() as Promise<AdminKnowledgeCategory[]>;
}

export async function createKnowledgeCategory(dto: CreateKnowledgeCategoryDto) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось создать категорию');
  }
  return res.json() as Promise<AdminKnowledgeCategory>;
}

export async function updateKnowledgeCategory(
  id: string,
  dto: Partial<CreateKnowledgeCategoryDto>
) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/categories/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Не удалось обновить категорию');
  return res.json() as Promise<AdminKnowledgeCategory>;
}

export async function deleteKnowledgeCategory(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить категорию');
}

export interface ImportKnowledgeCategoryOutlineResult {
  categoryId: string;
  modulesCreated: number;
  articlesCreated: number;
}

export interface ImportKnowledgeCategoryOutlineDto {
  modules: Array<{
    order?: number;
    name: string;
    description?: string;
    articles: Array<{
      title: string;
      excerpt?: string;
      sortOrder?: number;
    }>;
  }>;
}

export async function importKnowledgeCategoryOutline(
  categoryId: string,
  dto: ImportKnowledgeCategoryOutlineDto
) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/categories/${categoryId}/import-outline`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось импортировать структуру категории');
  }
  return res.json() as Promise<ImportKnowledgeCategoryOutlineResult>;
}

export async function getKnowledgeModules(categoryId: string) {
  const res = await apiFetch(
    `${API_URL}/admin/knowledge/modules?categoryId=${encodeURIComponent(categoryId)}`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) throw new Error('Не удалось загрузить модули');
  return res.json() as Promise<AdminKnowledgeModule[]>;
}

export async function createKnowledgeModule(dto: CreateKnowledgeModuleDto) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/modules`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось создать модуль');
  }
  return res.json() as Promise<AdminKnowledgeModule>;
}

export async function updateKnowledgeModule(id: string, dto: Partial<CreateKnowledgeModuleDto>) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/modules/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Не удалось обновить модуль');
  return res.json() as Promise<AdminKnowledgeModule>;
}

export async function deleteKnowledgeModule(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/modules/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить модуль');
}

export type KnowledgeTrashItemType = 'material' | 'category' | 'module';

export interface KnowledgeTrashUserRef {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface KnowledgeTrashRow {
  id: string;
  type: KnowledgeTrashItemType;
  title: string;
  subtitle: string | null;
  deletedAt: string;
  permanentDeleteAt: string;
  deletedBy: KnowledgeTrashUserRef | null;
}

export async function getKnowledgeTrash(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.search?.trim()) search.set('search', params.search.trim());
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(Math.min(params?.limit ?? 25, 100)));
  const res = await apiFetch(`${API_URL}/admin/knowledge/trash?${search}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить корзину');
  return res.json() as Promise<{
    data: KnowledgeTrashRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    trashRetentionDays?: number;
  }>;
}

export async function getKnowledgeTrashCount() {
  const res = await apiFetch(`${API_URL}/admin/knowledge/trash/count`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить корзину');
  const json = (await res.json()) as { count: number };
  return { total: json.count ?? 0 };
}

export async function restoreKnowledgeTrashItem(type: KnowledgeTrashItemType, id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/trash/${type}/${id}/restore`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось восстановить');
  }
}

export async function getKnowledgeStats() {
  const res = await apiFetch(`${API_URL}/admin/knowledge/stats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить статистику');
  return res.json() as Promise<KnowledgeStats>;
}

export async function uploadKnowledgeThumbnail(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_URL}/admin/knowledge/upload`, {
    method: 'POST',
    headers: getAuthHeadersMultipart(),
    body: formData,
  });
  if (!res.ok) throw new Error('Не удалось загрузить изображение');
  return res.json() as Promise<{ imageUrl: string }>;
}

export async function uploadKnowledgeAttachment(file: File): Promise<{
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_URL}/admin/knowledge/upload-attachment`, {
    method: 'POST',
    headers: getAuthHeadersMultipart(),
    body: formData,
  });
  if (!res.ok) throw new Error('Не удалось загрузить файл');
  return res.json();
}

export async function toggleKnowledgeMaterialPin(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}/pin`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось изменить закрепление');
  return res.json() as Promise<AdminKnowledgeMaterial>;
}

export interface KnowledgeMaterialFavoriteToggleResult {
  favorited: boolean;
  favoritedByMe: boolean;
}

export async function toggleKnowledgeMaterialFavorite(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}/favorite`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось изменить избранное');
  return res.json() as Promise<KnowledgeMaterialFavoriteToggleResult>;
}

export async function markKnowledgeMaterialStudyComplete(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}/study-complete`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отметить материал как изученный');
  }
  return res.json() as Promise<{ studyCompleted: boolean }>;
}

export interface KnowledgeMaterialLikeToggleResult {
  liked: boolean;
  likeCount: number;
  likedByMe: boolean;
}

export async function toggleKnowledgeMaterialLike(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}/like`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось изменить отметку');
  return res.json() as Promise<KnowledgeMaterialLikeToggleResult>;
}

export interface KnowledgeMaterialLiker {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar: string | null;
}

export async function getKnowledgeMaterialLikers(materialId: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${materialId}/likes`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список отметок');
  return res.json() as Promise<{ users: KnowledgeMaterialLiker[] }>;
}

export interface KnowledgeMaterialCommentAuthor {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar: string | null;
}

export interface KnowledgeMaterialComment {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  author: KnowledgeMaterialCommentAuthor;
  isMine: boolean;
}

export async function getKnowledgeMaterialComments(materialId: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${materialId}/comments`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить комментарии');
  return res.json() as Promise<{ comments: KnowledgeMaterialComment[] }>;
}

export async function createKnowledgeMaterialComment(materialId: string, text: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${materialId}/comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отправить комментарий');
  }
  return res.json() as Promise<{ comment: KnowledgeMaterialComment; commentCount: number }>;
}

export type KnowledgePlatformFeedbackType = 'SUGGESTION' | 'BUG';

export interface KnowledgePlatformFeedback {
  id: string;
  type: KnowledgePlatformFeedbackType;
  text: string;
  createdAt: string;
  readAt?: string | null;
  author?: KnowledgeMaterialCommentAuthor;
}

export async function getKnowledgePlatformFeedback(options?: {
  type?: KnowledgePlatformFeedbackType;
  unreadOnly?: boolean;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.type) params.set('type', options.type);
  if (options?.unreadOnly) params.set('unreadOnly', 'true');
  if (options?.limit) params.set('limit', String(options.limit));
  const query = params.toString();
  const res = await apiFetch(`${API_URL}/admin/knowledge/feedback${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить обратную связь');
  return res.json() as Promise<{ items: KnowledgePlatformFeedback[] }>;
}

const FEEDBACK_UNREAD_COUNT_CACHE_TTL_MS = 30_000;
let feedbackUnreadCountCache: { count: number; at: number } | null = null;
let feedbackUnreadCountInFlight: Promise<number> | null = null;

export function invalidateKnowledgePlatformFeedbackUnreadCountCache(): void {
  feedbackUnreadCountCache = null;
}

/** Счётчик непрочитанной обратной связи с дедупликацией параллельных запросов. */
export async function getKnowledgePlatformFeedbackUnreadCount(): Promise<number> {
  const now = Date.now();
  if (
    feedbackUnreadCountCache &&
    now - feedbackUnreadCountCache.at < FEEDBACK_UNREAD_COUNT_CACHE_TTL_MS
  ) {
    return feedbackUnreadCountCache.count;
  }
  if (feedbackUnreadCountInFlight) {
    return feedbackUnreadCountInFlight;
  }

  feedbackUnreadCountInFlight = getKnowledgePlatformFeedback({ unreadOnly: true, limit: 100 })
    .then((data) => {
      const count = data.items?.length ?? 0;
      feedbackUnreadCountCache = { count, at: Date.now() };
      return count;
    })
    .finally(() => {
      feedbackUnreadCountInFlight = null;
    });

  return feedbackUnreadCountInFlight;
}

export async function markKnowledgePlatformFeedbackRead() {
  const res = await apiFetch(`${API_URL}/admin/knowledge/feedback/mark-read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось отметить сообщения прочитанными');
  invalidateKnowledgePlatformFeedbackUnreadCountCache();
  return res.json() as Promise<{ marked: number }>;
}

export async function createKnowledgePlatformFeedback(data: {
  type: KnowledgePlatformFeedbackType;
  text: string;
}) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отправить сообщение');
  }
  return res.json() as Promise<{ feedback: KnowledgePlatformFeedback }>;
}

export interface KnowledgePlatformSettings {
  id: string;
  materialQuizTimePerQuestionSeconds: number;
  categoryQuizTimePerQuestionSeconds: number;
  materialQuizMaxAttemptsPerDay: number;
  categoryQuizMaxAttemptsPerDay: number;
  materialQuizRetryCooldownMinutes: number;
  categoryQuizRetryCooldownMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeQuizPlatformSettings {
  materialQuizTimePerQuestionSeconds: number;
  categoryQuizTimePerQuestionSeconds: number;
  materialQuizMaxAttemptsPerDay: number;
  categoryQuizMaxAttemptsPerDay: number;
  materialQuizRetryCooldownMinutes: number;
  categoryQuizRetryCooldownMinutes: number;
}

export async function getKnowledgePlatformSettings(): Promise<KnowledgePlatformSettings> {
  const res = await apiFetch(`${API_URL}/admin/knowledge/platform-settings`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки платформы');
  return res.json();
}

export async function updateKnowledgePlatformSettings(data: {
  materialQuizTimePerQuestionSeconds: number;
  categoryQuizTimePerQuestionSeconds: number;
  materialQuizMaxAttemptsPerDay: number;
  categoryQuizMaxAttemptsPerDay: number;
  materialQuizRetryCooldownMinutes: number;
  categoryQuizRetryCooldownMinutes: number;
}): Promise<KnowledgePlatformSettings> {
  const res = await apiFetch(`${API_URL}/admin/knowledge/platform-settings`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось сохранить настройки');
  }
  return res.json();
}

export async function updateKnowledgeVideoProgress(
  materialId: string,
  data: { progressPercent: number; positionSeconds?: number; completed?: boolean }
) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${materialId}/progress`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось сохранить прогресс');
  return res.json() as Promise<KnowledgeVideoProgress>;
}

export async function getKnowledgeVideoProgress(materialId: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${materialId}/progress`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Не удалось загрузить прогресс');
  const data = await res.json();
  return data as KnowledgeVideoProgress | null;
}

export interface KnowledgeQuizStatus {
  hasQuiz: boolean;
  passed: boolean;
  scorePercent: number | null;
}

export interface KnowledgeQuizOption {
  id: string;
  sortOrder: number;
  text: string;
  isCorrect?: boolean;
}

export interface KnowledgeQuizQuestion {
  id: string;
  sortOrder: number;
  text: string;
  explanation?: string | null;
  options: KnowledgeQuizOption[];
}

export interface KnowledgeQuizData {
  id: string;
  materialId: string;
  title: string;
  passingScorePercent: number;
  timePerQuestionSeconds: number;
  questions: KnowledgeQuizQuestion[];
}

export interface KnowledgeQuizAttemptSummary {
  id: string;
  scorePercent: number;
  passed: boolean;
  createdAt: string;
}

export interface KnowledgeQuizAttemptLimits {
  canStart: boolean;
  blockedReason: 'cooldown' | 'daily_limit' | null;
  nextAttemptAt: string | null;
  attemptsToday: number;
  maxAttemptsPerDay: number;
  cooldownMinutes: number;
}

export interface KnowledgeMaterialQuizResponse {
  quiz: KnowledgeQuizData;
  myBestAttempt: KnowledgeQuizAttemptSummary | null;
  myLatestAttempt: KnowledgeQuizAttemptSummary | null;
  attemptLimits: KnowledgeQuizAttemptLimits;
}

export interface KnowledgeQuizResultItem {
  questionId: string;
  questionText: string;
  selectedOptionId: string;
  selectedOptionText: string | null;
  correctOptionId: string | null;
  correctOptionText: string | null;
  isCorrect: boolean;
  explanation: string | null;
}

export interface KnowledgeQuizSubmitResult {
  attemptId: string;
  scorePercent: number;
  passed: boolean;
  passingScorePercent: number;
  correctCount: number;
  totalCount: number;
  results: KnowledgeQuizResultItem[];
}

export interface UpsertKnowledgeQuizDto {
  title?: string;
  passingScorePercent?: number;
  timePerQuestionSeconds?: number;
  questions: Array<{
    id?: string;
    text: string;
    explanation?: string;
    sortOrder?: number;
    options: Array<{
      id?: string;
      text: string;
      isCorrect: boolean;
      sortOrder?: number;
    }>;
  }>;
}

export async function getKnowledgeMaterialQuiz(materialId: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${materialId}/quiz`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Не удалось загрузить тест');
  const data = await res.json();
  return (data as KnowledgeMaterialQuizResponse | null) ?? null;
}

export async function upsertKnowledgeMaterialQuiz(materialId: string, dto: UpsertKnowledgeQuizDto) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${materialId}/quiz`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось сохранить тест');
  }
  const data = await res.json();
  return data as KnowledgeMaterialQuizResponse | null;
}

export async function submitKnowledgeMaterialQuiz(
  materialId: string,
  answers: Record<string, string>,
  options?: { timedOut?: boolean }
) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${materialId}/quiz/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ answers, timedOut: options?.timedOut ?? false }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отправить ответы');
  }
  return res.json() as Promise<KnowledgeQuizSubmitResult>;
}

export interface KnowledgeCategoryQuizSection {
  materialId: string;
  materialTitle: string;
  moduleName: string | null;
  questions: KnowledgeQuizQuestion[];
}

export interface KnowledgeCategoryQuizData {
  categoryId: string;
  title: string;
  passingScorePercent: number;
  timePerQuestionSeconds: number;
  questionCount: number;
  sections: KnowledgeCategoryQuizSection[];
}

export interface KnowledgeCategoryTestSummary {
  category: { id: string; name: string; slug: string };
  materialCount: number;
  questionCount: number;
  myBestAttempt: KnowledgeQuizAttemptSummary | null;
}

export interface KnowledgeCategoryQuizResponse {
  category: { id: string; name: string; slug: string };
  quiz: KnowledgeCategoryQuizData;
  myBestAttempt: KnowledgeQuizAttemptSummary | null;
  myLatestAttempt: KnowledgeQuizAttemptSummary | null;
  attemptLimits: KnowledgeQuizAttemptLimits;
}

export async function getKnowledgeCategoryTests() {
  const res = await apiFetch(`${API_URL}/admin/knowledge/category-tests`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список тестов');
  return res.json() as Promise<KnowledgeCategoryTestSummary[]>;
}

export async function getKnowledgeCategoryQuiz(categoryId: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/category-tests/${categoryId}`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Не удалось загрузить тест категории');
  const data = await res.json();
  return (data as KnowledgeCategoryQuizResponse | null) ?? null;
}

export async function submitKnowledgeCategoryQuiz(
  categoryId: string,
  answers: Record<string, string>,
  options?: { timedOut?: boolean }
) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/category-tests/${categoryId}/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ answers, timedOut: options?.timedOut ?? false }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отправить ответы');
  }
  return res.json() as Promise<KnowledgeQuizSubmitResult>;
}
