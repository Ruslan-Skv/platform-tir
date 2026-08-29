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
  normalizeContactPersons,
  normalizeCustomerPhones,
  parseDateOnly,
  permanentDeleteAtIso,
  resolveDateEnd,
  overlappingDateRangeWhere,
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

  private async assertCanComplete(
    entry: {
      installerId: string | null;
      installerIds: string[];
      installer: { userId: string | null } | null;
    },
    userId: string,
    role: string,
  ) {
    if (isPlanner(role)) return;
    if (entry.installer?.userId && entry.installer.userId === userId) return;
    const ids = [
      ...new Set(
        [...(entry.installerIds ?? []), entry.installerId].filter((id): id is string =>
          Boolean(id),
        ),
      ),
    ];
    if (ids.length > 0) {
      const linked = await this.prisma.installerMaster.findFirst({
        where: { id: { in: ids }, userId },
        select: { id: true },
      });
      if (linked) return;
    }
    throw new ForbiddenException('Нет прав отметить выполнение этого монтажа');
  }

  private async resolveInstallers(input: {
    installerId?: string | null;
    installerIds?: string[] | null;
    installerName?: string | null;
  }): Promise<{
    installerId: string | null;
    installerIds: string[];
    installerName: string | null;
  }> {
    const fromList = (input.installerIds ?? [])
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter(Boolean);
    const primary = emptyToNull(input.installerId) ?? null;
    const ids = [...new Set(primary ? [primary, ...fromList] : fromList)];

    if (ids.length > 0) {
      const masters = await this.prisma.installerMaster.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true },
      });
      const byId = new Map(masters.map((row) => [row.id, row]));
      const ordered = ids
        .map((id) => byId.get(id))
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
      if (ordered.length !== ids.length) {
        throw new BadRequestException('Один или несколько монтажников не найдены');
      }
      return {
        installerId: ordered[0].id,
        installerIds: ordered.map((row) => row.id),
        installerName: ordered.map((row) => row.fullName).join(', '),
      };
    }

    const names = (emptyToNull(input.installerName) ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    return {
      installerId: null,
      installerIds: [],
      installerName: names.length ? names.join(', ') : null,
    };
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

    const { installerId, installerIds, installerName } = await this.resolveInstallers({
      installerId: dto.installerId,
      installerIds: dto.installerIds,
      installerName: dto.installerName,
    });

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

    const date = parseDateOnly(dto.date);
    return {
      date,
      dateEnd: resolveDateEnd(date, dto.dateEnd),
      timeFrom: emptyToNull(dto.timeFrom) ?? null,
      timeTo: emptyToNull(dto.timeTo) ?? null,
      timeText: emptyToNull(dto.timeText) ?? null,
      direction: dto.direction,
      orderInfo: emptyToNull(dto.orderInfo) ?? null,
      note: emptyToNull(dto.note) ?? null,
      installerId,
      installerIds,
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
      contactPersons: normalizeContactPersons(dto.contactPersons),
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
    const direction = params.direction?.trim();
    if (direction) assertDirection(direction);

    return this.prisma.installationScheduleEntry.findMany({
      where: {
        ...overlappingDateRangeWhere(params),
        deletedAt: null,
        ...(direction ? { direction } : {}),
        ...(params.installerId?.trim()
          ? {
              OR: [
                { installerId: params.installerId.trim() },
                { installerIds: { has: params.installerId.trim() } },
              ],
            }
          : {}),
      },
      include: ENTRY_INCLUDE,
      orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findByPackageId(packageId: string) {
    return this.prisma.installationScheduleEntry.findMany({
      where: { packageId, deletedAt: null },
      include: ENTRY_INCLUDE,
      orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findMyByDate(userId: string, dateStr?: string) {
    const date = dateStr?.trim() || todayDateOnly();
    return this.findMyByDateRange(userId, { dateFrom: date, dateTo: date });
  }

  async findMyByDateRange(userId: string, params: { dateFrom?: string; dateTo?: string }) {
    const myInstallerIds = (
      await this.prisma.installerMaster.findMany({
        where: { userId },
        select: { id: true },
      })
    ).map((row) => row.id);
    if (myInstallerIds.length === 0) return [];

    return this.prisma.installationScheduleEntry.findMany({
      where: {
        ...overlappingDateRangeWhere(params),
        deletedAt: null,
        OR: [
          { installerId: { in: myInstallerIds } },
          { installerIds: { hasSome: myInstallerIds } },
        ],
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
    const current = await this.findOne(id);

    const data: Prisma.InstallationScheduleEntryUpdateInput = {};

    if (dto.date !== undefined) data.date = parseDateOnly(dto.date);
    if (dto.dateEnd !== undefined || dto.date !== undefined) {
      const nextDate = dto.date !== undefined ? parseDateOnly(dto.date) : current.date;
      if (dto.dateEnd !== undefined) {
        data.dateEnd = resolveDateEnd(nextDate, dto.dateEnd);
      } else if (current.dateEnd && current.dateEnd.getTime() < nextDate.getTime()) {
        data.dateEnd = null;
      }
    }
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

    if (
      dto.installerId !== undefined ||
      dto.installerIds !== undefined ||
      dto.installerName !== undefined
    ) {
      const resolved = await this.resolveInstallers({
        installerId: dto.installerId,
        installerIds: dto.installerIds,
        installerName: dto.installerName,
      });
      if (resolved.installerId) {
        data.installer = { connect: { id: resolved.installerId } };
      } else {
        data.installer = { disconnect: true };
      }
      data.installerIds = resolved.installerIds;
      data.installerName = resolved.installerName;
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

    if (dto.contactPersons !== undefined) {
      data.contactPersons = normalizeContactPersons(dto.contactPersons);
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
    await this.assertCanComplete(entry, actorUserId, role);
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
    await this.assertCanComplete(entry, actorUserId, role);
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
    const entry = await this.findOne(id);
    const nextDate = parseDateOnly(dto.date);
    let nextDateEnd: Date | null;
    if (dto.dateEnd !== undefined) {
      nextDateEnd = resolveDateEnd(nextDate, dto.dateEnd);
    } else if (entry.dateEnd) {
      const spanDays = Math.round(
        (entry.dateEnd.getTime() - entry.date.getTime()) / (24 * 60 * 60 * 1000),
      );
      nextDateEnd = new Date(nextDate);
      nextDateEnd.setUTCDate(nextDateEnd.getUTCDate() + spanDays);
    } else {
      nextDateEnd = null;
    }

    const updated = await this.prisma.installationScheduleEntry.update({
      where: { id },
      data: {
        date: nextDate,
        dateEnd: nextDateEnd,
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
