import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';
import type { CrmUser } from '@/shared/api/admin-crm';
import { getRoleLabel } from '@/shared/config/admin-roles';

export function formatCrmUserLabel(u: CrmUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  const base = name ? `${name} (${u.email})` : u.email;
  const roleLabel = getRoleLabel(u.role);
  return roleLabel ? `${base} · ${roleLabel}` : base;
}

export function normalizeSignatoryProfile(
  profile: ContractSignatoryProfile
): ContractSignatoryProfile {
  const crmUserId = profile.crmUserId?.trim();
  const officeId = profile.officeId?.trim();
  return {
    ...profile,
    title: profile.title.trim(),
    ...(crmUserId ? { crmUserId } : {}),
    ...(officeId ? { officeId } : { officeId: undefined }),
    salesOffice: profile.salesOffice?.trim() || '',
    officePhone: profile.officePhone?.trim() || '',
  };
}
