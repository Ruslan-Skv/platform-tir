import { UserRole, type WorkDaySettings } from '@prisma/client';

export const DEFAULT_WORK_DAY_SETTINGS: Omit<WorkDaySettings, 'createdAt' | 'updatedAt'> = {
  id: 'main',
  isEnabled: true,
  trackedRoles: [UserRole.MANAGER],
  blockAdminWithoutWorkDay: true,
  requireOfficeIp: true,
  blockMobileDevices: true,
  autoCloseHour: 22,
  autoCloseMinute: 0,
  defaultGracePeriodMinutes: 10,
  greetingMessages: [
    'Доброго дня, {имя}! Желаем продуктивной работы.',
    'С добрым утром, {имя}! Отличного рабочего дня!',
    '{имя}, желаем хорошего дня и отличной работы!',
  ],
};

export const WORK_DAY_RECORD_INCLUDE = {
  office: { select: { id: true, name: true, prefix: true } },
  absences: { orderBy: { startedAt: 'asc' as const } },
} as const;
