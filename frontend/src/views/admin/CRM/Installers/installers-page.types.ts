import type { InstallerDirection } from '@/shared/api/admin-crm';

export type InstallerFormValues = {
  direction: InstallerDirection;
  fullName: string;
  grade: string;
};

export type InstallersPageMessage = {
  type: 'success' | 'error';
  text: string;
};
