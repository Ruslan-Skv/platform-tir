import {
  BadRequestException,
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
  asFormDataRecord,
  customerFromFormData,
  decimalOrNull,
  emptyToNull,
  extractPackageContractTerms,
  moneyFromFormContract,
  moneyFromUnknown,
  parseDateOnly,
  withDerived,
} from './repair-schedule.shared';
import { RepairSchedulesImportService } from './repair-schedules-import.service';
import { UpdateRepairScheduleEntryDto } from './dto/update-repair-schedule-entry.dto';
import { UpdateRepairScheduleProjectDto } from './dto/update-repair-schedule-project.dto';

export { REPAIR_SCHEDULE_STALE_DAYS } from './repair-schedule.shared';

@Injectable()
export class RepairSchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: RepairScheduleNotifyService,
    private readonly importService: RepairSchedulesImportService,
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

  private async enrichFromPackage(packageId: string) {
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
            totalAmount: true,
            advanceAmount: true,
            actWorkStartDate: true,
            actWorkEndDate: true,
            contractDurationDays: true,
          },
        },
      },
    });
    if (!pkg) throw new BadRequestException('Пакет документов не найден');
    const form = asFormDataRecord(pkg.formData);
    const fromForm = customerFromFormData(form);
    const terms = extractPackageContractTerms(pkg.formData);
    const contractSum =
      moneyFromUnknown(pkg.crmContract?.totalAmount) ??
      moneyFromFormContract(form, 'totalAmount') ??
      moneyFromFormContract(form, 'contractCost');
    const payoutSum =
      moneyFromUnknown(pkg.crmContract?.advanceAmount) ??
      moneyFromFormContract(form, 'prepaymentAmount');
    const workStartActDate =
      (terms.workStartActDate ? parseDateOnly(terms.workStartActDate) : null) ??
      pkg.crmContract?.actWorkStartDate ??
      null;
    const workCloseActDate =
      (terms.workCloseActDate ? parseDateOnly(terms.workCloseActDate) : null) ??
      pkg.crmContract?.actWorkEndDate ??
      null;
    const workPeriodDays = terms.workPeriodDays ?? pkg.crmContract?.contractDurationDays ?? null;
    return {
      packageId: pkg.id,
      contractId: pkg.crmContractId,
      contractNumber: pkg.crmContract?.contractNumber?.trim() || fromForm.contractNumber,
      customerName: pkg.crmContract?.customerName?.trim() || fromForm.customerName,
      customerAddress: pkg.crmContract?.customerAddress?.trim() || fromForm.customerAddress,
      customerPhone: pkg.crmContract?.customerPhone?.trim() || fromForm.customerPhone,
      contractSum,
      payoutSum,
      workPeriodDays,
      workStartActDate,
      workCloseActDate,
      plannedStartDate: workStartActDate,
    };
  }

  async create(dto: CreateRepairScheduleProjectDto, createdById?: string | null) {
    const actorId = emptyToNull(createdById) ?? null;
    const { installerId, installerName } = await this.resolveInstaller(
      dto.installerId,
      dto.installerName,
    );

    let packageId = emptyToNull(dto.packageId) ?? null;
    let contractId = emptyToNull(dto.contractId) ?? null;
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
      if (!contractId) contractId = fromPkg.contractId;
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
    } else if (contractId) {
      const contract = await this.prisma.contract.findUnique({
        where: { id: contractId },
        select: {
          id: true,
          contractNumber: true,
          customerName: true,
          customerAddress: true,
          customerPhone: true,
          totalAmount: true,
          advanceAmount: true,
          actWorkStartDate: true,
          actWorkEndDate: true,
          contractDurationDays: true,
        },
      });
      if (!contract) throw new BadRequestException('Договор не найден');
      if (!contractNumber) contractNumber = contract.contractNumber;
      if (!customerName) customerName = contract.customerName?.trim() || null;
      if (!customerAddress) customerAddress = contract.customerAddress?.trim() || null;
      if (!customerPhone) customerPhone = contract.customerPhone?.trim() || null;
      if (contractSum === undefined || contractSum === null) {
        contractSum = moneyFromUnknown(contract.totalAmount);
      }
      if (payoutSum === undefined || payoutSum === null) {
        payoutSum = moneyFromUnknown(contract.advanceAmount);
      }
      if (workPeriodDays == null && contract.contractDurationDays != null) {
        workPeriodDays = contract.contractDurationDays;
      }
      if (!workStartActDate && contract.actWorkStartDate) {
        workStartActDate = contract.actWorkStartDate;
      }
      if (!workCloseActDate && contract.actWorkEndDate) {
        workCloseActDate = contract.actWorkEndDate;
      }
      if (!plannedStartDate && contract.actWorkStartDate) {
        plannedStartDate = contract.actWorkStartDate;
      }
    }

    if (!plannedStartDate && workStartActDate) {
      plannedStartDate = workStartActDate;
    }

    const status = dto.status ?? RepairScheduleProjectStatus.NEW;
    const project = await this.prisma.repairScheduleProject.create({
      data: {
        status,
        contractNumber,
        workScope: emptyToNull(dto.workScope) ?? null,
        installerId,
        installerName,
        packageId,
        contractId,
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
      },
      include: PROJECT_INCLUDE,
    });
    if (actorId) {
      this.notify.onCreated(this.toNotifyPayload(project), actorId);
    }
    return withDerived(project);
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
    return result;
  }

  async findMy(userId: string, params?: { status?: RepairScheduleProjectStatus; search?: string }) {
    const search = params?.search?.trim();
    const rows = await this.prisma.repairScheduleProject.findMany({
      where: {
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
    return rows.map((row) => withDerived(row));
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
    return withDerived(project);
  }

  async update(id: string, dto: UpdateRepairScheduleProjectDto, actorUserId: string) {
    await this.findOne(id);
    const data: Prisma.RepairScheduleProjectUpdateInput = {
      updatedBy: { connect: { id: actorUserId } },
    };

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
        data.package = { connect: { id: fromPkg.packageId } };
        if (dto.contractId === undefined && fromPkg.contractId) {
          data.contract = { connect: { id: fromPkg.contractId } };
        }
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

    if (dto.contractId !== undefined) {
      const contractId = emptyToNull(dto.contractId) ?? null;
      if (contractId) data.contract = { connect: { id: contractId } };
      else data.contract = { disconnect: true };
    }

    const updated = await this.prisma.repairScheduleProject.update({
      where: { id },
      data,
      include: PROJECT_DETAIL_INCLUDE,
    });
    const derived = withDerived(updated);
    if (dto.status !== undefined) {
      this.notify.onStatusChanged(this.toNotifyPayload(updated), actorUserId);
    } else {
      this.notify.onUpdated(this.toNotifyPayload(updated), actorUserId);
    }
    return derived;
  }

  async setStatus(id: string, status: RepairScheduleProjectStatus, actorUserId: string) {
    return this.update(id, { status }, actorUserId);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.repairScheduleProject.delete({ where: { id } });
    return { ok: true };
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

  importFromExcel(buffer: Buffer, actorUserId: string, options?: { years?: number[] }) {
    return this.importService.importFromExcel(buffer, actorUserId, options);
  }
}
