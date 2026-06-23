import { UserRole } from '@prisma/client';

/** Роли, имеющие доступ к админке (кроме обычных USER/GUEST). */
export const ADMIN_ROLES: UserRole[] = [
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
  'TRAINEE',
];
