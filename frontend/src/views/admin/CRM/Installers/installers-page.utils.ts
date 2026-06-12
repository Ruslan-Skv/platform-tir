import type { InstallerDirection } from '@/shared/api/admin-crm';

import { INSTALLER_GRADE_NOT_USED } from './installers-page.constants';

export function isRepairInstallerDirection(direction: InstallerDirection): boolean {
  return direction === 'REPAIR';
}

export function gradeForApi(direction: InstallerDirection, grade: string): string {
  return isRepairInstallerDirection(direction) ? grade.trim() : INSTALLER_GRADE_NOT_USED;
}

export function gradeForForm(direction: InstallerDirection, grade: string): string {
  if (!isRepairInstallerDirection(direction)) return '';
  if (grade === INSTALLER_GRADE_NOT_USED) return '';
  return grade;
}

export function extractGradeRank(value: string): number {
  const match = value.match(/\d+/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(match[0], 10);
}
