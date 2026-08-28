import { Prisma } from '@prisma/client';

export const KANBAN_TRASH_RETENTION_DAYS = 30;
export const KANBAN_TRASH_RETENTION_MS = KANBAN_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const KANBAN_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

export const KANBAN_CARD_INCLUDE = {
  assignee: {
    select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
      },
    },
  },
} satisfies Prisma.KanbanCardInclude;

export function kanbanPermanentDeleteAtIso(deletedAt: Date): string {
  return new Date(deletedAt.getTime() + KANBAN_TRASH_RETENTION_MS).toISOString();
}
