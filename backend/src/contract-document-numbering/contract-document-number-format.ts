import { ContractDocumentPackageKind } from '@prisma/client';

import { PACKAGE_KIND_DIRECTION_SLUG } from '../common/config/package-direction-registry.config';

export { PACKAGE_KIND_DIRECTION_SLUG };

export type ContractNumberPreviewInput = {
  managerUserId: string;
  surveyorUserId: string;
  officeId: string;
  kind: ContractDocumentPackageKind;
  /** Если задано — подставляется вместо буквы CRM-направления. */
  numberLetterOverride?: string;
};

export type ContractNumberParts = {
  managerUserId: string;
  directionId: string;
  directionName: string;
  officePrefix: string;
  managerCode: string;
  surveyorCode: string;
  directionLetter: string;
  officeName: string;
  managerName: string;
  surveyorName: string;
};

export type ContractNumberPreviewResult = {
  ok: boolean;
  recommendedNumber: string | null;
  nextSequence: number | null;
  error: string | null;
  officePrefix: string | null;
  managerCode: string | null;
  surveyorCode: string | null;
  directionLetter: string | null;
  directionId: string | null;
  directionName: string | null;
  officeName: string | null;
  managerName: string | null;
  surveyorName: string | null;
};

export type ContractNumberResolveError = {
  error: string;
  officePrefix: string | null;
  managerCode: string | null;
  surveyorCode: string | null;
  directionLetter: string | null;
  directionId: string | null;
  directionName: string | null;
  officeName: string | null;
  managerName: string | null;
  surveyorName: string | null;
};

export function formatContractNumberUserName(u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [u.lastName, u.firstName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

export function composeContractNumber(parts: {
  officePrefix: string;
  managerCode: string;
  surveyorCode: string;
  directionLetter: string;
  sequence: number;
}): string {
  return `${parts.officePrefix}/${parts.managerCode}/${parts.surveyorCode}${parts.directionLetter}-${parts.sequence}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Номер вида «77/5/2д-3» для текущих кодов офиса/менеджера/замерщика/буквы. */
export function isSystemContractNumberFormat(
  number: string,
  parts: {
    officePrefix: string;
    managerCode: string;
    surveyorCode: string;
    directionLetter: string;
  },
): boolean {
  if (!parts.officePrefix || !parts.managerCode || !parts.surveyorCode || !parts.directionLetter) {
    return false;
  }
  const re = new RegExp(
    `^${escapeRegExp(parts.officePrefix)}/${escapeRegExp(parts.managerCode)}/${escapeRegExp(parts.surveyorCode)}${escapeRegExp(parts.directionLetter)}-\\d+$`,
  );
  return re.test(number.trim());
}

export function emptyPreviewErrorResult(
  resolved: ContractNumberResolveError,
): ContractNumberPreviewResult {
  return {
    ok: false,
    recommendedNumber: null,
    nextSequence: null,
    error: resolved.error,
    officePrefix: resolved.officePrefix,
    managerCode: resolved.managerCode,
    surveyorCode: resolved.surveyorCode,
    directionLetter: resolved.directionLetter,
    directionId: resolved.directionId,
    directionName: resolved.directionName,
    officeName: resolved.officeName,
    managerName: resolved.managerName,
    surveyorName: resolved.surveyorName,
  };
}
