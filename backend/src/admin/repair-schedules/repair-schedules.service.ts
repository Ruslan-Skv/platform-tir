import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RepairScheduleEntryKind, RepairScheduleProjectStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateRepairScheduleEntryDto } from './dto/create-repair-schedule-entry.dto';
import { CreateRepairScheduleProjectDto } from './dto/create-repair-schedule-project.dto';
import {
  RepairScheduleNotifyProject,
  RepairScheduleNotifyService,
} from './repair-schedule-notify.service';
import {
  PROJECT_DETAIL_INCLUDE,
  PROJECT_INCLUDE,
  type RepairScheduleAttachedInstaller,
  decimalOrNull,
  emptyToNull,
  extractAttachedInstallerIds,
  extractPackageProjectSnapshot,
  parseDateOnly,
  withDerived,
} from './repair-schedule.shared';
import { RepairSchedulesTrashService } from './repair-schedules-trash.service';
import { UpdateRepairScheduleEntryDto } from './dto/update-repair-schedule-entry.dto';
import { UpdateRepairScheduleProjectDto } from './dto/update-repair-schedule-project.dto';

export { REPAIR_SCHEDULE_STALE_DAYS } from './repair-schedule.shared';

/** Ключ advisory-lock'а, сериализующего создание проектов одного пакета. */
const PACKAGE_PROJECT_LOCK_PREFIX = 'repair-schedule-package:';

@Injectable()
export class RepairSchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: RepairScheduleNotifyService,
    private readonly trash: RepairSchedulesTrashService,
  ) {}

  private toNotifyPayload(
    project: {
      id: string;
      status: RepairScheduleProjectStatus;
      contractNumber: string | null;
      workScope: string | null;
      installerId: string | null;
      installerName: string | null;
      customerAddress: string | null;
      packageId: string | null;
      createdById: string | null;
    },
    entryText?: string | null,
  ): RepairScheduleNotifyProject {
    return {
      id: project.id,
      status: project.status,
      contractNumber: project.contractNumber,
      workScope: project.workScope,
      installerId: project.installerId,
      installerName: project.installerName,
      customerAddress: project.customerAddress,
      packageId: project.packageId,
      createdById: project.createdById,
      entryText,
    };
  }

  private async resolveInstaller(
    installerId?: string | null,
    installerName?: string | null,
  ): Promise<{ installerId: string | null; installerName: string | null }> {
    const id = emptyToNull(installerId) ?? null;
    let name = emptyToNull(installerName) ?? null;
    if (id) {
      const installer = await this.prisma.installerMaster.findUnique({
        where: { id },
        select: { id: true, fullName: true, directions: true },
      });
      if (!installer) throw new BadRequestException('Мастер не найден');
      if (!installer.directions.includes('REPAIR')) {
        throw new BadRequestException('Для план-графика ремонта нужен мастер направления «Ремонт»');
      }
      if (!name) name = installer.fullName;
    }
    return { installerId: id, installerName: name };
  }

  /** Дополняет проекты мастерами, прикреплёнными в модалке «Заказ-наряды» пакета. */
  private async withContractInstallers<T extends { package?: { formData?: unknown } | null }>(
    rows: T[],
  ): Promise<Array<T & { attachedInstallers: RepairScheduleAttachedInstaller[] }>> {
    const idsByRow = rows.map((row) => extractAttachedInstallerIds(row.package?.formData));
    const allIds = [...new Set(idsByRow.flat())];
    const byId = new Map<string, RepairScheduleAttachedInstaller>();
    if (allIds.length > 0) {
      const installers = await this.prisma.installerMaster.findMany({
        where: { id: { in: allIds } },
        select: { id: true, fullName: true, grade: true },
      });
      for (const installer of installers) byId.set(installer.id, installer);
    }
    return rows.map((row, index) => ({
      ...row,
      attachedInstallers: idsByRow[index]
        .map((id) => byId.get(id))
        .filter((installer): installer is RepairScheduleAttachedInstaller => Boolean(installer)),
    }));
  }

  private async withContractInstaller<T extends { package?: { formData?: unknown } | null }>(
    row: T,
  ): Promise<T & { attachedInstallers: RepairScheduleAttachedInstaller[] }> {
    return (await this.withContractInstallers([row]))[0];
  }

  private async enrichFromPackage(packageId: string) {
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: packageId, deletedAt: null },
      select: {
        id: true,
        formData: true,
      },
    });
    if (!pkg) throw new BadRequestException('Пакет документов не найден');
    const snapshot = extractPackageProjectSnapshot(pkg.formData);
    return {
      packageId: pkg.id,
      ...snapshot,
      plannedStartDate: snapshot.workStartActDate,
    };
  }

  /**
   * Атомарное создание проекта с привязкой к пакету: advisory-lock на packageId
   * закрывает гонку «оба проверили, что проекта нет → оба создали» между
   * автосозданием при подписании, автосинком страницы и ручным добавлением.
   */
  private createLinkedToPackage(
    data: Prisma.RepairScheduleProjectUncheckedCreateInput,
    packageId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PACKAGE_PROJECT_LOCK_PREFIX + packageId}))`;
      const existing = await tx.repairScheduleProject.findFirst({
        where: { packageId, deletedAt: null },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('У этого договора уже есть проект в план-графике ремонта');
      }
      return tx.repairScheduleProject.create({ data, include: PROJECT_INCLUDE });
    });
  }

  async create(
    dto: CreateRepairScheduleProjectDto,
    createdById?: string | null,
    options?: { notify?: boolean },
  ) {
    const actorId = emptyToNull(createdById) ?? null;
    const { installerId, installerName } = await this.resolveInstaller(
      dto.installerId,
      dto.installerName,
    );

    let packageId = emptyToNull(dto.packageId) ?? null;
    let contractNumber = emptyToNull(dto.contractNumber) ?? null;
    let customerName = emptyToNull(dto.customerName) ?? null;
    let customerAddress = emptyToNull(dto.customerAddress) ?? null;
    let customerPhone = emptyToNull(dto.customerPhone) ?? null;
    let contractSum = dto.contractSum;
    let payoutSum = dto.payoutSum;
    let plannedStartDate = dto.plannedStartDate ? parseDateOnly(dto.plannedStartDate) : null;
    let workPeriodDays =
      dto.workPeriodDays !== undefined && dto.workPeriodDays !== null
        ? Math.trunc(dto.workPeriodDays)
        : null;
    let workStartActDate = dto.workStartActDate ? parseDateOnly(dto.workStartActDate) : null;
    let workCloseActDate = dto.workCloseActDate ? parseDateOnly(dto.workCloseActDate) : null;

    if (packageId) {
      const fromPkg = await this.enrichFromPackage(packageId);
      packageId = fromPkg.packageId;
      if (!contractNumber) contractNumber = fromPkg.contractNumber;
      if (!customerName) customerName = fromPkg.customerName;
      if (!customerAddress) customerAddress = fromPkg.customerAddress;
      if (!customerPhone) customerPhone = fromPkg.customerPhone;
      if (contractSum === undefined || contractSum === null) contractSum = fromPkg.contractSum;
      if (payoutSum === undefined || payoutSum === null) payoutSum = fromPkg.payoutSum;
      if (workPeriodDays == null && fromPkg.workPeriodDays != null) {
        workPeriodDays = fromPkg.workPeriodDays;
      }
      if (!workStartActDate && fromPkg.workStartActDate) {
        workStartActDate = fromPkg.workStartActDate;
      }
      if (!workCloseActDate && fromPkg.workCloseActDate) {
        workCloseActDate = fromPkg.workCloseActDate;
      }
      if (!plannedStartDate && fromPkg.plannedStartDate) {
        plannedStartDate = fromPkg.plannedStartDate;
      }
    }

    if (!plannedStartDate && workStartActDate) {
      plannedStartDate = workStartActDate;
    }

    const status = dto.status ?? RepairScheduleProjectStatus.NEW;
    const data: Prisma.RepairScheduleProjectUncheckedCreateInput = {
      status,
      contractNumber,
      workScope: emptyToNull(dto.workScope) ?? null,
      installerId,
      installerName,
      packageId,
      customerName,
      customerAddress,
      customerPhone,
      contractSum: decimalOrNull(contractSum) ?? null,
      payoutSum: decimalOrNull(payoutSum) ?? null,
      furnitureInfo: emptyToNull(dto.furnitureInfo) ?? null,
      workPeriodDays,
      workStartActDate,
      workCloseActDate,
      plannedStartDate,
      note: emptyToNull(dto.note) ?? null,
      closedAt: status === RepairScheduleProjectStatus.CLOSED ? new Date() : null,
      createdById: actorId,
      updatedById: actorId,
    };
    const project = packageId
      ? await this.createLinkedToPackage(data, packageId)
      : await this.prisma.repairScheduleProject.create({ data, include: PROJECT_INCLUDE });
    if (actorId && options?.notify !== false) {
      this.notify.onCreated(this.toNotifyPayload(project), actorId);
    }
    return this.withContractInstaller(withDerived(project));
  }

  async findAll(params: {
    status?: RepairScheduleProjectStatus;
    installerId?: string;
    search?: string;
    staleOnly?: boolean;
  }) {
    const status = params.status;
    const search = params.search?.trim();
    const where: Prisma.RepairScheduleProjectWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(params.installerId?.trim() ? { installerId: params.installerId.trim() } : {}),
      ...(search
        ? {
            OR: [
              { contractNumber: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { customerAddress: { contains: search, mode: 'insensitive' } },
              { installerName: { contains: search, mode: 'insensitive' } },
              { workScope: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.repairScheduleProject.findMany({
      where,
      include: PROJECT_INCLUDE,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });

    let result = rows.map((row) => withDerived(row));
    if (params.staleOnly) {
      result = result.filter((row) => row.stale);
    }
    return this.withContractInstallers(result);
  }

  async findMy(userId: string, params?: { status?: RepairScheduleProjectStatus; search?: string }) {
    const search = params?.search?.trim();
    const rows = await this.prisma.repairScheduleProject.findMany({
      where: {
        deletedAt: null,
        installer: { userId },
        ...(params?.status ? { status: params.status } : {}),
        ...(search
          ? {
              OR: [
                { contractNumber: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } },
                { customerAddress: { contains: search, mode: 'insensitive' } },
                { workScope: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: PROJECT_INCLUDE,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
    return this.withContractInstallers(rows.map((row) => withDerived(row)));
  }

  async assertCanAccessProject(projectId: string, userId: string, role: string) {
    if (role !== 'INSTALLER') return;
    const project = await this.prisma.repairScheduleProject.findUnique({
      where: { id: projectId },
      select: { installer: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException(`Repair schedule project ${projectId} not found`);
    if (project.installer?.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому проекту');
    }
  }

  async findOne(id: string) {
    const project = await this.prisma.repairScheduleProject.findUnique({
      where: { id },
      include: PROJECT_DETAIL_INCLUDE,
    });
    if (!project) throw new NotFoundException(`Repair schedule project ${id} not found`);
    return this.withContractInstaller(withDerived(project));
  }

  async update(
    id: string,
    dto: UpdateRepairScheduleProjectDto,
    actorUserId?: string | null,
    options?: { notify?: boolean },
  ) {
    await this.findOne(id);
    const actorId = emptyToNull(actorUserId) ?? null;
    const data: Prisma.RepairScheduleProjectUpdateInput = {};
    if (actorId) data.updatedBy = { connect: { id: actorId } };

    if (dto.status !== undefined) {
      data.status = dto.status;
      data.closedAt = dto.status === RepairScheduleProjectStatus.CLOSED ? new Date() : null;
    }
    if (dto.contractNumber !== undefined) {
      data.contractNumber = emptyToNull(dto.contractNumber) ?? null;
    }
    if (dto.workScope !== undefined) data.workScope = emptyToNull(dto.workScope) ?? null;
    if (dto.customerName !== undefined) {
      data.customerName = emptyToNull(dto.customerName) ?? null;
    }
    if (dto.customerAddress !== undefined) {
      data.customerAddress = emptyToNull(dto.customerAddress) ?? null;
    }
    if (dto.customerPhone !== undefined) {
      data.customerPhone = emptyToNull(dto.customerPhone) ?? null;
    }
    if (dto.furnitureInfo !== undefined) {
      data.furnitureInfo = emptyToNull(dto.furnitureInfo) ?? null;
    }
    if (dto.note !== undefined) data.note = emptyToNull(dto.note) ?? null;
    if (dto.contractSum !== undefined) data.contractSum = decimalOrNull(dto.contractSum);
    if (dto.payoutSum !== undefined) data.payoutSum = decimalOrNull(dto.payoutSum);
    if (dto.plannedStartDate !== undefined) {
      data.plannedStartDate = dto.plannedStartDate ? parseDateOnly(dto.plannedStartDate) : null;
    }
    if (dto.workPeriodDays !== undefined) {
      data.workPeriodDays =
        dto.workPeriodDays === null || dto.workPeriodDays === undefined
          ? null
          : Math.trunc(dto.workPeriodDays);
    }
    if (dto.workStartActDate !== undefined) {
      data.workStartActDate = dto.workStartActDate ? parseDateOnly(dto.workStartActDate) : null;
      if (dto.plannedStartDate === undefined && dto.workStartActDate) {
        data.plannedStartDate = parseDateOnly(dto.workStartActDate);
      }
    }
    if (dto.workCloseActDate !== undefined) {
      data.workCloseActDate = dto.workCloseActDate ? parseDateOnly(dto.workCloseActDate) : null;
    }

    if (dto.installerId !== undefined || dto.installerName !== undefined) {
      const resolved = await this.resolveInstaller(
        dto.installerId !== undefined ? dto.installerId : undefined,
        dto.installerName !== undefined ? dto.installerName : undefined,
      );
      if (dto.installerId !== undefined) {
        if (resolved.installerId) data.installer = { connect: { id: resolved.installerId } };
        else data.installer = { disconnect: true };
      }
      if (dto.installerName !== undefined || resolved.installerName) {
        data.installerName =
          dto.installerName !== undefined
            ? (emptyToNull(dto.installerName) ?? resolved.installerName)
            : resolved.installerName;
      }
    }

    if (dto.packageId !== undefined) {
      const packageId = emptyToNull(dto.packageId) ?? null;
      if (packageId) {
        const fromPkg = await this.enrichFromPackage(packageId);
        const rival = await this.prisma.repairScheduleProject.findFirst({
          where: { packageId: fromPkg.packageId, deletedAt: null, id: { not: id } },
          select: { id: true },
        });
        if (rival) {
          throw new ConflictException('К этому договору уже привязан другой проект план-графика');
        }
        data.package = { connect: { id: fromPkg.packageId } };
        if (dto.contractNumber === undefined && fromPkg.contractNumber) {
          data.contractNumber = fromPkg.contractNumber;
        }
        if (dto.customerName === undefined && fromPkg.customerName) {
          data.customerName = fromPkg.customerName;
        }
        if (dto.customerAddress === undefined && fromPkg.customerAddress) {
          data.customerAddress = fromPkg.customerAddress;
        }
        if (dto.customerPhone === undefined && fromPkg.customerPhone) {
          data.customerPhone = fromPkg.customerPhone;
        }
        if (dto.contractSum === undefined && fromPkg.contractSum != null) {
          data.contractSum = decimalOrNull(fromPkg.contractSum);
        }
        if (dto.payoutSum === undefined && fromPkg.payoutSum != null) {
          data.payoutSum = decimalOrNull(fromPkg.payoutSum);
        }
        if (dto.plannedStartDate === undefined && fromPkg.plannedStartDate) {
          data.plannedStartDate = fromPkg.plannedStartDate;
        }
        if (dto.workPeriodDays === undefined && fromPkg.workPeriodDays != null) {
          data.workPeriodDays = fromPkg.workPeriodDays;
        }
        if (dto.workStartActDate === undefined && fromPkg.workStartActDate) {
          data.workStartActDate = fromPkg.workStartActDate;
        }
        if (dto.workCloseActDate === undefined && fromPkg.workCloseActDate) {
          data.workCloseActDate = fromPkg.workCloseActDate;
        }
      } else {
        data.package = { disconnect: true };
      }
    }

    const updated = await this.prisma.repairScheduleProject.update({
      where: { id },
      data,
      include: PROJECT_DETAIL_INCLUDE,
    });
    const derived = await this.withContractInstaller(withDerived(updated));
    const skipNotify = options?.notify === false || !actorId;
    if (dto.status !== undefined) {
      if (!skipNotify) this.notify.onStatusChanged(this.toNotifyPayload(updated), actorId);
    } else if (!skipNotify) {
      this.notify.onUpdated(this.toNotifyPayload(updated), actorId);
    }
    return derived;
  }

  async setStatus(
    id: string,
    status: RepairScheduleProjectStatus,
    actorUserId?: string | null,
    options?: { notify?: boolean },
  ) {
    return this.update(id, { status }, actorUserId, options);
  }

  /**
   * Ручная смена статуса разрешена только у проектов, созданных вручную:
   * статус пакетных проектов двигает автосинхронизация из пакета документов.
   */
  async assertManualStatusAllowed(id: string) {
    const project = await this.prisma.repairScheduleProject.findUnique({
      where: { id },
      select: { packageId: true },
    });
    if (!project) throw new NotFoundException('Проект план-графика не найден');
    if (project.packageId) {
      throw new ForbiddenException(
        'Договор добавлен в план-график из пакета документов — статус меняется автоматически',
      );
    }
  }

  /** Удаление договора — только мягкое: проект уходит в корзину (восстановление — из корзины). */
  async remove(id: string, actorUserId?: string | null) {
    const project = await this.prisma.repairScheduleProject.findFirst({
      where: { id },
      select: { packageId: true, deletedAt: true },
    });
    if (!project) throw new NotFoundException('Проект план-графика не найден');
    if (project.deletedAt) throw new BadRequestException('Договор уже в корзине');
    if (project.packageId) {
      // Проект пакета нельзя удалить, пока он единственный: закрывается через договор.
      // Дубли (созданные до защиты от гонок) — можно, основной проект остаётся.
      const activeCount = await this.prisma.repairScheduleProject.count({
        where: { packageId: project.packageId, deletedAt: null },
      });
      if (activeCount <= 1) {
        throw new ForbiddenException(
          'Договор добавлен в план-график из пакета документов — единственный проект пакета удалить нельзя',
        );
      }
    }
    const trashed = await this.prisma.repairScheduleProject.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: emptyToNull(actorUserId) ?? null },
      include: PROJECT_INCLUDE,
    });
    return withDerived(trashed);
  }

  async trashCount() {
    return this.trash.trashCount();
  }

  async findTrash(params: { search?: string; page?: number; limit?: number }) {
    return this.trash.findTrash(params);
  }

  async restore(id: string) {
    return this.trash.restore(id);
  }

  async addEntry(projectId: string, dto: CreateRepairScheduleEntryDto, createdById: string) {
    await this.findOne(projectId);
    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Укажите текст записи');
    await this.prisma.repairScheduleEntry.create({
      data: {
        projectId,
        date: parseDateOnly(dto.date),
        kind: dto.kind ?? RepairScheduleEntryKind.WEEKLY,
        text,
        createdById,
      },
    });
    await this.prisma.repairScheduleProject.update({
      where: { id: projectId },
      data: { updatedById: createdById },
    });
    const project = await this.findOne(projectId);
    this.notify.onEntryAdded(this.toNotifyPayload(project, text), createdById);
    return project;
  }

  async updateEntry(
    projectId: string,
    entryId: string,
    dto: UpdateRepairScheduleEntryDto,
    actorUserId: string,
  ) {
    const entry = await this.prisma.repairScheduleEntry.findFirst({
      where: { id: entryId, projectId },
    });
    if (!entry) throw new NotFoundException('Запись не найдена');
    await this.prisma.repairScheduleEntry.update({
      where: { id: entryId },
      data: {
        ...(dto.date !== undefined ? { date: parseDateOnly(dto.date) } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.text !== undefined ? { text: dto.text.trim() } : {}),
      },
    });
    await this.prisma.repairScheduleProject.update({
      where: { id: projectId },
      data: { updatedById: actorUserId },
    });
    return this.findOne(projectId);
  }

  async removeEntry(projectId: string, entryId: string, actorUserId: string) {
    const entry = await this.prisma.repairScheduleEntry.findFirst({
      where: { id: entryId, projectId },
    });
    if (!entry) throw new NotFoundException('Запись не найдена');
    await this.prisma.repairScheduleEntry.delete({ where: { id: entryId } });
    await this.prisma.repairScheduleProject.update({
      where: { id: projectId },
      data: { updatedById: actorUserId },
    });
    return this.findOne(projectId);
  }
}
