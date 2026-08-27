import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { KanbanCardPriority, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateKanbanBoardDto,
  CreateKanbanCardDto,
  CreateKanbanColumnDto,
  CreateKanbanCommentDto,
  MoveKanbanCardDto,
  UpdateKanbanBoardDto,
  UpdateKanbanCardDto,
  UpdateKanbanColumnDto,
} from './dto/kanban.dto';
import {
  KANBAN_TRASH_RETENTION_DAYS,
  KANBAN_TRASH_RETENTION_MS,
  KANBAN_USER_SELECT,
  kanbanPermanentDeleteAtIso,
} from './kanban.shared';

const DEFAULT_COLUMNS: Array<{ name: string; color: string; wipLimit: number | null }> = [
  { name: 'Бэклог', color: '#64748b', wipLimit: null },
  { name: 'В работе', color: '#2563eb', wipLimit: 5 },
  { name: 'На проверке', color: '#d97706', wipLimit: 3 },
  { name: 'Готово', color: '#16a34a', wipLimit: null },
];

const cardInclude = {
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

@Injectable()
export class KanbanService {
  constructor(private readonly prisma: PrismaService) {}

  private async purgeExpiredTrash() {
    const cutoff = new Date(Date.now() - KANBAN_TRASH_RETENTION_MS);
    await this.prisma.kanbanBoard.deleteMany({
      where: { deletedAt: { lt: cutoff } },
    });
  }

  async listBoards() {
    const boards = await this.prisma.kanbanBoard.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { columns: true } },
        columns: {
          select: {
            id: true,
            _count: { select: { cards: true } },
          },
        },
      },
    });

    return boards.map((board) => ({
      id: board.id,
      name: board.name,
      description: board.description,
      color: board.color,
      sortOrder: board.sortOrder,
      createdById: board.createdById,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      columnsCount: board._count.columns,
      cardsCount: board.columns.reduce((sum, col) => sum + col._count.cards, 0),
    }));
  }

  async createBoard(userId: string, dto: CreateKanbanBoardDto) {
    const maxSort = await this.prisma.kanbanBoard.aggregate({
      where: { deletedAt: null },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    return this.prisma.kanbanBoard.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        color: dto.color?.trim() || '#0f766e',
        sortOrder,
        createdById: userId,
        columns: {
          create: DEFAULT_COLUMNS.map((col, index) => ({
            name: col.name,
            color: col.color,
            wipLimit: col.wipLimit,
            sortOrder: index,
          })),
        },
      },
      include: {
        columns: {
          orderBy: { sortOrder: 'asc' },
          include: { cards: { include: cardInclude, orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
  }

  async getBoard(boardId: string, opts?: { includeDeleted?: boolean }) {
    const board = await this.prisma.kanbanBoard.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { sortOrder: 'asc' },
          include: {
            cards: {
              orderBy: { sortOrder: 'asc' },
              include: cardInclude,
            },
          },
        },
      },
    });
    if (!board || (!opts?.includeDeleted && board.deletedAt)) {
      throw new NotFoundException('Доска не найдена');
    }
    return board;
  }

  async updateBoard(boardId: string, dto: UpdateKanbanBoardDto) {
    await this.ensureBoard(boardId);
    return this.prisma.kanbanBoard.update({
      where: { id: boardId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.color !== undefined ? { color: dto.color?.trim() || null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async deleteBoard(boardId: string, actorUserId: string) {
    await this.ensureBoard(boardId);
    await this.prisma.kanbanBoard.update({
      where: { id: boardId },
      data: { deletedAt: new Date(), deletedById: actorUserId },
    });
    return { ok: true };
  }

  async trashCount() {
    await this.purgeExpiredTrash();
    return this.prisma.kanbanBoard.count({
      where: { deletedAt: { not: null } },
    });
  }

  async findTrash(params: { search?: string; page?: number; limit?: number }) {
    await this.purgeExpiredTrash();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 15));
    const search = params.search?.trim();
    const where: Prisma.KanbanBoardWhereInput = {
      deletedAt: { not: null },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.kanbanBoard.findMany({
        where,
        include: {
          deletedBy: { select: KANBAN_USER_SELECT },
          _count: { select: { columns: true } },
          columns: {
            select: { id: true, _count: { select: { cards: true } } },
          },
        },
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.kanbanBoard.count({ where }),
    ]);

    return {
      data: items.map((board) => ({
        id: board.id,
        name: board.name,
        description: board.description,
        color: board.color,
        deletedAt: board.deletedAt,
        deletedBy: board.deletedBy,
        columnsCount: board._count.columns,
        cardsCount: board.columns.reduce((sum, col) => sum + col._count.cards, 0),
        permanentDeleteAt: board.deletedAt ? kanbanPermanentDeleteAtIso(board.deletedAt) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      trashRetentionDays: KANBAN_TRASH_RETENTION_DAYS,
    };
  }

  async restoreBoard(boardId: string) {
    const board = await this.getBoard(boardId, { includeDeleted: true });
    if (!board.deletedAt) {
      throw new BadRequestException('Доска не в корзине');
    }
    await this.prisma.kanbanBoard.update({
      where: { id: boardId },
      data: { deletedAt: null, deletedById: null },
    });
    return this.getBoard(boardId);
  }

  async createColumn(boardId: string, dto: CreateKanbanColumnDto) {
    await this.ensureBoard(boardId);
    const maxSort = await this.prisma.kanbanColumn.aggregate({
      where: { boardId },
      _max: { sortOrder: true },
    });
    return this.prisma.kanbanColumn.create({
      data: {
        boardId,
        name: dto.name.trim(),
        color: dto.color?.trim() || null,
        wipLimit: dto.wipLimit ?? null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: { cards: { include: cardInclude, orderBy: { sortOrder: 'asc' } } },
    });
  }

  async updateColumn(columnId: string, dto: UpdateKanbanColumnDto) {
    await this.ensureColumn(columnId);
    return this.prisma.kanbanColumn.update({
      where: { id: columnId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color?.trim() || null } : {}),
        ...(dto.wipLimit !== undefined ? { wipLimit: dto.wipLimit } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      include: { cards: { include: cardInclude, orderBy: { sortOrder: 'asc' } } },
    });
  }

  async deleteColumn(columnId: string) {
    const column = await this.ensureColumn(columnId);
    const cardsCount = await this.prisma.kanbanCard.count({ where: { columnId } });
    if (cardsCount > 0) {
      throw new BadRequestException(
        'Нельзя удалить колонку с карточками. Сначала переместите или удалите карточки.',
      );
    }
    const boardColumns = await this.prisma.kanbanColumn.count({
      where: { boardId: column.boardId },
    });
    if (boardColumns <= 1) {
      throw new BadRequestException('На доске должна остаться хотя бы одна колонка');
    }
    await this.prisma.kanbanColumn.delete({ where: { id: columnId } });
    return { ok: true };
  }

  async reorderColumns(boardId: string, columnIds: string[]) {
    await this.ensureBoard(boardId);
    const columns = await this.prisma.kanbanColumn.findMany({
      where: { boardId },
      select: { id: true },
    });
    const existing = new Set(columns.map((c) => c.id));
    if (columnIds.length !== existing.size || columnIds.some((id) => !existing.has(id))) {
      throw new BadRequestException('Список колонок не совпадает с доской');
    }
    await this.prisma.$transaction(
      columnIds.map((id, index) =>
        this.prisma.kanbanColumn.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.getBoard(boardId);
  }

  async createCard(columnId: string, userId: string, dto: CreateKanbanCardDto) {
    await this.ensureColumn(columnId);
    const maxSort = await this.prisma.kanbanCard.aggregate({
      where: { columnId },
      _max: { sortOrder: true },
    });
    return this.prisma.kanbanCard.create({
      data: {
        columnId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        priority: dto.priority ?? KanbanCardPriority.MEDIUM,
        labels: (dto.labels ?? []).map((l) => l.trim()).filter(Boolean),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId || null,
        checklist: dto.checklist
          ? (dto.checklist.map((item) => ({
              id: item.id,
              text: item.text,
              done: Boolean(item.done),
            })) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        createdById: userId,
      },
      include: cardInclude,
    });
  }

  async updateCard(cardId: string, dto: UpdateKanbanCardDto) {
    await this.ensureCard(cardId);
    return this.prisma.kanbanCard.update({
      where: { id: cardId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.labels !== undefined
          ? { labels: dto.labels.map((l) => l.trim()).filter(Boolean) }
          : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId || null } : {}),
        ...(dto.checklist !== undefined
          ? {
              checklist: dto.checklist
                ? (dto.checklist.map((item) => ({
                    id: item.id,
                    text: item.text,
                    done: Boolean(item.done),
                  })) as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      include: cardInclude,
    });
  }

  async deleteCard(cardId: string) {
    await this.ensureCard(cardId);
    await this.prisma.kanbanCard.delete({ where: { id: cardId } });
    return { ok: true };
  }

  async moveCard(cardId: string, dto: MoveKanbanCardDto) {
    const card = await this.ensureCard(cardId);
    const targetColumn = await this.ensureColumn(dto.columnId);

    const sourceColumnId = card.columnId;
    const targetColumnId = targetColumn.id;

    const targetCards = await this.prisma.kanbanCard.findMany({
      where: { columnId: targetColumnId, NOT: { id: cardId } },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });

    const insertAt =
      dto.sortOrder === undefined
        ? targetCards.length
        : Math.max(0, Math.min(dto.sortOrder, targetCards.length));

    const reorderedTarget = [
      ...targetCards.slice(0, insertAt).map((c) => c.id),
      cardId,
      ...targetCards.slice(insertAt).map((c) => c.id),
    ];

    await this.prisma.$transaction(async (tx) => {
      if (sourceColumnId !== targetColumnId) {
        await tx.kanbanCard.update({
          where: { id: cardId },
          data: { columnId: targetColumnId, sortOrder: insertAt },
        });

        const sourceCards = await tx.kanbanCard.findMany({
          where: { columnId: sourceColumnId },
          orderBy: { sortOrder: 'asc' },
          select: { id: true },
        });
        await Promise.all(
          sourceCards.map((c, index) =>
            tx.kanbanCard.update({ where: { id: c.id }, data: { sortOrder: index } }),
          ),
        );
      }

      await Promise.all(
        reorderedTarget.map((id, index) =>
          tx.kanbanCard.update({
            where: { id },
            data: { columnId: targetColumnId, sortOrder: index },
          }),
        ),
      );
    });

    return this.prisma.kanbanCard.findUniqueOrThrow({
      where: { id: cardId },
      include: cardInclude,
    });
  }

  async addComment(cardId: string, authorId: string, dto: CreateKanbanCommentDto) {
    await this.ensureCard(cardId);
    return this.prisma.kanbanCardComment.create({
      data: {
        cardId,
        authorId,
        body: dto.body.trim(),
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
        },
      },
    });
  }

  async deleteComment(commentId: string) {
    const comment = await this.prisma.kanbanCardComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Комментарий не найден');
    await this.prisma.kanbanCardComment.delete({ where: { id: commentId } });
    return { ok: true };
  }

  private async ensureBoard(boardId: string) {
    const board = await this.prisma.kanbanBoard.findUnique({ where: { id: boardId } });
    if (!board || board.deletedAt) throw new NotFoundException('Доска не найдена');
    return board;
  }

  private async ensureColumn(columnId: string) {
    const column = await this.prisma.kanbanColumn.findUnique({
      where: { id: columnId },
      include: { board: { select: { deletedAt: true } } },
    });
    if (!column || column.board.deletedAt) throw new NotFoundException('Колонка не найдена');
    return column;
  }

  private async ensureCard(cardId: string) {
    const card = await this.prisma.kanbanCard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Карточка не найдена');
    return card;
  }
}
