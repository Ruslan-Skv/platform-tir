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

function getAuthHeadersMultipart(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export type KnowledgeMaterialType = 'ARTICLE' | 'VIDEO' | 'LINK';
export type KnowledgeMaterialStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

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
  videoUrl: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
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
  videoUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
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
  roleDistribution: Array<{
    role: string;
    employeeCount: number;
    avgCompletionPercent: number;
  }>;
  materialsByType: {
    VIDEO: { total: number; trackable: number };
    ARTICLE: { total: number; withQuiz: number };
    LINK: { total: number; withQuiz: number };
  };
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

export async function getKnowledgeMaterials(params?: {
  status?: string;
  categoryId?: string;
  moduleId?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params?.moduleId) searchParams.set('moduleId', params.moduleId);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

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

export async function getKnowledgeMaterial(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Материал не найден');
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
  questions: KnowledgeQuizQuestion[];
}

export interface KnowledgeQuizAttemptSummary {
  id: string;
  scorePercent: number;
  passed: boolean;
  createdAt: string;
}

export interface KnowledgeMaterialQuizResponse {
  quiz: KnowledgeQuizData;
  myBestAttempt: KnowledgeQuizAttemptSummary | null;
  myLatestAttempt: KnowledgeQuizAttemptSummary | null;
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
  answers: Record<string, string>
) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${materialId}/quiz/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отправить ответы');
  }
  return res.json() as Promise<KnowledgeQuizSubmitResult>;
}
