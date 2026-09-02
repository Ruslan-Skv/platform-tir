import type { InstallerDirection } from '@/shared/api/admin-crm';

import { DIRECTION_OPTIONS, INSTALLER_GRADE_NOT_USED } from './installers-page.constants';

export function isRepairInstallerDirection(
  directions: InstallerDirection | InstallerDirection[]
): boolean {
  if (Array.isArray(directions)) return directions.includes('REPAIR');
  return directions === 'REPAIR';
}

export function installerHasDirection(
  directions: InstallerDirection[] | undefined | null,
  direction: InstallerDirection
): boolean {
  return (directions ?? []).includes(direction);
}

/** Направления в каноническом порядке справочника. */
export function normalizeInstallerDirections(
  directions: InstallerDirection[]
): InstallerDirection[] {
  const set = new Set(directions);
  return DIRECTION_OPTIONS.map((opt) => opt.value).filter((value) => set.has(value));
}

export function gradeForApi(
  directions: InstallerDirection | InstallerDirection[],
  grade: string
): string {
  return isRepairInstallerDirection(directions) ? grade.trim() : INSTALLER_GRADE_NOT_USED;
}

export function gradeForForm(
  directions: InstallerDirection | InstallerDirection[],
  grade: string
): string {
  if (!isRepairInstallerDirection(directions)) return '';
  if (grade === INSTALLER_GRADE_NOT_USED) return '';
  return grade;
}

export function extractGradeRank(value: string): number {
  const match = value.match(/\d+/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(match[0], 10);
}
