import { apiFetch } from '@/shared/lib/api-fetch';

const API_FALLBACK = 'http://localhost:3001/api/v1';

/**
 * В проде NEXT_PUBLIC_API_URL часто задают как `/api/v1` или `host` без схемы.
 * Одноаргументный `new URL('/path')` в браузере падает — нужна абсолютная база.
 */
function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  if (!raw) return API_FALLBACK;
  if (raw.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${raw.replace(/\/$/, '')}`;
    }
    return API_FALLBACK;
  }
  if (!/^https?:\/\//i.test(raw)) {
    return `https://${raw.replace(/\/$/, '')}`;
  }
  return raw.replace(/\/$/, '');
}

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export type ContractDocumentPackageKind =
  | 'REPAIR'
  | 'WINDOWS'
  | 'DOORS'
  | 'CEILINGS'
  | 'BLINDS'
  | 'FURNITURE';

export interface ContractDocumentPackageUserRef {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** Краткие поля связанного договора CRM (для списка и подписей). */
export interface ContractDocumentPackageCrmContract {
  id: string;
  contractNumber: string;
  contractDate: string;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  totalAmount: string | number;
}

export interface ContractDocumentPackage {
  id: string;
  kind: ContractDocumentPackageKind;
  title: string | null;
  formData: Record<string, unknown>;
  crmContractId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: ContractDocumentPackageUserRef | null;
  crmContract?: ContractDocumentPackageCrmContract | null;
}

export type ExecutorRequisiteKind = 'COMPANY' | 'ENTREPRENEUR';

export interface ExecutorRequisiteProfile {
  title: string;
  /** ЮЛ — ОГРН и КПП; ИП — ОГРНИП, КПП обычно не применяется */
  kind?: ExecutorRequisiteKind;
  companyName?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  ogrnip?: string;
  legalAddress?: string;
  actualAddress?: string;
  bankDetails?: string;
  email?: string;
}

/** Профиль подписанта (справочник); связь с сотрудником CRM через `crmUserId`. */
export interface ContractSignatoryProfile {
  title: string;
  crmUserId?: string;
  directorNameNominative?: string;
  directorNameGenitive?: string;
  basis?: string;
  salesOffice?: string;
  officePhone?: string;
}

export interface ContractTemplatePreset {
  id: string;
  title: string;
  /** Вкладка документа (contract, actStart, ...). Для старых записей может отсутствовать (=contract). */
  tabId?: string;
  html: string;
  isDefault?: boolean;
}

/** Объект (здание / проект): группа расчётов в списке команды. */
export interface ContractEstimateGroup {
  id: string;
  title: string;
  updatedAt?: string;
}

export interface ContractEstimatePreset {
  id: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  calculatorDraft: string;
  /** Ссылка на `ContractEstimateGroup.id`, если расчёт входит в объект. */
  groupId?: string;
  snapshot?: {
    total: number;
    rooms: Array<{
      name: string;
      total: number;
      lines: Array<{
        name: string;
        unit: string;
        quantity: number;
        price: number;
        amount: number;
      }>;
    }>;
  } | null;
  updatedAt?: string;
}

export async function getContractDocumentPackages(
  kind?: ContractDocumentPackageKind
): Promise<ContractDocumentPackage[]> {
  const base = getApiBaseUrl();
  const qs = new URLSearchParams();
  if (kind) qs.set('kind', kind);
  const query = qs.toString();
  const url = `${base}/admin/contract-document-packages${query ? `?${query}` : ''}`;
  const res = await apiFetch(url, { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить список пакетов документов');
  return res.json();
}

export async function getContractDocumentPackage(id: string): Promise<ContractDocumentPackage> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/contract-document-packages/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить пакет документов');
  return res.json();
}

export async function createContractDocumentPackage(body: {
  kind: ContractDocumentPackageKind;
  title?: string;
  formData?: Record<string, unknown>;
  crmContractId?: string;
}): Promise<ContractDocumentPackage> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/contract-document-packages`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Не удалось создать пакет документов');
  return res.json();
}

export async function updateContractDocumentPackage(
  id: string,
  body: {
    title?: string | null;
    formData?: Record<string, unknown>;
    crmContractId?: string | null;
  }
): Promise<ContractDocumentPackage> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/contract-document-packages/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Не удалось сохранить пакет документов');
  return res.json();
}

export async function deleteContractDocumentPackage(id: string): Promise<void> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/contract-document-packages/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить пакет документов');
}

/** Общий шаблон договора для направления (подставляется, если у пакета нет своего HTML). */
export async function getContractDocumentGlobalTemplate(
  kind: ContractDocumentPackageKind,
  tab: string
): Promise<{ html: string | null; updatedAt: string | null }> {
  const qs = new URLSearchParams({ kind, tab });
  const url = `${getApiBaseUrl()}/admin/contract-document-packages/global-templates?${qs}`;
  const res = await apiFetch(url, { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить общий шаблон');
  return res.json();
}

export async function putContractDocumentGlobalTemplate(body: {
  kind: ContractDocumentPackageKind;
  tab: string;
  html: string;
}): Promise<{ id: string; kind: string; tab: string; updatedAt: string }> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/global-templates`,
    {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось сохранить общий шаблон');
  }
  return res.json();
}

export async function getContractDocumentExecutorProfiles(
  kind: ContractDocumentPackageKind
): Promise<{ items: ExecutorRequisiteProfile[]; updatedAt: string | null }> {
  const qs = new URLSearchParams({ kind });
  const url = `${getApiBaseUrl()}/admin/contract-document-packages/executor-profiles?${qs}`;
  const res = await apiFetch(url, { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить наши реквизиты');
  return res.json();
}

export async function putContractDocumentExecutorProfiles(body: {
  kind: ContractDocumentPackageKind;
  items: ExecutorRequisiteProfile[];
}): Promise<{ id: string; kind: string; tab: string; updatedAt: string }> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/executor-profiles`,
    {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось сохранить наши реквизиты');
  }
  return res.json();
}

export async function getContractDocumentSignatoryProfiles(
  kind: ContractDocumentPackageKind
): Promise<{ items: ContractSignatoryProfile[]; updatedAt: string | null }> {
  const qs = new URLSearchParams({ kind });
  const url = `${getApiBaseUrl()}/admin/contract-document-packages/signatory-profiles?${qs}`;
  const res = await apiFetch(url, { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить подписантов');
  return res.json();
}

export async function putContractDocumentSignatoryProfiles(body: {
  kind: ContractDocumentPackageKind;
  items: ContractSignatoryProfile[];
}): Promise<{ id: string; kind: string; tab: string; updatedAt: string }> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/signatory-profiles`,
    {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось сохранить подписантов');
  }
  return res.json();
}

export async function getContractDocumentTemplatePresets(
  kind: ContractDocumentPackageKind
): Promise<{ items: ContractTemplatePreset[]; updatedAt: string | null }> {
  const qs = new URLSearchParams({ kind });
  const url = `${getApiBaseUrl()}/admin/contract-document-packages/contract-templates?${qs}`;
  const res = await apiFetch(url, { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить шаблоны договора');
  return res.json();
}

export async function putContractDocumentTemplatePresets(body: {
  kind: ContractDocumentPackageKind;
  items: ContractTemplatePreset[];
}): Promise<{ id: string; kind: string; tab: string; updatedAt: string }> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/contract-templates`,
    {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось сохранить шаблоны договора');
  }
  return res.json();
}

export async function getContractDocumentEstimatePresets(
  kind: ContractDocumentPackageKind
): Promise<{
  items: ContractEstimatePreset[];
  groups: ContractEstimateGroup[];
  updatedAt: string | null;
}> {
  const qs = new URLSearchParams({ kind });
  const url = `${getApiBaseUrl()}/admin/contract-document-packages/estimate-presets?${qs}`;
  const res = await apiFetch(url, { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить расчёты');
  const data = (await res.json()) as {
    items?: ContractEstimatePreset[];
    groups?: ContractEstimateGroup[];
    updatedAt?: string | null;
  };
  return {
    items: Array.isArray(data.items) ? data.items : [],
    groups: Array.isArray(data.groups) ? data.groups : [],
    updatedAt: data.updatedAt ?? null,
  };
}

export async function putContractDocumentEstimatePresets(body: {
  kind: ContractDocumentPackageKind;
  items: ContractEstimatePreset[];
  groups?: ContractEstimateGroup[];
}): Promise<{ id: string; kind: string; tab: string; updatedAt: string }> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/estimate-presets`,
    {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось сохранить расчёты');
  }
  return res.json();
}
