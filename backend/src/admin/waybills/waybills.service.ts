import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WaybillTaskStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  asFormDataRecord,
  customerFromFormData,
} from '../installation-schedules/installation-schedule.shared';
import { WAYBILL_ATTACHMENT_SELECT } from './waybill-attachments.service';
import { CompleteWaybillTaskDto } from './dto/complete-waybill-task.dto';
import { CreateWaybillTaskDto } from './dto/create-waybill-task.dto';
import { DriverDeliveryAvailabilityService } from './driver-delivery-availability.service';
import { FailWaybillTaskDto } from './dto/fail-waybill-task.dto';
import { RescheduleWaybillTaskDto } from './dto/reschedule-waybill-task.dto';
import { UpdateWaybillTaskDto } from './dto/update-waybill-task.dto';
import { WaybillNotifyService } from './waybill-notify.service';
import {
  WAYBILL_TRASH_RETENTION_DAYS,
  WAYBILL_TRASH_RETENTION_MS,
  composeCustomerInfoText,
  decimalOrNull,
  emptyToNull,
  isWaybillPlanner,
  normalizeCustomerPhones,
  parseWaybillDateOnly,
  resolveWaybillPackageSnapshot,
  waybillTodayDateOnly,
} from './waybills.shared';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

const TASK_INCLUDE = {
  responsible: { select: USER_SELECT },
  driver: { select: USER_SELECT },
  package: { select: { id: true, formData: true } },
  completedBy: { select: USER_SELECT },
  createdBy: { select: USER_SELECT },
  deletedBy: { select: USER_SELECT },
  settlement: true,
  attachments: {
    orderBy: { createdAt: 'asc' },
    select: WAYBILL_ATTACHMENT_SELECT,
  },
} as const;

@Injectable()
export class WaybillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly driverAvailabilityService: DriverDeliveryAvailabilityService,
    private readonly waybillNotify: WaybillNotifyService,
  ) {}

  private async assertDriverAcceptsDeliveriesOnDate(
    driverUserId: string | null | undefined,
    dateStr: string | null | undefined,
  ) {
    if (!driverUserId?.trim() || !dateStr?.trim()) return;
    const statuses = await this.driverAvailabilityService.resolveAll(dateStr.trim());
    const status = statuses.find((row) => row.userId === driverUserId);
    if (!status?.hasScheme || !status.isActive) return;
    if (status.kind === 'OFF' || status.kind === 'VACATION' || status.kind === 'SICK') {
      throw new BadRequestException(
        `Нельзя назначить задание: у водителя «${status.label}» на ${dateStr.trim()}`,
      );
    }
  }

  /** Безвозвратно удаляет задания из корзины, лежащие дольше срока хранения. */
  private async purgeExpiredTrashedWaybillTasks(): Promise<void> {
    const cutoff = new Date(Date.now() - WAYBILL_TRASH_RETENTION_MS);
    await this.prisma.waybillTask.deleteMany({
      where: { deletedAt: { lt: cutoff } },
    });
  }

  /** Задание, закрытое расчётом з/п, неизменяемо. */
  private assertNotClosed(task: { status: WaybillTaskStatus }) {
    if (task.status === WaybillTaskStatus.CLOSED) {
      throw new BadRequestException('Задание закрыто расчётом з/п и больше не редактируется');
    }
  }

  private permanentDeleteAtIso(deletedAt: Date): string {
    return new Date(deletedAt.getTime() + WAYBILL_TRASH_RETENTION_MS).toISOString();
  }

  private async buildCreateData(dto: CreateWaybillTaskDto, createdById: string) {
    let customerName = emptyToNull(dto.customerName) ?? null;
    let customerAddress = emptyToNull(dto.customerAddress) ?? null;
    let customerPhones = normalizeCustomerPhones(dto.customerPhones, dto.customerPhone);
    let customerInfoText = emptyToNull(dto.customerInfoText) ?? null;
    let contractNumber = emptyToNull(dto.contractNumber) ?? null;

    const packageId = emptyToNull(dto.packageId) ?? null;
    let packageConnect: { id: string } | null = null;
    if (packageId) {
      const snap = await resolveWaybillPackageSnapshot(this.prisma, packageId);
      packageConnect = { id: snap.id };
      contractNumber = snap.contractNumber ?? contractNumber;
      customerName = snap.customerName ?? customerName;
      customerAddress = snap.customerAddress ?? customerAddress;
      if (snap.customerPhone) customerPhones = [snap.customerPhone];
      customerInfoText = null;
    }

    const customerPhone = customerPhones[0] ?? null;

    if (!customerInfoText) {
      customerInfoText = composeCustomerInfoText({
        customerName,
        customerAddress,
        customerPhones,
      });
    }

    return {
      date: parseWaybillDateOnly(dto.date),
      timeFrom: emptyToNull(dto.timeFrom) ?? null,
      timeTo: emptyToNull(dto.timeTo) ?? null,
      direction: emptyToNull(dto.direction) ?? null,
      taskText: dto.taskText.trim(),
      customerInfoText,
      customerName,
      customerAddress,
      customerPhone,
      customerPhones,
      contractNumber,
      packageId: packageConnect ? packageConnect.id : null,
      deliveryCost: decimalOrNull(dto.deliveryCost) ?? null,
      deliveryPayer: emptyToNull(dto.deliveryPayer) ?? null,
      moversCost: decimalOrNull(dto.moversCost) ?? null,
      moversPayer: emptyToNull(dto.moversPayer) ?? null,
      responsibleUserId: emptyToNull(dto.responsibleUserId) ?? null,
      driverUserId: emptyToNull(dto.driverUserId) ?? null,
      createdById,
    };
  }

  async create(dto: CreateWaybillTaskDto, createdById: string) {
    await this.assertDriverAcceptsDeliveriesOnDate(dto.driverUserId, dto.date);
    const data = await this.buildCreateData(dto, createdById);
    const task = await this.prisma.waybillTask.create({
      data,
      include: TASK_INCLUDE,
    });
    this.waybillNotify.onCreated(task, createdById);
    return task;
  }

  findByDate(dateStr: string) {
    return this.findByDateRange({ dateFrom: dateStr, dateTo: dateStr });
  }

  findByDateRange(params: { dateFrom?: string; dateTo?: string }) {
    const fromStr = params.dateFrom?.trim();
    const toStr = params.dateTo?.trim();
    const dateFilter: Prisma.DateTimeFilter = {};
    if (fromStr) dateFilter.gte = parseWaybillDateOnly(fromStr);
    if (toStr) dateFilter.lte = parseWaybillDateOnly(toStr);
    if (!fromStr && !toStr) {
      const today = parseWaybillDateOnly(waybillTodayDateOnly());
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
    const date = dateStr?.trim() || waybillTodayDateOnly();
    return this.findMyByDateRange(userId, { dateFrom: date, dateTo: date });
  }

  findMyByDateRange(userId: string, params: { dateFrom?: string; dateTo?: string }) {
    const fromStr = params.dateFrom?.trim();
    const toStr = params.dateTo?.trim();
    const dateFilter: Prisma.DateTimeFilter = {};
    if (fromStr) dateFilter.gte = parseWaybillDateOnly(fromStr);
    if (toStr) dateFilter.lte = parseWaybillDateOnly(toStr);
    if (!fromStr && !toStr) {
      const today = parseWaybillDateOnly(waybillTodayDateOnly());
      dateFilter.gte = today;
      dateFilter.lte = today;
    }

    return this.prisma.waybillTask.findMany({
      where: { date: dateFilter, driverUserId: userId, deletedAt: null },
      include: TASK_INCLUDE,
      orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }, { createdAt: 'asc' }],
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

  async update(id: string, dto: UpdateWaybillTaskDto, actorUserId?: string) {
    const existing = await this.findOne(id);
    this.assertNotClosed(existing);
    const nextDate = dto.date !== undefined ? dto.date : existing.date.toISOString().slice(0, 10);
    const nextDriverId = dto.driverUserId !== undefined ? dto.driverUserId : existing.driverUserId;
    await this.assertDriverAcceptsDeliveriesOnDate(nextDriverId, nextDate);

    const data: Prisma.WaybillTaskUpdateInput = {};

    if (dto.date !== undefined) {
      data.date = parseWaybillDateOnly(dto.date);
    }
    if (dto.timeFrom !== undefined) data.timeFrom = emptyToNull(dto.timeFrom) ?? null;
    if (dto.timeTo !== undefined) data.timeTo = emptyToNull(dto.timeTo) ?? null;
    if (dto.direction !== undefined) data.direction = emptyToNull(dto.direction) ?? null;
    if (dto.taskText !== undefined) data.taskText = dto.taskText.trim();

    if (dto.customerName !== undefined) {
      data.customerName = emptyToNull(dto.customerName) ?? null;
    }
    if (dto.customerAddress !== undefined) {
      data.customerAddress = emptyToNull(dto.customerAddress) ?? null;
    }

    const phonesTouched = dto.customerPhones !== undefined || dto.customerPhone !== undefined;
    let nextPhones: string[] | undefined;
    if (phonesTouched) {
      if (dto.customerPhones !== undefined) {
        nextPhones = normalizeCustomerPhones(dto.customerPhones, null);
      } else {
        nextPhones = normalizeCustomerPhones(null, dto.customerPhone);
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
      data.customerInfoText = composeCustomerInfoText({
        customerName:
          dto.customerName !== undefined
            ? (emptyToNull(dto.customerName) ?? null)
            : current?.customerName,
        customerAddress:
          dto.customerAddress !== undefined
            ? (emptyToNull(dto.customerAddress) ?? null)
            : current?.customerAddress,
        customerPhones: phones,
      });
    } else if (dto.customerInfoText !== undefined) {
      data.customerInfoText = emptyToNull(dto.customerInfoText) ?? null;
    }

    if (dto.contractNumber !== undefined) {
      data.contractNumber = emptyToNull(dto.contractNumber) ?? null;
    }

    /*
     * Связка с договором-пакетом: при установке/наличии packageId номер договора
     * и данные заказчика всегда синхронизируются с пакетом (самовосстановление
     * при каждом редактировании), ручные значения игнорируются.
     */
    let newPackageSnap: Awaited<ReturnType<typeof resolveWaybillPackageSnapshot>> | null = null;
    if (dto.packageId !== undefined) {
      const packageId = emptyToNull(dto.packageId) ?? null;
      if (packageId) {
        newPackageSnap = await resolveWaybillPackageSnapshot(this.prisma, packageId);
        data.package = { connect: { id: newPackageSnap.id } };
      } else {
        data.package = { disconnect: true };
      }
    }
    const effectiveSnap =
      newPackageSnap ??
      (dto.packageId === undefined && existing.packageId
        ? customerFromFormData(asFormDataRecord(existing.package?.formData))
        : null);
    if (effectiveSnap) {
      if (effectiveSnap.contractNumber) data.contractNumber = effectiveSnap.contractNumber;
      if (effectiveSnap.customerName) data.customerName = effectiveSnap.customerName;
      if (effectiveSnap.customerAddress) data.customerAddress = effectiveSnap.customerAddress;
      const phone = effectiveSnap.customerPhone;
      if (phone && phonesTouched) {
        data.customerPhones = [phone];
        data.customerPhone = phone;
      }
      const finalName = (data.customerName as string | null | undefined) ?? existing.customerName;
      const finalAddress =
        (data.customerAddress as string | null | undefined) ?? existing.customerAddress;
      const finalPhones =
        (data.customerPhones as string[] | undefined) ?? existing.customerPhones ?? [];
      data.customerInfoText = composeCustomerInfoText({
        customerName: finalName,
        customerAddress: finalAddress,
        customerPhones: finalPhones,
      });
    }
    if (dto.deliveryCost !== undefined) data.deliveryCost = decimalOrNull(dto.deliveryCost) ?? null;
    if (dto.deliveryPayer !== undefined) {
      data.deliveryPayer = emptyToNull(dto.deliveryPayer) ?? null;
    }
    if (dto.moversCost !== undefined) data.moversCost = decimalOrNull(dto.moversCost) ?? null;
    if (dto.moversPayer !== undefined) data.moversPayer = emptyToNull(dto.moversPayer) ?? null;
    if (dto.responsibleUserId !== undefined) {
      data.responsible = dto.responsibleUserId
        ? { connect: { id: dto.responsibleUserId } }
        : { disconnect: true };
    }
    if (dto.driverUserId !== undefined) {
      data.driver = dto.driverUserId ? { connect: { id: dto.driverUserId } } : { disconnect: true };
    }

    const updated = await this.prisma.waybillTask.update({
      where: { id },
      data,
      include: TASK_INCLUDE,
    });
    if (actorUserId) {
      this.waybillNotify.onUpdated(updated, actorUserId);
    }
    return updated;
  }

  async remove(id: string, userId: string) {
    await this.purgeExpiredTrashedWaybillTasks();
    const task = await this.findOne(id);
    this.assertNotClosed(task);
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
    if (isWaybillPlanner(role)) return;
    if (task.driverUserId && task.driverUserId === userId) return;
    throw new ForbiddenException('Нет прав отметить выполнение этого задания');
  }

  async complete(id: string, userId: string, role: string, dto: CompleteWaybillTaskDto) {
    const task = await this.findOne(id);
    this.assertNotClosed(task);
    this.assertCanComplete(task, userId, role);
    const updated = await this.prisma.waybillTask.update({
      where: { id },
      data: {
        status: WaybillTaskStatus.DONE,
        completionNote: emptyToNull(dto.note) ?? null,
        completedAt: new Date(),
        completedById: userId,
      },
      include: TASK_INCLUDE,
    });
    this.waybillNotify.onCompleted(updated, userId);
    return updated;
  }

  async fail(id: string, userId: string, role: string, dto: FailWaybillTaskDto) {
    const task = await this.findOne(id);
    this.assertNotClosed(task);
    this.assertCanComplete(task, userId, role);
    const updated = await this.prisma.waybillTask.update({
      where: { id },
      data: {
        status: WaybillTaskStatus.FAILED,
        completionNote: dto.note.trim(),
        completedAt: new Date(),
        completedById: userId,
      },
      include: TASK_INCLUDE,
    });
    this.waybillNotify.onFailed(updated, userId);
    return updated;
  }

  /** Копия задания на новую дату/время. Оригинал не меняется — статус «Не выполнено» ставится вручную. */
  async reschedule(id: string, dto: RescheduleWaybillTaskDto, actorUserId: string, role: string) {
    if (!isWaybillPlanner(role)) {
      throw new ForbiddenException('Переносить задание может только планировщик');
    }
    const source = await this.findOne(id);
    this.assertNotClosed(source);
    if (source.status !== WaybillTaskStatus.PLANNED) {
      throw new BadRequestException('Скопировать можно только задание со статусом «В плане»');
    }
    if (source.deletedAt) {
      throw new BadRequestException('Нельзя копировать задание из корзины');
    }

    const newDate = dto.date.trim();
    const timeFrom =
      dto.timeFrom === undefined ? source.timeFrom : (emptyToNull(dto.timeFrom) ?? null);
    const timeTo = dto.timeTo === undefined ? source.timeTo : (emptyToNull(dto.timeTo) ?? null);

    await this.assertDriverAcceptsDeliveriesOnDate(source.driverUserId, newDate);

    const copy = await this.prisma.waybillTask.create({
      data: {
        date: parseWaybillDateOnly(newDate),
        timeFrom,
        timeTo,
        direction: source.direction,
        taskText: source.taskText,
        customerInfoText: source.customerInfoText,
        customerName: source.customerName,
        customerAddress: source.customerAddress,
        customerPhone: source.customerPhone,
        customerPhones: source.customerPhones,
        contractNumber: source.contractNumber,
        deliveryCost: source.deliveryCost,
        deliveryPayer: source.deliveryPayer,
        moversCost: source.moversCost,
        moversPayer: source.moversPayer,
        responsibleUserId: source.responsibleUserId,
        driverUserId: source.driverUserId,
        status: WaybillTaskStatus.PLANNED,
        createdById: actorUserId,
      },
      include: TASK_INCLUDE,
    });

    this.waybillNotify.onCreated(copy, actorUserId);
    return { copy };
  }

  async reopen(id: string, role: string) {
    if (!isWaybillPlanner(role)) {
      throw new ForbiddenException('Только ответственный может вернуть задание в план');
    }
    const task = await this.findOne(id);
    this.assertNotClosed(task);
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
