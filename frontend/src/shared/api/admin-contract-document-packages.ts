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

async function readAdminContractPackagesError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(j.message)) return j.message.join('; ');
    if (typeof j.message === 'string') return j.message;
  } catch {
    /* ignore */
  }
  return `Запрос не выполнен (HTTP ${res.status})`;
}

export type ContractDocumentPackageKind =
  | 'REPAIR'
  | 'WINDOWS'
  | 'DOORS'
  | 'CEILINGS'
  | 'BLINDS'
  | 'FURNITURE';

/** Стадия пакета: «в работе», договор подписан или отказ (фиксирует менеджер). */
export type ContractDocumentPackageStatus = 'IN_PROGRESS' | 'CONTRACT_CONCLUDED' | 'REFUSED';

export interface ContractDocumentPackageUserRef {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface ContractEstimatePresetsHistoryEntry {
  id: string;
  kind: ContractDocumentPackageKind;
  changedFields: string[];
  action: 'CREATE' | 'UPDATE' | 'ROLLBACK';
  changedAt: string;
  changedBy?: ContractDocumentPackageUserRef | null;
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

export interface ContractDocumentObjectRef {
  id: string;
  name: string;
  address: string | null;
  customerName: string | null;
}

export interface ContractDocumentPackage {
  id: string;
  kind: ContractDocumentPackageKind;
  title: string | null;
  /** По умолчанию на старых ответах API — «в работе». */
  status?: ContractDocumentPackageStatus;
  formData: Record<string, unknown>;
  documentObjectId?: string | null;
  documentObject?: ContractDocumentObjectRef | null;
  crmContractId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: ContractDocumentPackageUserRef | null;
  crmContract?: ContractDocumentPackageCrmContract | null;
  /** При `include` в списке пакетов — строки журнала оплат (только `amount`). */
  payments?: Array<{ amount: string | number }>;
  /** Число записей в журнале версий (для списка). Создание пакета всегда добавляет версию 1. */
  _count?: { versions: number };
}

export type ContractDocumentPackagePaymentForm =
  | 'CASH'
  | 'TERMINAL'
  | 'QR'
  | 'INVOICE'
  | 'LC_TRANSFER';

export type ContractDocumentPackagePaymentKind = 'PREPAYMENT' | 'ADVANCE' | 'FINAL' | 'AMENDMENT';

export interface ContractDocumentPackagePaymentUserRef {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** Журнал оплат по пакету документов (вкладка «Оплаты» в редакторе ремонта). */
export interface ContractDocumentPackagePayment {
  id: string;
  packageId: string;
  paymentDate: string;
  amount: string;
  paymentForm: ContractDocumentPackagePaymentForm;
  paymentType: ContractDocumentPackagePaymentKind;
  addendumNumber: number | null;
  basis: string | null;
  notes: string | null;
  recordedById: string | null;
  createdAt: string;
  updatedAt: string;
  recordedBy: ContractDocumentPackagePaymentUserRef | null;
}

export interface ContractDocumentPackagePaymentInput {
  paymentDate: string;
  amount: number;
  paymentForm: ContractDocumentPackagePaymentForm;
  paymentType: ContractDocumentPackagePaymentKind;
  addendumNumber?: number;
  basis?: string;
  notes?: string;
}

/** PATCH оплаты: допускаются null для сброса текстов и номера Д/с. */
export type ContractDocumentPackagePaymentPatch = Partial<{
  paymentDate: string;
  amount: number;
  paymentForm: ContractDocumentPackagePaymentForm;
  paymentType: ContractDocumentPackagePaymentKind;
  addendumNumber: number | null;
  basis: string | null;
  notes: string | null;
}>;

/** Запись журнала событий пакета (снимок метаданных без тела formData в списке). */
export interface ContractDocumentPackageVersionListItem {
  id: string;
  packageId: string;
  versionNumber: number;
  title: string | null;
  status: ContractDocumentPackageStatus;
  crmContractId: string | null;
  action?: 'CREATE' | 'UPDATE' | 'ROLLBACK';
  keyMoments?: string[];
  createdAt: string;
  savedBy?: ContractDocumentPackageUserRef | null;
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

/** Профиль менеджера (справочник). */
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
  /** Защита от удаления и от архивации без предварительного снятия. */
  isProtected?: boolean;
  /** Архив (скрыт из выбора; восстанавливается из библиотеки). */
  archived?: boolean;
}

/** Объект (здание / проект): группа расчётов в списке команды. */
export interface ContractEstimateGroup {
  id: string;
  title: string;
  updatedAt?: string;
  /** Доп. наценка на все расчёты объекта, % к цене каждой позиции (0 — без наценки). */
  additionalMarkupPercent?: number;
  /** Объект в архиве: скрыт в основном списке и в выборе при оформлении договоров. */
  archived?: boolean;
  /**
   * Порядок блока объекта в общей ленте (вместе с расчётами вне объекта): меньше — выше.
   * Если не задан — позиция по дате (режим сортировки на странице).
   */
  mergeListOrder?: number;
}

export interface ContractEstimatePreset {
  id: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  calculatorDraft: string;
  /** Для общего расчёта в админке: черновики по нескольким выбранным категориям. */
  calculatorDraftByCategory?: Record<string, string>;
  /** Для общего расчёта в админке: список категорий, вошедших в расчёт. */
  multiCategorySlugs?: string[];
  /** Ссылка на `ContractEstimateGroup.id`, если расчёт входит в объект. */
  groupId?: string;
  /**
   * Доп. наценка только на этот расчёт, % к цене каждой позиции.
   * Если не задано — для расчёта в объекте действует наценка объекта (`ContractEstimateGroup.additionalMarkupPercent`).
   */
  additionalMarkupPercent?: number;
  /** Замер-источник, если расчёт был создан из выполненного замера. */
  sourceMeasurementId?: string;
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
        /** Id позиции каталога; нужен для группировки по подкатегориям в модалке разделения сметы. */
        itemId?: string;
      }>;
    }>;
  } | null;
  /** Дата создания расчёта (ISO). Для старых записей может отсутствовать — тогда на списке используется эвристика по id или updatedAt. */
  createdAt?: string;
  updatedAt?: string;
  /**
   * Порядок в общей ленте для расчёта вне объекта: меньше — выше.
   * У расчётов внутри объекта не используется (см. `inGroupListOrder`).
   */
  mergeListOrder?: number;
  /** Порядок расчёта внутри объекта: меньше — выше. */
  inGroupListOrder?: number;
  /** Расчёт в архиве (отдельно от объекта): скрыт в основном списке и в выборе при оформлении договоров. */
  archived?: boolean;
  /**
   * Связка экземпляров одной «семьи» при разделении сметы по договорам.
   * У копий после первого сохранения границ работ совпадает с исходным расчётом.
   */
  splitBundleId?: string;
  /** ISO — расчёт в корзине (не возвращается в основном списке). */
  deletedAt?: string;
  deletedById?: string;
  /**
   * Id позиций (`wsl:<индекс помещения>:<индекс строки>`), включаемых в этот экземпляр для договора.
   * Если не задано — в договор попадает весь снимок сметы (как раньше). Пустой массив — ничего не включено (ожидается выбор в модалке).
   */
  estimateWorkScopeKeys?: string[];
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

export async function getContractDocumentPackagePayments(
  packageId: string
): Promise<ContractDocumentPackagePayment[]> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/payments`,
    {
      headers: getAdminAuthHeaders(),
    }
  );
  if (!res.ok) throw new Error(await readAdminContractPackagesError(res));
  return res.json();
}

export async function createContractDocumentPackagePayment(
  packageId: string,
  body: ContractDocumentPackagePaymentInput
): Promise<ContractDocumentPackagePayment> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/payments`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(await readAdminContractPackagesError(res));
  return res.json();
}

export async function updateContractDocumentPackagePayment(
  packageId: string,
  paymentId: string,
  body: ContractDocumentPackagePaymentPatch
): Promise<ContractDocumentPackagePayment> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/payments/${paymentId}`,
    {
      method: 'PATCH',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(await readAdminContractPackagesError(res));
  return res.json();
}

export async function deleteContractDocumentPackagePayment(
  packageId: string,
  paymentId: string
): Promise<void> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/payments/${paymentId}`,
    { method: 'DELETE', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readAdminContractPackagesError(res));
}

export async function getContractDocumentPackageVersions(
  packageId: string
): Promise<ContractDocumentPackageVersionListItem[]> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/versions`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error('Не удалось загрузить журнал событий');
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
    status?: ContractDocumentPackageStatus;
    /** Сохранить снимок в историю версий после успешного PATCH. */
    recordVersion?: boolean;
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

/** Фото акта начала работ для пакета «Ремонт»; файл сохраняется на сервере, в ответе — относительный `imageUrl`. */
export async function uploadRepairPackageWorkStartActPhoto(
  packageId: string,
  file: File
): Promise<{ imageUrl: string }> {
  const body = new FormData();
  body.append('file', file);
  const headers = getAdminAuthHeaders() as Record<string, string>;
  delete headers['Content-Type'];
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/upload-work-start-act-photo`,
    {
      method: 'POST',
      headers: { ...headers, Accept: 'application/json' },
      body,
    }
  );
  if (!res.ok) {
    throw new Error(await readAdminContractPackagesError(res));
  }
  return res.json() as Promise<{ imageUrl: string }>;
}

/** Фото акта сдачи-приёмки при закрытии договора «Ремонт»; в ответе — относительный `imageUrl`. */
export async function uploadRepairPackageContractCloseActPhoto(
  packageId: string,
  file: File
): Promise<{ imageUrl: string }> {
  const body = new FormData();
  body.append('file', file);
  const headers = getAdminAuthHeaders() as Record<string, string>;
  delete headers['Content-Type'];
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/upload-contract-close-act-photo`,
    {
      method: 'POST',
      headers: { ...headers, Accept: 'application/json' },
      body,
    }
  );
  if (!res.ok) {
    throw new Error(await readAdminContractPackagesError(res));
  }
  return res.json() as Promise<{ imageUrl: string }>;
}

export interface RepairContractPackageTrashRow {
  id: string;
  contractNumber: string;
  customerName: string;
  title: string | null;
  deletedAt: string;
  deletedBy: ContractDocumentPackageUserRef | null;
}

/** Переместить пакет документов в корзину (мягкое удаление). */
export async function trashContractDocumentPackage(id: string): Promise<void> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/contract-document-packages/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readAdminContractPackagesError(res));
}

/** @deprecated Используйте trashContractDocumentPackage */
export async function deleteContractDocumentPackage(id: string): Promise<void> {
  return trashContractDocumentPackage(id);
}

export async function getRepairContractPackageTrash(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: RepairContractPackageTrashRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const search = new URLSearchParams({ kind: 'REPAIR' });
  if (params?.search?.trim()) search.set('search', params.search.trim());
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(Math.min(params?.limit ?? 25, 100)));
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/trash?${search}`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readAdminContractPackagesError(res));
  return res.json();
}

export async function restoreRepairContractPackage(id: string): Promise<void> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${encodeURIComponent(id)}/restore`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
    }
  );
  if (!res.ok) throw new Error(await readAdminContractPackagesError(res));
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
  if (!res.ok) throw new Error('Не удалось загрузить менеджеров');
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
    throw new Error(err.message || 'Не удалось сохранить менеджеров');
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

export async function getContractDocumentEstimatePresetsHistory(
  kind: ContractDocumentPackageKind
): Promise<ContractEstimatePresetsHistoryEntry[]> {
  const qs = new URLSearchParams({ kind });
  const url = `${getApiBaseUrl()}/admin/contract-document-packages/estimate-presets/history?${qs}`;
  const res = await apiFetch(url, { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить историю изменений расчётов');
  return res.json();
}

export {
  type ContractEstimatePresetTrashRow,
  getContractDocumentEstimatePresetsTrash,
  restoreContractEstimatePreset,
  trashContractEstimatePreset,
} from './admin-contract-document-estimate-presets-trash';

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
    const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(err.message) ? err.message.join('. ') : err.message;
    throw new Error(msg || 'Не удалось сохранить расчёты');
  }
  return res.json();
}
