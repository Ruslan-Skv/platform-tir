import {
  type ContractDocumentObject,
  autoSyncContractDocumentObjects,
  getContractDocumentObjects,
} from '@/shared/api/admin-contract-document-objects';
import {
  type ContractDocumentPackage,
  type ContractEstimatePreset,
  type ContractSignatoryProfile,
  getContractDocumentEstimatePresets,
  getContractDocumentPackages,
  getContractDocumentSignatoryProfiles,
} from '@/shared/api/admin-contract-document-packages';
import {
  type CrmDirection,
  type CrmUser,
  type Measurement,
  getCrmDirections,
  getCrmUsers,
  getMeasurements,
} from '@/shared/api/admin-crm';

export type ContractsListLoadResult = {
  rows: ContractDocumentPackage[];
  documentObjects: ContractDocumentObject[];
  crmUsers: CrmUser[];
  directions: CrmDirection[];
  managerOptions: ContractSignatoryProfile[];
  estimatePresets: ContractEstimatePreset[];
  measurementsById: Map<string, Measurement>;
};

export async function loadContractsListData(): Promise<ContractsListLoadResult> {
  try {
    await autoSyncContractDocumentObjects();
  } catch {
    /* группировка по адресу не должна блокировать список */
  }
  const [rows, objects, users, dirs, signatories, presetsRes, measurementsRes] = await Promise.all([
    getContractDocumentPackages(),
    getContractDocumentObjects().catch(() => [] as ContractDocumentObject[]),
    getCrmUsers().catch(() => [] as CrmUser[]),
    getCrmDirections().catch(() => [] as CrmDirection[]),
    getContractDocumentSignatoryProfiles('REPAIR').catch(() => ({
      items: [] as ContractSignatoryProfile[],
      updatedAt: null,
    })),
    getContractDocumentEstimatePresets('REPAIR').catch(() => ({
      items: [] as ContractEstimatePreset[],
      groups: [],
      updatedAt: null,
    })),
    getMeasurements({ page: 1, limit: 500 }).catch(() => ({
      data: [] as Measurement[],
      total: 0,
      page: 1,
      limit: 500,
      totalPages: 0,
    })),
  ]);
  const profiles = (signatories.items ?? [])
    .filter((p) => Boolean(p.crmUserId?.trim()))
    .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru', { sensitivity: 'base' }));

  return {
    rows,
    documentObjects: objects,
    crmUsers: users,
    directions: dirs,
    managerOptions: profiles,
    estimatePresets: presetsRes.items ?? [],
    measurementsById: new Map(measurementsRes.data.map((m) => [m.id, m])),
  };
}
