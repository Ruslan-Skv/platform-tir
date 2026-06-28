import { QUIZ_SUBMISSION_STATUSES } from '../../quiz/quiz.types';

export const LEAD_STATUSES = QUIZ_SUBMISSION_STATUSES;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  'form_measurement',
  'form_callback',
  'form_director',
  'form_quote',
  'quiz_mebel',
  'quiz_remont',
  'order',
  'site_feedback',
  'knowledge_feedback',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  form_measurement: 'Запись на замер',
  form_callback: 'Обратный звонок',
  form_director: 'Письмо директору',
  form_quote: 'Рассчитать стоимость',
  quiz_mebel: 'Квиз — Мебель',
  quiz_remont: 'Квиз — Ремонт',
  order: 'Заказ из каталога',
  site_feedback: 'Обратная связь (сайт)',
  knowledge_feedback: 'Обратная связь (обучение)',
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Новая',
  contacted: 'Связались',
  in_progress: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

export const FORM_TYPE_TO_SOURCE: Record<string, LeadSource> = {
  measurement: 'form_measurement',
  callback: 'form_callback',
  director: 'form_director',
  quote: 'form_quote',
};

export const QUIZ_SLUG_TO_SOURCE: Record<string, LeadSource> = {
  mebel: 'quiz_mebel',
  remont: 'quiz_remont',
};

export type UnifiedLeadItem = {
  id: string;
  source: LeadSource;
  sourceLabel: string;
  status: LeadStatus;
  statusEditable: boolean;
  name: string;
  phone: string | null;
  email: string | null;
  preview: string;
  managerNote: string | null;
  createdAt: string;
  updatedAt: string;
  detailUrl: string | null;
  payload: Record<string, unknown>;
};

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export function isLeadSource(value: string): value is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(value);
}

export function buildLeadId(source: LeadSource, entityId: string): string {
  return `${source}:${entityId}`;
}

export function parseLeadId(leadId: string): { source: LeadSource; entityId: string } | null {
  const idx = leadId.indexOf(':');
  if (idx <= 0) return null;
  const source = leadId.slice(0, idx);
  const entityId = leadId.slice(idx + 1);
  if (!isLeadSource(source) || !entityId) return null;
  return { source, entityId };
}
