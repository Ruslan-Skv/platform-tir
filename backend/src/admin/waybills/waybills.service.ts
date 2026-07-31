import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WaybillTaskStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CompleteWaybillTaskDto } from './dto/complete-waybill-task.dto';
import { CreateWaybillTaskDto } from './dto/create-waybill-task.dto';
import { FailWaybillTaskDto } from './dto/fail-waybill-task.dto';
import { UpdateWaybillTaskDto } from './dto/update-waybill-task.dto';

const PLANNER_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
]);

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

const TASK_INCLUDE = {
  contract: {
    select: {
      id: true,
      contractNumber: true,
      customerName: true,
      customerAddress: true,
      customerPhone: true,
    },
  },
  responsible: { select: USER_SELECT },
  driver: { select: USER_SELECT },
  completedBy: { select: USER_SELECT },
  createdBy: { select: USER_SELECT },
  deletedBy: { select: USER_SELECT },
} as const;

/** Срок хранения задания в корзине до безвозвратного удаления. */
export const WAYBILL_TRASH_RETENTION_DAYS = 30;
const WAYBILL_TRASH_RETENTION_MS = WAYBILL_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

@Injectable()
export class WaybillsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateOnly(dateStr: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!m) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  private todayDateOnly(): string {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }

  private isPlanner(role: string): boolean {
    return PLANNER_ROLES.has(role);
  }

  private permanentDeleteAtIso(deletedAt: Date): string {
    return new Date(deletedAt.getTime() + WAYBILL_TRASH_RETENTION_MS).toISOString();
  }

  /** Безвозвратно удаляет задания из корзины, лежащие дольше срока хранения. */
  private async purgeExpiredTrashedWaybillTasks(): Promise<void> {
    const cutoff = new Date(Date.now() - WAYBILL_TRASH_RETENTION_MS);
    await this.prisma.waybillTask.deleteMany({
      where: { deletedAt: { lt: cutoff } },
    });
  }

  private emptyToNull(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private decimalOrNull(value?: number | null): Prisma.Decimal | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Prisma.Decimal(value);
  }

  private composeCustomerInfoText(parts: {
    customerName?: string | null;
    customerAddress?: string | null;
    customerPhones?: string[];
  }): string | null {
    const text = [parts.customerName, parts.customerAddress, ...(parts.customerPhones ?? [])]
      .map((v) => v?.trim())
      .filter(Boolean)
      .join('        ');
    return text || null;
  }

  private normalizeCustomerPhones(
    phones?: string[] | null,
    fallbackPhone?: string | null,
  ): string[] {
    const fromList = (phones ?? []).map((p) => p?.trim()).filter((p): p is string => Boolean(p));
    if (fromList.length > 0) {
      const seen = new Set<string>();
      const unique: string[] = [];
      for (const p of fromList) {
        const key = p.replace(/\D/g, '');
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        unique.push(p);
      }
      return unique;
    }
    const single = fallbackPhone?.trim();
    return single ? [single] : [];
  }

  private async buildCreateData(dto: CreateWaybillTaskDto, createdById: string) {
    let customerName = this.emptyToNull(dto.customerName) ?? null;
    let customerAddress = this.emptyToNull(dto.customerAddress) ?? null;
    let customerPhones = this.normalizeCustomerPhones(dto.customerPhones, dto.customerPhone);
    let customerInfoText = this.emptyToNull(dto.customerInfoText) ?? null;
    const contractId = this.emptyToNull(dto.contractId) ?? null;

    if (contractId) {
      const contract = await this.prisma.contract.findUnique({
        where: { id: contractId },
        select: {
          id: true,
          customerName: true,
          customerAddress: true,
          customerPhone: true,
        },
      });
      if (!contract) {
        throw new BadRequestException('Договор не найден');
      }
      if (!customerName) customerName = contract.customerName?.trim() || null;
      if (!customerAddress) customerAddress = contract.customerAddress?.trim() || null;
      if (customerPhones.length === 0 && contract.customerPhone?.trim()) {
        customerPhones = [contract.customerPhone.trim()];
      }
    }

    const customerPhone = customerPhones[0] ?? null;

    if (!customerInfoText) {
      customerInfoText = this.composeCustomerInfoText({
        customerName,
        customerAddress,
        customerPhones,
      });
    }

    return {
      date: this.parseDateOnly(dto.date),
      timeFrom: this.emptyToNull(dto.timeFrom) ?? null,
      timeTo: this.emptyToNull(dto.timeTo) ?? null,
      direction: this.emptyToNull(dto.direction) ?? null,
      taskText: dto.taskText.trim(),
      customerInfoText,
      customerName,
      customerAddress,
      customerPhone,
      customerPhones,
      contractId,
      deliveryCost: this.decimalOrNull(dto.deliveryCost) ?? null,
      deliveryPayer: this.emptyToNull(dto.deliveryPayer) ?? null,
      moversCost: this.decimalOrNull(dto.moversCost) ?? null,
      moversPayer: this.emptyToNull(dto.moversPayer) ?? null,
      responsibleUserId: this.emptyToNull(dto.responsibleUserId) ?? null,
      driverUserId: this.emptyToNull(dto.driverUserId) ?? null,
      createdById,
    };
  }

  create(dto: CreateWaybillTaskDto, createdById: string) {
    return this.buildCreateData(dto, createdById).then((data) =>
      this.prisma.waybillTask.create({
        data,
        include: TASK_INCLUDE,
      }),
    );
  }

  findByDate(dateStr: string) {
    return this.findByDateRange({ dateFrom: dateStr, dateTo: dateStr });
  }

  findByDateRange(params: { dateFrom?: string; dateTo?: string }) {
    const fromStr = params.dateFrom?.trim();
    const toStr = params.dateTo?.trim();
    const dateFilter: Prisma.DateTimeFilter = {};
    if (fromStr) dateFilter.gte = this.parseDateOnly(fromStr);
    if (toStr) dateFilter.lte = this.parseDateOnly(toStr);
    if (!fromStr && !toStr) {
      const today = this.parseDateOnly(this.todayDateOnly());
      dateFilter.gte = today;
      dateFilter.lte = today;
    }

    return this.prisma.waybillTask.findMany({
      where: { date: dateFilter, deletedAt: null },
      include: TASK_INCLUDE,
      orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findMyByDate(userId: string, dateStr?: string) {
    const date = this.parseDateOnly(dateStr?.trim() || this.todayDateOnly());
    return this.prisma.waybillTask.findMany({
      where: { date, driverUserId: userId, deletedAt: null },
      include: TASK_INCLUDE,
      orderBy: [{ timeFrom: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string, opts?: { includeDeleted?: boolean }) {
    const task = await this.prisma.waybillTask.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });
    if (!task || (!opts?.includeDeleted && task.deletedAt)) {
      throw new NotFoundException(`Waybill task ${id} not found`);
    }
    return task;
  }

  async update(id: string, dto: UpdateWaybillTaskDto) {
    await this.findOne(id);
    const data: Prisma.WaybillTaskUpdateInput = {};

    if (dto.date !== undefined) {
      data.date = this.parseDateOnly(dto.date);
    }
    if (dto.timeFrom !== undefined) data.timeFrom = this.emptyToNull(dto.timeFrom) ?? null;
    if (dto.timeTo !== undefined) data.timeTo = this.emptyToNull(dto.timeTo) ?? null;
    if (dto.direction !== undefined) data.direction = this.emptyToNull(dto.direction) ?? null;
    if (dto.taskText !== undefined) data.taskText = dto.taskText.trim();

    if (dto.customerName !== undefined) {
      data.customerName = this.emptyToNull(dto.customerName) ?? null;
    }
    if (dto.customerAddress !== undefined) {
      data.customerAddress = this.emptyToNull(dto.customerAddress) ?? null;
    }

    const phonesTouched = dto.customerPhones !== undefined || dto.customerPhone !== undefined;
    let nextPhones: string[] | undefined;
    if (phonesTouched) {
      if (dto.customerPhones !== undefined) {
        nextPhones = this.normalizeCustomerPhones(dto.customerPhones, null);
      } else {
        nextPhones = this.normalizeCustomerPhones(null, dto.customerPhone);
      }
      data.customerPhones = nextPhones;
      data.customerPhone = nextPhones[0] ?? null;
    }

    if (dto.customerName !== undefined || dto.customerAddress !== undefined || phonesTouched) {
      const current = await this.prisma.waybillTask.findUnique({
        where: { id },
        select: {
          customerName: true,
          customerAddress: true,
          customerPhone: true,
          customerPhones: true,
        },
      });
      const phones =
        nextPhones ??
        (current?.customerPhones?.length
          ? current.customerPhones
          : current?.customerPhone
            ? [current.customerPhone]
            : []);
      data.customerInfoText = this.composeCustomerInfoText({
        customerName:
          dto.customerName !== undefined
            ? (this.emptyToNull(dto.customerName) ?? null)
            : current?.customerName,
        customerAddress:
          dto.customerAddress !== undefined
            ? (this.emptyToNull(dto.customerAddress) ?? null)
            : current?.customerAddress,
        customerPhones: phones,
      });
    } else if (dto.customerInfoText !== undefined) {
      data.customerInfoText = this.emptyToNull(dto.customerInfoText) ?? null;
    }

    if (dto.deliveryCost !== undefined)
      data.deliveryCost = this.decimalOrNull(dto.deliveryCost) ?? null;
    if (dto.deliveryPayer !== undefined) {
      data.deliveryPayer = this.emptyToNull(dto.deliveryPayer) ?? null;
    }
    if (dto.moversCost !== undefined) data.moversCost = this.decimalOrNull(dto.moversCost) ?? null;
    if (dto.moversPayer !== undefined) data.moversPayer = this.emptyToNull(dto.moversPayer) ?? null;
    if (dto.responsibleUserId !== undefined) {
      data.responsible = dto.responsibleUserId
        ? { connect: { id: dto.responsibleUserId } }
        : { disconnect: true };
    }
    if (dto.driverUserId !== undefined) {
      data.driver = dto.driverUserId ? { connect: { id: dto.driverUserId } } : { disconnect: true };
    }
    if (dto.contractId !== undefined) {
      if (!dto.contractId) {
        data.contract = { disconnect: true };
      } else {
        const contract = await this.prisma.contract.findUnique({
          where: { id: dto.contractId },
          select: { id: true },
        });
        if (!contract) {
          throw new BadRequestException('Договор не найден');
        }
        data.contract = { connect: { id: dto.contractId } };
      }
    }

    return this.prisma.waybillTask.update({
      where: { id },
      data,
      include: TASK_INCLUDE,
    });
  }

  async remove(id: string, userId: string) {
    await this.purgeExpiredTrashedWaybillTasks();
    const task = await this.findOne(id);
    if (task.status === WaybillTaskStatus.DONE) {
      throw new BadRequestException('Выполненные задания удалять нельзя');
    }
    if (task.status !== WaybillTaskStatus.PLANNED) {
      throw new BadRequestException(
        'Нельзя удалить невыполненное задание — оно остаётся в путевом листе с причиной',
      );
    }
    if (!task.createdById || task.createdById !== userId) {
      throw new ForbiddenException('Удалить задание может только тот, кто его вписал');
    }
    return this.prisma.waybillTask.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
      include: TASK_INCLUDE,
    });
  }

  async trashCount() {
    await this.purgeExpiredTrashedWaybillTasks();
    return this.prisma.waybillTask.count({ where: { deletedAt: { not: null } } });
  }

  async findTrash(params: { search?: string; page?: number; limit?: number }) {
    await this.purgeExpiredTrashedWaybillTasks();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 15));
    const search = params.search?.trim();
    const where: Prisma.WaybillTaskWhereInput = {
      deletedAt: { not: null },
      ...(search
        ? {
            OR: [
              { taskText: { contains: search, mode: 'insensitive' } },
              { customerInfoText: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { customerAddress: { contains: search, mode: 'insensitive' } },
              { customerPhone: { contains: search, mode: 'insensitive' } },
              { customerPhones: { has: search } },
              { direction: { contains: search, mode: 'insensitive' } },
              { contract: { contractNumber: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.waybillTask.count({ where }),
      this.prisma.waybillTask.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: data.map((row) => ({
        ...row,
        permanentDeleteAt: row.deletedAt ? this.permanentDeleteAtIso(row.deletedAt) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      trashRetentionDays: WAYBILL_TRASH_RETENTION_DAYS,
    };
  }

  async restore(id: string) {
    await this.purgeExpiredTrashedWaybillTasks();
    const task = await this.findOne(id, { includeDeleted: true });
    if (!task.deletedAt) {
      throw new BadRequestException('Задание не в корзине');
    }
    return this.prisma.waybillTask.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
      },
      include: TASK_INCLUDE,
    });
  }

  private assertCanComplete(task: { driverUserId: string | null }, userId: string, role: string) {
    if (this.isPlanner(role)) return;
    if (task.driverUserId && task.driverUserId === userId) return;
    throw new ForbiddenException('Нет прав отметить выполнение этого задания');
  }

  async complete(id: string, userId: string, role: string, dto: CompleteWaybillTaskDto) {
    const task = await this.findOne(id);
    this.assertCanComplete(task, userId, role);
    return this.prisma.waybillTask.update({
      where: { id },
      data: {
        status: WaybillTaskStatus.DONE,
        completionNote: this.emptyToNull(dto.note) ?? null,
        completedAt: new Date(),
        completedById: userId,
      },
      include: TASK_INCLUDE,
    });
  }

  async fail(id: string, userId: string, role: string, dto: FailWaybillTaskDto) {
    const task = await this.findOne(id);
    this.assertCanComplete(task, userId, role);
    return this.prisma.waybillTask.update({
      where: { id },
      data: {
        status: WaybillTaskStatus.FAILED,
        completionNote: dto.note.trim(),
        completedAt: new Date(),
        completedById: userId,
      },
      include: TASK_INCLUDE,
    });
  }

  async reopen(id: string, role: string) {
    if (!this.isPlanner(role)) {
      throw new ForbiddenException('Только ответственный может вернуть задание в план');
    }
    await this.findOne(id);
    return this.prisma.waybillTask.update({
      where: { id },
      data: {
        status: WaybillTaskStatus.PLANNED,
        completionNote: null,
        completedAt: null,
        completedById: null,
      },
      include: TASK_INCLUDE,
    });
  }
}
