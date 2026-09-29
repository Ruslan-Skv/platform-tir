import { UserRole } from '@prisma/client';

/** Роли, получающие колокольчик и уведомления админки (без стажёров). */
export const ADMIN_BELL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'PARTNER',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
];
