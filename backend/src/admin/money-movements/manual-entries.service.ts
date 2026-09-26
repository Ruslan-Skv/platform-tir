import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentForm, PaymentType, Prisma } from '@prisma/client';

import {
  DP_FURNITURE_DIRECTION,
  DP_MANUAL_DIRECTION_OTHER,
  MANUAL_MONEY_MOVEMENT_DIRECTIONS,
} from '../../common/config/package-direction-registry.config';
import { PrismaService } from '../../database/prisma.service';
import { CreateManualMoneyMovementDto } from './dto/create-manual-money-movement.dto';
import { serializeMoneyMovement, serializeMoneyMovementTrash } from './money-movement-serialize';

const USER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

const TRASH_INCLUDE = {
  manager: { select: USER_SELECT },
  createdBy: { select: USER_SELECT },
  deletedBy: { select: USER_SELECT },
} satisfies Prisma.MoneyMovementInclude;

@Injectable()
export class ManualEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ручная запись (проводка) в журнале ДП: изъятие из кассы (amount < 0, например на бытовые
   * нужды) или внесение сумм, не проведённых в оплатах по договорам (amount > 0).
   * Наличные записи участвуют в остатке наличных менеджера для инкассации.
   */
  async createManualEntry(dto: CreateManualMoneyMovementDto, currentUserId?: string) {
    if (!currentUserId) throw new UnauthorizedException('Пользователь не определён');

    const managerId = dto.managerId?.trim() || currentUserId;
    const managerExists = await this.prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true },
    });
    if (!managerExists) throw new BadRequestException('Указанный менеджер не найден');

    const direction = this.normalizeDirection(dto.direction);

    // № договора и заказчик — только у записей по направлениям и «Материалам»;
    // «Прочее» — движения вне договоров, поля договора не сохраняем.
    const withContract = this.hasContractFields(direction);
    // Исполнитель — только у «Мебели» (выбирается из справочника реквизитов исполнителей).
    const withExecutor = this.hasExecutorField(direction);

    const row = await this.prisma.moneyMovement.create({
      data: {
        sourceId: null,
        packageId: null,
        // Дата и время записи — текущий момент сервера, клиент их не выбирает.
        paymentDate: new Date(),
        performedAt: new Date(),
        amount: dto.amount,
        paymentForm: dto.paymentForm,
        paymentType: PaymentType.OTHER,
        basis: dto.basis.trim(),
        notes: dto.notes?.trim() || null,
        managerId,
        direction,
        office: null,
        contractNumber: withContract ? dto.contractNumber?.trim() || null : null,
        customerName: withContract ? dto.customerName?.trim() || null : null,
        executorName: withExecutor ? dto.executorName?.trim() || null : null,
        createdById: currentUserId,
      },
      include: { manager: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    return serializeMoneyMovement(row);
  }

  /**
   * Правка ручной записи журнала ДП — только супер-админ (исправление ошибок,
   * допущенных другими пользователями). Автоматические записи по оплатам
   * договоров редактировать нельзя: они производные оплат.
   *
   * Изменённые поля запоминаются в originalValues: поле → значение до первой
   * правки (журнал показывает значок «было …»). Если поле вернули к исходному
   * значению — пометка снимается.
   */
  async updateManualEntry(id: string, dto: CreateManualMoneyMovementDto) {
    const existing = await this.prisma.moneyMovement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Запись журнала ДП не найдена');
    if (existing.deletedAt) {
      throw new BadRequestException('Запись удалена в корзину и не редактируется');
    }
    if (existing.paymentType !== PaymentType.OTHER || existing.sourceId !== null) {
      throw new BadRequestException('Редактировать можно только ручные записи');
    }

    const managerId = dto.managerId?.trim() || existing.managerId;
    if (managerId) {
      const managerExists = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true },
      });
      if (!managerExists) throw new BadRequestException('Указанный менеджер не найден');
    }

    const direction = this.normalizeDirection(dto.direction);
    const withContract = this.hasContractFields(direction);
    const withExecutor = this.hasExecutorField(direction);

    // Дата записи клиентом не правится: без поля в запросе сохраняем прежнюю.
    const paymentDate =
      dto.paymentDate !== undefined ? new Date(dto.paymentDate) : existing.paymentDate;
    const basis = dto.basis.trim();
    const notes = dto.notes?.trim() || null;
    const contractNumber = withContract ? dto.contractNumber?.trim() || null : null;
    const customerName = withContract ? dto.customerName?.trim() || null : null;
    const executorName = withExecutor ? dto.executorName?.trim() || null : null;

    const originalValues = await this.collectOriginalValues(existing, {
      managerId,
      paymentDate,
      amount: dto.amount,
      paymentForm: dto.paymentForm,
      direction,
      contractNumber,
      customerName,
      executorName,
      basis,
      notes,
    });

    // performedAt не трогаем — это время исходного проведения записи.
    const row = await this.prisma.moneyMovement.update({
      where: { id },
      data: {
        paymentDate,
        amount: dto.amount,
        paymentForm: dto.paymentForm,
        basis,
        notes,
        managerId,
        direction,
        contractNumber,
        customerName,
        executorName,
        ...(originalValues ? { originalValues } : { originalValues: Prisma.DbNull }),
      },
      include: { manager: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    return serializeMoneyMovement(row);
  }

  /**
   * Удаление ручной записи в корзину ДП. Сотрудник удаляет только свои записи
   * (он менеджер записи или автор) и только сделанные в текущем месяце;
   * супер-админ — любые ручные записи без ограничения по сроку. Автоматические
   * записи по оплатам договоров удалять нельзя: они производные оплат.
   * Записи из корзины не восстанавливаются.
   */
  async removeManualEntry(id: string, user: { id: string; role: string }) {
    const existing = await this.prisma.moneyMovement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Запись журнала ДП не найдена');
    if (existing.paymentType !== PaymentType.OTHER || existing.sourceId !== null) {
      throw new BadRequestException('Удалять можно только ручные записи');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Запись уже удалена в корзину');
    }

    if (user.role !== 'SUPER_ADMIN') {
      const isOwn = existing.managerId === user.id || existing.createdById === user.id;
      if (!isOwn) {
        throw new ForbiddenException('Сотрудники могут удалять только свои записи');
      }
      if (existing.performedAt < this.currentMonthStart()) {
        throw new BadRequestException(
          'Удалять можно только записи, сделанные в текущем месяце. Обратитесь к супер-администратору',
        );
      }
    }

    const row = await this.prisma.moneyMovement.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.id },
      include: TRASH_INCLUDE,
    });
    return serializeMoneyMovementTrash(row);
  }

  /**
   * Корзина ДП: удалённые ручные записи с полной информацией. Супер-админ видит
   * все записи, сотрудники — только свои (где они менеджер или автор записи).
   */
  async findTrash(
    params: { search?: string; page?: number; limit?: number },
    user: { id: string; role: string },
  ) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 15, 1), 50);
    const search = params.search?.trim();
    const where: Prisma.MoneyMovementWhereInput = {
      deletedAt: { not: null },
      // Права и поиск объединяем через AND: у каждого своё OR, ключ OR один раз занять нельзя.
      AND: [
        ...(user.role !== 'SUPER_ADMIN'
          ? [
              {
                OR: [{ managerId: user.id }, { createdById: user.id }],
              } as Prisma.MoneyMovementWhereInput,
            ]
          : []),
        ...(search
          ? [
              {
                OR: [
                  { basis: { contains: search, mode: 'insensitive' } },
                  { notes: { contains: search, mode: 'insensitive' } },
                  { contractNumber: { contains: search, mode: 'insensitive' } },
                  { customerName: { contains: search, mode: 'insensitive' } },
                ],
              } as Prisma.MoneyMovementWhereInput,
            ]
          : []),
      ],
    };

    const [total, data] = await Promise.all([
      this.prisma.moneyMovement.count({ where }),
      this.prisma.moneyMovement.findMany({
        where,
        include: TRASH_INCLUDE,
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: data.map((row) => serializeMoneyMovementTrash(row)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /** Число записей в корзине текущего пользователя (супер-админ — во всей корзине). */
  async trashCount(user: { id: string; role: string }) {
    const where: Prisma.MoneyMovementWhereInput = {
      deletedAt: { not: null },
      ...(user.role !== 'SUPER_ADMIN'
        ? { OR: [{ managerId: user.id }, { createdById: user.id }] }
        : {}),
    };
    const count = await this.prisma.moneyMovement.count({ where });
    return { count };
  }

  /** Начало текущего месяца (локальное время сервера) — граница удаления для сотрудников. */
  private currentMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /** Направление ручной записи: направление договоров, «Материалы» или «Прочее». */
  private normalizeDirection(raw: string | undefined): string | null {
    const direction = raw?.trim() || null;
    if (direction && !MANUAL_MONEY_MOVEMENT_DIRECTIONS.includes(direction)) {
      throw new BadRequestException(
        `Неизвестное направление «${direction}»: выберите направление договоров, «Материалы» или «Прочее»`,
      );
    }
    return direction;
  }

  /** № договора и заказчик — у записей по направлениям и «Материалам» (не «Прочее»). */
  private hasContractFields(direction: string | null): boolean {
    return Boolean(direction) && direction !== DP_MANUAL_DIRECTION_OTHER;
  }

  /** Исполнитель — только у записей направления «Мебель». */
  private hasExecutorField(direction: string | null): boolean {
    return direction === DP_FURNITURE_DIRECTION;
  }

  /**
   * Считает originalValues для правки: для каждого изменившегося поля — его
   * значение до правки (если ещё не запоминалось), для возвращённого к исходному
   * значению — убирает пометку. null — правок не осталось.
   */
  private async collectOriginalValues(
    existing: Prisma.MoneyMovementGetPayload<null>,
    next: {
      managerId: string | null;
      paymentDate: Date;
      amount: number;
      paymentForm: PaymentForm;
      direction: string | null;
      contractNumber: string | null;
      customerName: string | null;
      executorName: string | null;
      basis: string;
      notes: string | null;
    },
  ): Promise<Record<string, string | null> | null> {
    const original = {
      ...((existing.originalValues as Record<string, string | null> | null) ?? {}),
    };

    const norm = (value: unknown): string | null =>
      value == null || String(value).trim() === '' ? null : String(value).trim();

    // Менеджера показываем именем: имена старого и нового менеджера записи.
    const managerIds = [existing.managerId, next.managerId].filter((id): id is string =>
      Boolean(id),
    );
    const managerUsers = managerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: [...new Set(managerIds)] } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];
    const managerNameById = new Map(
      managerUsers.map((u) => [
        u.id,
        [u.lastName, u.firstName].filter(Boolean).join(' ').trim() || u.email,
      ]),
    );
    const oldManagerName = existing.managerId
      ? (managerNameById.get(existing.managerId) ?? null)
      : null;
    const newManagerName = next.managerId ? (managerNameById.get(next.managerId) ?? null) : null;

    // Поле → { изменилось ли (для запоминания первого значения),
    // исходное значение до правки, новое значение равно запомненному исходному }.
    const fields: Record<
      string,
      { changed: boolean; fallback: string | null; backToOriginal: boolean }
    > = {
      managerName: {
        changed: oldManagerName !== newManagerName,
        fallback: oldManagerName,
        backToOriginal: newManagerName === (original.managerName ?? null),
      },
      amount: {
        changed: !existing.amount.equals(next.amount),
        fallback: existing.amount.toString(),
        backToOriginal: Number(original.amount) === next.amount,
      },
      paymentForm: {
        changed: existing.paymentForm !== next.paymentForm,
        fallback: existing.paymentForm,
        backToOriginal: original.paymentForm === next.paymentForm,
      },
      paymentDate: {
        changed:
          existing.paymentDate.toISOString().slice(0, 10) !==
          next.paymentDate.toISOString().slice(0, 10),
        fallback: existing.paymentDate.toISOString().slice(0, 10),
        backToOriginal: original.paymentDate === next.paymentDate.toISOString().slice(0, 10),
      },
      direction: {
        changed: (existing.direction ?? null) !== next.direction,
        fallback: existing.direction ?? null,
        backToOriginal: norm(original.direction) === norm(next.direction),
      },
      contractNumber: {
        changed: (existing.contractNumber ?? null) !== next.contractNumber,
        fallback: existing.contractNumber ?? null,
        backToOriginal: norm(original.contractNumber) === norm(next.contractNumber),
      },
      customerName: {
        changed: (existing.customerName ?? null) !== next.customerName,
        fallback: existing.customerName ?? null,
        backToOriginal: norm(original.customerName) === norm(next.customerName),
      },
      executorName: {
        changed: (existing.executorName ?? null) !== next.executorName,
        fallback: existing.executorName ?? null,
        backToOriginal: norm(original.executorName) === norm(next.executorName),
      },
      basis: {
        changed: (existing.basis ?? null) !== next.basis,
        fallback: existing.basis ?? null,
        backToOriginal: norm(original.basis) === norm(next.basis),
      },
      notes: {
        changed: (existing.notes ?? null) !== next.notes,
        fallback: existing.notes ?? null,
        backToOriginal: norm(original.notes) === norm(next.notes),
      },
    };

    for (const [field, state] of Object.entries(fields)) {
      if (field in original && state.backToOriginal) {
        // Поле снова равно первоначальному значению — показывать нечего, пометка снимается.
        delete original[field];
      } else if (state.changed && !(field in original)) {
        // Запоминаем только самое первое значение поля (до всех правок).
        original[field] = state.fallback;
      }
    }

    return Object.keys(original).length > 0 ? original : null;
  }
}
