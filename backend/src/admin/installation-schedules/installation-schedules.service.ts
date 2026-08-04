import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstallationScheduleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CompleteInstallationScheduleDto } from './dto/complete-installation-schedule.dto';
import { CreateInstallationScheduleDto } from './dto/create-installation-schedule.dto';
import { FailInstallationScheduleDto } from './dto/fail-installation-schedule.dto';
import { RescheduleInstallationScheduleDto } from './dto/reschedule-installation-schedule.dto';
import { UpdateInstallationScheduleDto } from './dto/update-installation-schedule.dto';
import { InstallationScheduleNotifyService } from './installation-schedule-notify.service';
import {
  ENTRY_INCLUDE,
  INSTALLATION_SCHEDULE_TRASH_RETENTION_DAYS,
  TRASH_RETENTION_MS,
  WORK_ORDER_KEYS,
  WORK_ORDER_LABELS,
  addendumSlotCount,
  asFormDataRecord,
  assertDirection,
  customerFromFormData,
  emptyToNull,
  isPlanner,
  normalizeCustomerPhones,
  parseDateOnly,
  permanentDeleteAtIso,
  selectedInstallerIds,
  todayDateOnly,
} from './installation-schedule.shared';

export { INSTALLATION_SCHEDULE_TRASH_RETENTION_DAYS } from './installation-schedule.shared';

@Injectable()
export class InstallationSchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleNotify: InstallationScheduleNotifyService,
  ) {}

  private assertCanComplete(
    entry: { installer: { userId: string | null } | null },
    userId: string,
    role: string,
  ) {
    if (isPlanner(role)) return;
    if (entry.installer?.userId && entry.installer.userId === userId) return;
    throw new ForbiddenException('Нет прав отметить выполнение этого монтажа');
  }

  private async purgeExpiredTrash(): Promise<void> {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_MS);
    await this.prisma.installationScheduleEntry.deleteMany({
      where: { deletedAt: { lt: cutoff } },
    });
  }

  async listPackageWorkOrders(params: { packageId: string; installerId?: string | null }) {
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: params.packageId, deletedAt: null },
      select: { id: true, kind: true, formData: true },
    });
    if (!pkg) throw new NotFoundException('Пакет документов не найден');

    const formData = asFormDataRecord(pkg.formData);
    const slotCount = addendumSlotCount(formData);
    const assignedIds = selectedInstallerIds(formData);
    const installerId = params.installerId?.trim() || null;
    const installerAssigned =
      !installerId || assignedIds.length === 0 || assignedIds.includes(installerId);

    const options = WORK_ORDER_KEYS.filter((key) => {
      if (!key.startsWith('workOrderAddendum')) return true;
      const n = Number(key.replace('workOrderAddendum', ''));
      return Number.isFinite(n) && n <= slotCount;
    }).map((key) => ({
      key,
      label: WORK_ORDER_LABELS[key],
      assignedToInstaller: installerAssigned,
    }));

    return {
      packageId: pkg.id,
      kind: pkg.kind,
      selectedInstallerIds: assignedIds,
      installerAssigned,
      options: installerId && assignedIds.length > 0 && !installerAssigned ? [] : options,
    };
  }

  private async buildCreateData(dto: CreateInstallationScheduleDto, createdById: string) {
    assertDirection(dto.direction);

    const installerId = emptyToNull(dto.installerId) ?? null;
    let installerName = emptyToNull(dto.installerName) ?? null;
    if (installerId) {
      const installer = await this.prisma.installerMaster.findUnique({
        where: { id: installerId },
        select: { id: true, fullName: true, direction: true },
      });
      if (!installer) throw new BadRequestException('Мастер не найден');
      if (!installerName) installerName = installer.fullName;
    }

    const packageId = emptyToNull(dto.packageId) ?? null;
    let contractId = emptyToNull(dto.contractId) ?? null;
    let contractNumber = emptyToNull(dto.contractNumber) ?? null;
    let customerName = emptyToNull(dto.customerName) ?? null;
    let customerAddress = emptyToNull(dto.customerAddress) ?? null;
    let customerPhones = normalizeCustomerPhones(dto.customerPhones, dto.customerPhone);

    if (packageId) {
      const pkg = await this.prisma.contractDocumentPackage.findFirst({
        where: { id: packageId, deletedAt: null },
        select: {
          id: true,
          formData: true,
          crmContractId: true,
          crmContract: {
            select: {
              id: true,
              contractNumber: true,
              customerName: true,
              customerAddress: true,
              customerPhone: true,
            },
          },
        },
      });
      if (!pkg) throw new BadRequestException('Пакет документов не найден');

      if (!contractId && pkg.crmContractId) contractId = pkg.crmContractId;
      const fromForm = customerFromFormData(asFormDataRecord(pkg.formData));
      if (!contractNumber) {
        contractNumber = pkg.crmContract?.contractNumber?.trim() || fromForm.contractNumber;
      }
      if (!customerName) {
        customerName = pkg.crmContract?.customerName?.trim() || fromForm.customerName;
      }
      if (!customerAddress) {
        customerAddress = pkg.crmContract?.customerAddress?.trim() || fromForm.customerAddress;
      }
      if (customerPhones.length === 0) {
        const phone = pkg.crmContract?.customerPhone?.trim() || fromForm.customerPhone;
        if (phone) customerPhones = [phone];
      }
    } else if (contractId) {
      const contract = await this.prisma.contract.findUnique({
        where: { id: contractId },
        select: {
          id: true,
          contractNumber: true,
          customerName: true,
          customerAddress: true,
          customerPhone: true,
        },
      });
      if (!contract) throw new BadRequestException('Договор не найден');
      if (!contractNumber) contractNumber = contract.contractNumber;
      if (!customerName) customerName = contract.customerName?.trim() || null;
      if (!customerAddress) customerAddress = contract.customerAddress?.trim() || null;
      if (customerPhones.length === 0 && contract.customerPhone?.trim()) {
        customerPhones = [contract.customerPhone.trim()];
      }
    }

    return {
      date: parseDateOnly(dto.date),
      timeFrom: emptyToNull(dto.timeFrom) ?? null,
      timeTo: emptyToNull(dto.timeTo) ?? null,
      timeText: emptyToNull(dto.timeText) ?? null,
      direction: dto.direction,
      orderInfo: emptyToNull(dto.orderInfo) ?? null,
      note: emptyToNull(dto.note) ?? null,
      installerId,
      installerName,
      packageId,
      contractId,
      contractNumber,
      workOrderKey: emptyToNull(dto.workOrderKey) ?? null,
      workOrderLabel: emptyToNull(dto.workOrderLabel) ?? null,
      customerName,
      customerAddress,
      customerPhone: customerPhones[0] ?? null,
      customerPhones,
      createdById,
    };
  }

  async create(dto: CreateInstallationScheduleDto, createdById: string) {
    const data = await this.buildCreateData(dto, createdById);
    const entry = await this.prisma.installationScheduleEntry.create({
      data,
      include: ENTRY_INCLUDE,
    });
    this.scheduleNotify.onCreated(entry, createdById);
    return entry;
  }

  findByDateRange(params: {
    dateFrom?: string;
    dateTo?: string;
    direction?: string;
    installerId?: string;
  }) {
    const fromStr = params.dateFrom?.trim();
    const toStr = params.dateTo?.trim();
    const dateFilter: Prisma.DateTimeFilter = {};
    if (fromStr) dateFilter.gte = parseDateOnly(fromStr);
    if (toStr) dateFilter.lte = parseDateOnly(toStr);
    if (!fromStr && !toStr) {
      const today = parseDateOnly(todayDateOnly());
      dateFilter.gte = today;
      dateFilter.lte = today;
    }

    const direction = params.direction?.trim();
    if (direction) assertDirection(direction);

    return this.prisma.installationScheduleEntry.findMany({
      where: {
        date: dateFilter,
        deletedAt: null,
        ...(direction ? { direction } : {}),
        ...(params.installerId?.trim() ? { installerId: params.installerId.trim() } : {}),
      },
      include: ENTRY_INCLUDE,
      orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findMyByDate(userId: string, dateStr?: string) {
    const date = dateStr?.trim() || todayDateOnly();
    return this.findMyByDateRange(userId, { dateFrom: date, dateTo: date });
  }

  findMyByDateRange(userId: string, params: { dateFrom?: string; dateTo?: string }) {
    const fromStr = params.dateFrom?.trim();
    const toStr = params.dateTo?.trim();
    const dateFilter: Prisma.DateTimeFilter = {};
    if (fromStr) dateFilter.gte = parseDateOnly(fromStr);
    if (toStr) dateFilter.lte = parseDateOnly(toStr);
    if (!fromStr && !toStr) {
      const today = parseDateOnly(todayDateOnly());
      dateFilter.gte = today;
      dateFilter.lte = today;
    }

    return this.prisma.installationScheduleEntry.findMany({
      where: {
        date: dateFilter,
        deletedAt: null,
        installer: { userId },
      },
      include: ENTRY_INCLUDE,
      orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string, opts?: { includeDeleted?: boolean }) {
    const entry = await this.prisma.installationScheduleEntry.findUnique({
      where: { id },
      include: ENTRY_INCLUDE,
    });
    if (!entry || (!opts?.includeDeleted && entry.deletedAt)) {
      throw new NotFoundException(`Installation schedule ${id} not found`);
    }
    return entry;
  }

  async update(id: string, dto: UpdateInstallationScheduleDto, actorUserId?: string) {
    await this.findOne(id);

    const data: Prisma.InstallationScheduleEntryUpdateInput = {};

    if (dto.date !== undefined) data.date = parseDateOnly(dto.date);
    if (dto.timeFrom !== undefined) data.timeFrom = emptyToNull(dto.timeFrom) ?? null;
    if (dto.timeTo !== undefined) data.timeTo = emptyToNull(dto.timeTo) ?? null;
    if (dto.timeText !== undefined) data.timeText = emptyToNull(dto.timeText) ?? null;
    if (dto.direction !== undefined) {
      assertDirection(dto.direction);
      data.direction = dto.direction;
    }
    if (dto.orderInfo !== undefined) data.orderInfo = emptyToNull(dto.orderInfo) ?? null;
    if (dto.note !== undefined) data.note = emptyToNull(dto.note) ?? null;
    if (dto.workOrderKey !== undefined) {
      data.workOrderKey = emptyToNull(dto.workOrderKey) ?? null;
    }
    if (dto.workOrderLabel !== undefined) {
      data.workOrderLabel = emptyToNull(dto.workOrderLabel) ?? null;
    }
    if (dto.contractNumber !== undefined) {
      data.contractNumber = emptyToNull(dto.contractNumber) ?? null;
    }
    if (dto.customerName !== undefined) {
      data.customerName = emptyToNull(dto.customerName) ?? null;
    }
    if (dto.customerAddress !== undefined) {
      data.customerAddress = emptyToNull(dto.customerAddress) ?? null;
    }

    if (dto.installerId !== undefined || dto.installerName !== undefined) {
      const installerId =
        dto.installerId !== undefined ? (emptyToNull(dto.installerId) ?? null) : undefined;
      let installerName =
        dto.installerName !== undefined ? (emptyToNull(dto.installerName) ?? null) : undefined;
      if (installerId) {
        const installer = await this.prisma.installerMaster.findUnique({
          where: { id: installerId },
          select: { fullName: true },
        });
        if (!installer) throw new BadRequestException('Мастер не найден');
        data.installer = { connect: { id: installerId } };
        if (installerName === undefined || installerName === null) {
          installerName = installer.fullName;
        }
      } else if (installerId === null) {
        data.installer = { disconnect: true };
      }
      if (installerName !== undefined) data.installerName = installerName;
    }

    if (dto.packageId !== undefined) {
      const packageId = emptyToNull(dto.packageId) ?? null;
      if (packageId) {
        const pkg = await this.prisma.contractDocumentPackage.findFirst({
          where: { id: packageId, deletedAt: null },
          select: { id: true, crmContractId: true },
        });
        if (!pkg) throw new BadRequestException('Пакет документов не найден');
        data.package = { connect: { id: packageId } };
        if (dto.contractId === undefined && pkg.crmContractId) {
          data.contract = { connect: { id: pkg.crmContractId } };
        }
      } else {
        data.package = { disconnect: true };
      }
    }

    if (dto.contractId !== undefined) {
      const contractId = emptyToNull(dto.contractId) ?? null;
      if (contractId) {
        const contract = await this.prisma.contract.findUnique({
          where: { id: contractId },
          select: { id: true },
        });
        if (!contract) throw new BadRequestException('Договор не найден');
        data.contract = { connect: { id: contractId } };
      } else {
        data.contract = { disconnect: true };
      }
    }

    const phonesTouched = dto.customerPhones !== undefined || dto.customerPhone !== undefined;
    if (phonesTouched) {
      const nextPhones =
        dto.customerPhones !== undefined
          ? normalizeCustomerPhones(dto.customerPhones, null)
          : normalizeCustomerPhones(null, dto.customerPhone);
      data.customerPhones = nextPhones;
      data.customerPhone = nextPhones[0] ?? null;
    }

    const updated = await this.prisma.installationScheduleEntry.update({
      where: { id },
      data,
      include: ENTRY_INCLUDE,
    });
    if (actorUserId) {
      this.scheduleNotify.onUpdated(updated, actorUserId);
    }
    return updated;
  }

  async remove(id: string, actorUserId: string, actorRole: string) {
    const entry = await this.findOne(id);
    if (entry.status !== InstallationScheduleStatus.PLANNED) {
      throw new BadRequestException('Удалить можно только запланированную запись');
    }
    if (entry.createdById && entry.createdById !== actorUserId && !isPlanner(actorRole)) {
      throw new ForbiddenException('Удалить может только автор или планировщик');
    }
    return this.prisma.installationScheduleEntry.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorUserId },
      include: ENTRY_INCLUDE,
    });
  }

  async trashCount() {
    await this.purgeExpiredTrash();
    return this.prisma.installationScheduleEntry.count({
      where: { deletedAt: { not: null } },
    });
  }

  async findTrash(params: { search?: string; page?: number; limit?: number }) {
    await this.purgeExpiredTrash();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const search = params.search?.trim();
    const where: Prisma.InstallationScheduleEntryWhereInput = {
      deletedAt: { not: null },
      ...(search
        ? {
            OR: [
              { installerName: { contains: search, mode: 'insensitive' } },
              { contractNumber: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { workOrderLabel: { contains: search, mode: 'insensitive' } },
              { orderInfo: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.installationScheduleEntry.findMany({
        where,
        include: ENTRY_INCLUDE,
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.installationScheduleEntry.count({ where }),
    ]);
    return {
      data: items.map((row) => ({
        ...row,
        permanentDeleteAt: row.deletedAt ? permanentDeleteAtIso(row.deletedAt) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      trashRetentionDays: INSTALLATION_SCHEDULE_TRASH_RETENTION_DAYS,
    };
  }

  async restore(id: string) {
    const entry = await this.findOne(id, { includeDeleted: true });
    if (!entry.deletedAt) throw new BadRequestException('Запись не в корзине');
    return this.prisma.installationScheduleEntry.update({
      where: { id },
      data: { deletedAt: null, deletedById: null },
      include: ENTRY_INCLUDE,
    });
  }

  async complete(
    id: string,
    dto: CompleteInstallationScheduleDto,
    actorUserId: string,
    role: string,
  ) {
    const entry = await this.findOne(id);
    this.assertCanComplete(entry, actorUserId, role);
    if (entry.status !== InstallationScheduleStatus.PLANNED) {
      throw new BadRequestException('Запись уже закрыта');
    }
    const updated = await this.prisma.installationScheduleEntry.update({
      where: { id },
      data: {
        status: InstallationScheduleStatus.DONE,
        completionNote: emptyToNull(dto.note) ?? null,
        completedAt: new Date(),
        completedById: actorUserId,
      },
      include: ENTRY_INCLUDE,
    });
    this.scheduleNotify.onCompleted(updated, actorUserId);
    return updated;
  }

  async fail(id: string, dto: FailInstallationScheduleDto, actorUserId: string, role: string) {
    const entry = await this.findOne(id);
    this.assertCanComplete(entry, actorUserId, role);
    if (entry.status !== InstallationScheduleStatus.PLANNED) {
      throw new BadRequestException('Запись уже закрыта');
    }
    const updated = await this.prisma.installationScheduleEntry.update({
      where: { id },
      data: {
        status: InstallationScheduleStatus.FAILED,
        completionNote: dto.note.trim(),
        completedAt: new Date(),
        completedById: actorUserId,
      },
      include: ENTRY_INCLUDE,
    });
    this.scheduleNotify.onFailed(updated, actorUserId);
    return updated;
  }

  async reschedule(id: string, dto: RescheduleInstallationScheduleDto, actorUserId?: string) {
    await this.findOne(id);
    const updated = await this.prisma.installationScheduleEntry.update({
      where: { id },
      data: {
        date: parseDateOnly(dto.date),
        ...(dto.timeFrom !== undefined ? { timeFrom: emptyToNull(dto.timeFrom) ?? null } : {}),
        ...(dto.timeTo !== undefined ? { timeTo: emptyToNull(dto.timeTo) ?? null } : {}),
        ...(dto.timeText !== undefined ? { timeText: emptyToNull(dto.timeText) ?? null } : {}),
        status: InstallationScheduleStatus.PLANNED,
        completionNote: null,
        completedAt: null,
        completedById: null,
      },
      include: ENTRY_INCLUDE,
    });
    if (actorUserId) {
      this.scheduleNotify.onUpdated(updated, actorUserId);
    }
    return updated;
  }

  async reopen(id: string) {
    await this.findOne(id);
    return this.prisma.installationScheduleEntry.update({
      where: { id },
      data: {
        status: InstallationScheduleStatus.PLANNED,
        completionNote: null,
        completedAt: null,
        completedById: null,
      },
      include: ENTRY_INCLUDE,
    });
  }
}
