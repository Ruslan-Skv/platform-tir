import type { InstallerDirection } from '@/shared/api/admin-crm';

import type { InstallerFormValues } from './installers-page.types';

export const DIRECTION_LABELS: Record<InstallerDirection, string> = {
  REPAIR: 'Ремонт',
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Натяжные потолки',
  FURNITURE: 'Мебель',
  BLINDS: 'Жалюзи',
};

export const DIRECTION_OPTIONS: Array<{ value: InstallerDirection; label: string }> = [
  { value: 'REPAIR', label: DIRECTION_LABELS.REPAIR },
  { value: 'WINDOWS', label: DIRECTION_LABELS.WINDOWS },
  { value: 'DOORS', label: DIRECTION_LABELS.DOORS },
  { value: 'CEILINGS', label: DIRECTION_LABELS.CEILINGS },
  { value: 'FURNITURE', label: DIRECTION_LABELS.FURNITURE },
  { value: 'BLINDS', label: DIRECTION_LABELS.BLINDS },
];

/** В БД поле обязательное; для направлений кроме «Ремонт» сохраняем заглушку. */
export const INSTALLER_GRADE_NOT_USED = '—';

export const EMPTY_INSTALLER_FORM: InstallerFormValues = {
  direction: 'REPAIR',
  fullName: '',
  grade: '',
};
