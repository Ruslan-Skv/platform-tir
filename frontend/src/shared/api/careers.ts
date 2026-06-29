import { apiFetch } from '@/shared/lib/api-fetch';
import type { CareerVacancyInfo, CareersPageInfo, PublicCareersData } from '@/shared/lib/careers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export type { CareerVacancyInfo, CareersPageInfo, PublicCareersData };

export async function getPublicCareers(): Promise<PublicCareersData> {
  const res = await apiFetch(`${API_URL}/careers`);
  if (!res.ok) throw new Error('Не удалось загрузить вакансии');
  return res.json();
}

export async function getAdminCareersPage(): Promise<CareersPageInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/careers/page`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminCareersPage(
  data: Partial<CareersPageInfo>
): Promise<CareersPageInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/careers/page`, {
    method: 'PATCH',
    headers: { ...getAdminAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка сохранения');
  }
  return res.json();
}

export async function listAdminCareerVacancies(): Promise<CareerVacancyInfo[]> {
  const res = await apiFetch(`${API_URL}/admin/content/careers/vacancies`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить вакансии');
  return res.json();
}

export async function getAdminCareerVacancy(id: string): Promise<CareerVacancyInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/careers/vacancies/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Вакансия не найдена');
  return res.json();
}

export async function createAdminCareerVacancy(
  data: Omit<CareerVacancyInfo, 'id'>
): Promise<CareerVacancyInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/careers/vacancies`, {
    method: 'POST',
    headers: { ...getAdminAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка создания');
  }
  return res.json();
}

export async function updateAdminCareerVacancy(
  id: string,
  data: Partial<CareerVacancyInfo>
): Promise<CareerVacancyInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/careers/vacancies/${id}`, {
    method: 'PATCH',
    headers: { ...getAdminAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка сохранения');
  }
  return res.json();
}

export async function deleteAdminCareerVacancy(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/content/careers/vacancies/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка удаления');
  }
}
