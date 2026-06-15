import type { QuizTheme } from '@/shared/api/quiz-theme';
import { apiFetch } from '@/shared/lib/api-fetch';
import { nestMessageFromBody } from '@/shared/lib/nest-error-message';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const MEBEL_QUIZ_SLUG = 'mebel';

export interface AdminQuizStep {
  id: string;
  key: string;
  sortOrder: number;
  type: string;
  title: string;
  subtitle?: string | null;
  placeholder?: string | null;
  required: boolean;
  options?: { value: string; label: string; imageUrl?: string }[] | null;
  showWhen?: { branchKey: string; values: string[] } | null;
}

export interface AdminQuizLanding {
  id: string;
  slug: string;
  direction: string;
  title: string;
  domain?: string | null;
  isActive: boolean;
  headline?: string | null;
  subheadline?: string | null;
  promoText?: string | null;
  logoUrl?: string | null;
  primaryColor: string;
  theme?: QuizTheme | null;
  displayPhone?: string | null;
  city?: string | null;
  successTitle?: string | null;
  successText?: string | null;
  catalogFileUrl?: string | null;
  privacyPolicyUrl?: string | null;
  privacyPolicyTitle?: string | null;
  privacyPolicyContent?: string | null;
  consentText?: string | null;
  consentLinkText?: string | null;
  notifyEmails?: string[] | null;
  notifyTelegramIds?: string[] | null;
  notifyPhones?: string[] | null;
  steps: AdminQuizStep[];
}

export interface QuizSubmissionItem {
  id: string;
  name: string;
  phone: string;
  answers: Record<string, string>;
  furnitureType?: string | null;
  status: string;
  managerNote?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  landingUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizSubmissionsResponse {
  data: QuizSubmissionItem[];
  total: number;
  page: number;
  totalPages: number;
  stats: Record<string, number>;
}

export async function getAdminQuiz(
  slug: string,
  getAuthHeaders: () => Record<string, string>
): Promise<AdminQuizLanding> {
  const res = await apiFetch(`${API_URL}/admin/quiz/${slug}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить квиз');
  return res.json();
}

export async function updateAdminQuiz(
  slug: string,
  data: Partial<AdminQuizLanding> & {
    theme?: Partial<QuizTheme>;
    notifyEmails?: string[];
    notifyTelegramIds?: string[];
    notifyPhones?: string[];
  },
  getAuthHeaders: () => Record<string, string>
): Promise<AdminQuizLanding> {
  const res = await apiFetch(`${API_URL}/admin/quiz/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(nestMessageFromBody(body) || 'Ошибка сохранения');
  }
  return res.json();
}

export async function replaceAdminQuizSteps(
  slug: string,
  steps: Omit<AdminQuizStep, 'id'>[],
  getAuthHeaders: () => Record<string, string>
): Promise<AdminQuizLanding> {
  const res = await apiFetch(`${API_URL}/admin/quiz/${slug}/steps`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ steps }),
  });
  if (!res.ok) throw new Error('Ошибка сохранения шагов');
  return res.json();
}

export async function getAdminQuizSubmissions(
  slug: string,
  params: {
    page: number;
    status?: string;
    furnitureType?: string;
    search?: string;
  },
  getAuthHeaders: () => Record<string, string>
): Promise<QuizSubmissionsResponse> {
  const search = new URLSearchParams({ page: String(params.page), limit: '20' });
  if (params.status) search.set('status', params.status);
  if (params.furnitureType) search.set('furnitureType', params.furnitureType);
  if (params.search) search.set('search', params.search);
  const res = await apiFetch(`${API_URL}/admin/quiz/${slug}/submissions?${search}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить заявки');
  return res.json();
}

export async function updateQuizSubmission(
  slug: string,
  submissionId: string,
  data: { status?: string; managerNote?: string | null },
  getAuthHeaders: () => Record<string, string>
): Promise<QuizSubmissionItem> {
  const res = await apiFetch(`${API_URL}/admin/quiz/${slug}/submissions/${submissionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка обновления заявки');
  return res.json();
}

export async function uploadQuizOptionImage(
  slug: string,
  file: File,
  getAuthHeaders: () => Record<string, string>
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_URL}/admin/quiz/${slug}/upload-option-image`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error('Ошибка загрузки изображения');
  return res.json();
}

export async function uploadQuizCatalog(
  slug: string,
  file: File,
  getAuthHeaders: () => Record<string, string>
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_URL}/admin/quiz/${slug}/upload-catalog`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error('Ошибка загрузки каталога');
  return res.json();
}

export async function uploadQuizPrivacyPolicy(
  slug: string,
  file: File,
  getAuthHeaders: () => Record<string, string>
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_URL}/admin/quiz/${slug}/upload-privacy-policy`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error('Ошибка загрузки PDF политики');
  return res.json();
}

export function resolveAdminUploadUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/quiz/') || url.startsWith('/images/')) return url;
  if (url.startsWith('/uploads/')) {
    const base = API_URL.replace(/\/api\/v1\/?$/, '');
    return `${base}${url}`;
  }
  return url;
}
