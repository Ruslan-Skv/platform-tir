import type { QuizTheme } from '@/shared/api/quiz-theme';
import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface QuizOption {
  value: string;
  label: string;
  imageUrl?: string;
}

export interface QuizShowWhen {
  branchKey: string;
  values: string[];
}

export interface QuizStepConfig {
  id: string;
  key: string;
  sortOrder: number;
  type: 'choice' | 'text' | 'contact';
  title: string;
  subtitle?: string | null;
  placeholder?: string | null;
  required: boolean;
  options?: QuizOption[];
  showWhen?: QuizShowWhen | null;
}

export interface QuizPublicConfig {
  id: string;
  slug: string;
  direction: string;
  title: string;
  headline?: string | null;
  subheadline?: string | null;
  promoText?: string | null;
  logoUrl?: string | null;
  primaryColor: string;
  theme: QuizTheme;
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
  steps: QuizStepConfig[];
}

export interface SubmitQuizPayload {
  name: string;
  phone: string;
  answers: Record<string, string>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  landingUrl?: string;
}

export async function fetchQuizConfig(params: {
  host?: string;
  slug?: string;
  apiBase?: string;
}): Promise<QuizPublicConfig> {
  const base = params.apiBase ?? API_URL;
  const search = new URLSearchParams();
  if (params.host) search.set('host', params.host);
  if (params.slug) search.set('slug', params.slug);
  const res = await apiFetch(`${base}/quiz/public/config?${search}`);
  if (!res.ok) throw new Error('Квиз не найден');
  return res.json();
}

export async function submitQuiz(slug: string, payload: SubmitQuizPayload): Promise<void> {
  const res = await apiFetch(`${API_URL}/quiz/public/${slug}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Ошибка отправки заявки');
  }
}
