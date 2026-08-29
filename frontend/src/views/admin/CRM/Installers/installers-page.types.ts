import type { InstallerDirection } from '@/shared/api/admin-crm';

export type InstallerFormValues = {
  direction: InstallerDirection;
  fullName: string;
  grade: string;
  phones: string[];
  /** Пустая строка = без привязки к аккаунту. */
  userId: string;
};

export type InstallersPageMessage = {
  type: 'success' | 'error';
  text: string;
};
