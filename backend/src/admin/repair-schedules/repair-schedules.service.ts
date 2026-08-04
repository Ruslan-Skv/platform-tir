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
import { parseRepairScheduleExcel } from './repair-schedule-excel.parser';
import {
  RepairScheduleNotifyProject,
  RepairScheduleNotifyService,
} from './repair-schedule-notify.service';
import { UpdateRepairScheduleEntryDto } from './dto/update-repair-schedule-entry.dto';
import { UpdateRepairScheduleProjectDto } from './dto/update-repair-schedule-project.dto';

/** Проекты «В работе» без записи за это число дней считаются «протухшими». */
export const REPAIR_SCHEDULE_STALE_DAYS = 7;

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

const PROJECT_INCLUDE: Prisma.RepairScheduleProjectInclude = {
  installer: {
    select: { id: true, fullName: true, direction: true, grade: true, userId: true },
  },
  package: {
    select: {
      id: true,
      kind: true,
      title: true,
      status: true,
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
        },
      },
    },
  },
  contract: {
    select: {
      id: true,
      contractNumber: true,
      customerName: true,
      customerAddress: true,
      customerPhone: true,
    },
  },
  createdBy: { select: USER_SELECT },
  updatedBy: { select: USER_SELECT },
  entries: {
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 1,
    include: { createdBy: { select: USER_SELECT } },
  },
};

const PROJECT_DETAIL_INCLUDE: Prisma.RepairScheduleProjectInclude = {
  ...PROJECT_INCLUDE,
  entries: {
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: { createdBy: { select: USER_SELECT } },
  },
};

@Injectable()
export class RepairSchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: RepairScheduleNotifyService,
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

  private emptyToNull(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private parseDateOnly(dateStr: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!m) throw new BadRequestException('date must be YYYY-MM-DD');
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  private asFormDataRecord(formData: unknown): Record<string, unknown> {
    if (!formData || typeof formData !== 'object' || Array.isArray(formData)) return {};
    return formData as Record<string, unknown>;
  }

  private customerFromFormData(formData: Record<string, unknown>) {
    const customer = this.asFormDataRecord(formData.customer);
    const object = this.asFormDataRecord(formData.object);
    const contract = this.asFormDataRecord(formData.contract);
    const str = (...values: unknown[]) => {
      for (const v of values) {
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      return null;
    };
    const phoneFromPhones = Array.isArray(customer.phones) ? customer.phones[0] : null;
    return {
      customerName: str(
        formData.customerName,
        formData.clientFullName,
        formData.fio,
        customer.fullName,
        customer.customerName,
        customer.fio,
      ),
      customerAddress: str(
        formData.customerAddress,
        formData.objectAddress,
        formData.address,
        object.objectAddress,
        customer.address,
        customer.customerAddress,
      ),
      customerPhone: str(
        formData.customerPhone,
        formData.clientPhone,
        formData.phone,
        customer.phone,
        phoneFromPhones,
        customer.customerPhone,
      ),
      contractNumber: str(formData.contractNumber, formData.dogovorNumber, contract.number),
    };
  }

  private decimalOrNull(value?: number | null): Prisma.Decimal | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Prisma.Decimal(value);
  }

  private withDerived<
    T extends {
      status: RepairScheduleProjectStatus;
      entries: Array<{ date: Date; text: string; kind: RepairScheduleEntryKind; id: string }>;
    },
  >(project: T) {
    const latestEntry = project.entries[0] ?? null;
    const stale =
      project.status === RepairScheduleProjectStatus.IN_PROGRESS &&
      (!latestEntry ||
        Date.now() - latestEntry.date.getTime() > REPAIR_SCHEDULE_STALE_DAYS * 24 * 60 * 60 * 1000);
    return {
      ...project,
      latestEntry,
      stale,
      staleDays: REPAIR_SCHEDULE_STALE_DAYS,
    };
  }

  private async resolveInstaller(
    installerId?: string | null,
    installerName?: string | null,
  ): Promise<{ installerId: string | null; installerName: string | null }> {
    const id = this.emptyToNull(installerId) ?? null;
    let name = this.emptyToNull(installerName) ?? null;
    if (id) {
      const installer = await this.prisma.installerMaster.findUnique({
        where: { id },
        select: { id: true, fullName: true, direction: true },
      });
      if (!installer) throw new BadRequestException('Мастер не найден');
      if (installer.direction !== 'REPAIR') {
        throw new BadRequestException('Для план-графика ремонта нужен мастер направления «Ремонт»');
      }
      if (!name) name = installer.fullName;
    }
    return { installerId: id, installerName: name };
  }

  private moneyFromUnknown(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'object' && value !== null && 'toNumber' in value) {
      const n = (value as { toNumber: () => number }).toNumber();
      return Number.isFinite(n) ? n : null;
    }
    const raw = String(value).replace(/\s/g, '').replace(',', '.');
    const match = raw.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }

  private moneyFromFormContract(formData: Record<string, unknown>, key: string): number | null {
    const contract = this.asFormDataRecord(formData.contract);
    return this.moneyFromUnknown(contract[key]);
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
          },
        },
      },
    });
    if (!pkg) throw new BadRequestException('Пакет документов не найден');
    const form = this.asFormDataRecord(pkg.formData);
    const fromForm = this.customerFromFormData(form);
    const contractSum =
      this.moneyFromUnknown(pkg.crmContract?.totalAmount) ??
      this.moneyFromFormContract(form, 'totalAmount') ??
      this.moneyFromFormContract(form, 'contractCost');
    const payoutSum =
      this.moneyFromUnknown(pkg.crmContract?.advanceAmount) ??
      this.moneyFromFormContract(form, 'prepaymentAmount');
    return {
      packageId: pkg.id,
      contractId: pkg.crmContractId,
      contractNumber: pkg.crmContract?.contractNumber?.trim() || fromForm.contractNumber,
      customerName: pkg.crmContract?.customerName?.trim() || fromForm.customerName,
      customerAddress: pkg.crmContract?.customerAddress?.trim() || fromForm.customerAddress,
      customerPhone: pkg.crmContract?.customerPhone?.trim() || fromForm.customerPhone,
      contractSum,
      payoutSum,
      plannedStartDate: pkg.crmContract?.actWorkStartDate ?? null,
    };
  }

  async create(dto: CreateRepairScheduleProjectDto, createdById: string) {
    const { installerId, installerName } = await this.resolveInstaller(
      dto.installerId,
      dto.installerName,
    );

    let packageId = this.emptyToNull(dto.packageId) ?? null;
    let contractId = this.emptyToNull(dto.contractId) ?? null;
    let contractNumber = this.emptyToNull(dto.contractNumber) ?? null;
    let customerName = this.emptyToNull(dto.customerName) ?? null;
    let customerAddress = this.emptyToNull(dto.customerAddress) ?? null;
    let customerPhone = this.emptyToNull(dto.customerPhone) ?? null;
    let contractSum = dto.contractSum;
    let payoutSum = dto.payoutSum;
    let plannedStartDate = dto.plannedStartDate ? this.parseDateOnly(dto.plannedStartDate) : null;

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
        },
      });
      if (!contract) throw new BadRequestException('Договор не найден');
      if (!contractNumber) contractNumber = contract.contractNumber;
      if (!customerName) customerName = contract.customerName?.trim() || null;
      if (!customerAddress) customerAddress = contract.customerAddress?.trim() || null;
      if (!customerPhone) customerPhone = contract.customerPhone?.trim() || null;
      if (contractSum === undefined || contractSum === null) {
        contractSum = this.moneyFromUnknown(contract.totalAmount);
      }
      if (payoutSum === undefined || payoutSum === null) {
        payoutSum = this.moneyFromUnknown(contract.advanceAmount);
      }
      if (!plannedStartDate && contract.actWorkStartDate) {
        plannedStartDate = contract.actWorkStartDate;
      }
    }

    const status = dto.status ?? RepairScheduleProjectStatus.NEW;
    const project = await this.prisma.repairScheduleProject.create({
      data: {
        status,
        contractNumber,
        workScope: this.emptyToNull(dto.workScope) ?? null,
        installerId,
        installerName,
        packageId,
        contractId,
        customerName,
        customerAddress,
        customerPhone,
        contractSum: this.decimalOrNull(contractSum) ?? null,
        payoutSum: this.decimalOrNull(payoutSum) ?? null,
        furnitureInfo: this.emptyToNull(dto.furnitureInfo) ?? null,
        plannedStartDate,
        note: this.emptyToNull(dto.note) ?? null,
        closedAt: status === RepairScheduleProjectStatus.CLOSED ? new Date() : null,
        createdById,
        updatedById: createdById,
      },
      include: PROJECT_INCLUDE,
    });
    this.notify.onCreated(this.toNotifyPayload(project), createdById);
    return this.withDerived(project);
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

    let result = rows.map((row) => this.withDerived(row));
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
    return rows.map((row) => this.withDerived(row));
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
    return this.withDerived(project);
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
      data.contractNumber = this.emptyToNull(dto.contractNumber) ?? null;
    }
    if (dto.workScope !== undefined) data.workScope = this.emptyToNull(dto.workScope) ?? null;
    if (dto.customerName !== undefined) {
      data.customerName = this.emptyToNull(dto.customerName) ?? null;
    }
    if (dto.customerAddress !== undefined) {
      data.customerAddress = this.emptyToNull(dto.customerAddress) ?? null;
    }
    if (dto.customerPhone !== undefined) {
      data.customerPhone = this.emptyToNull(dto.customerPhone) ?? null;
    }
    if (dto.furnitureInfo !== undefined) {
      data.furnitureInfo = this.emptyToNull(dto.furnitureInfo) ?? null;
    }
    if (dto.note !== undefined) data.note = this.emptyToNull(dto.note) ?? null;
    if (dto.contractSum !== undefined) data.contractSum = this.decimalOrNull(dto.contractSum);
    if (dto.payoutSum !== undefined) data.payoutSum = this.decimalOrNull(dto.payoutSum);
    if (dto.plannedStartDate !== undefined) {
      data.plannedStartDate = dto.plannedStartDate
        ? this.parseDateOnly(dto.plannedStartDate)
        : null;
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
            ? (this.emptyToNull(dto.installerName) ?? resolved.installerName)
            : resolved.installerName;
      }
    }

    if (dto.packageId !== undefined) {
      const packageId = this.emptyToNull(dto.packageId) ?? null;
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
          data.contractSum = this.decimalOrNull(fromPkg.contractSum);
        }
        if (dto.payoutSum === undefined && fromPkg.payoutSum != null) {
          data.payoutSum = this.decimalOrNull(fromPkg.payoutSum);
        }
        if (dto.plannedStartDate === undefined && fromPkg.plannedStartDate) {
          data.plannedStartDate = fromPkg.plannedStartDate;
        }
      } else {
        data.package = { disconnect: true };
      }
    }

    if (dto.contractId !== undefined) {
      const contractId = this.emptyToNull(dto.contractId) ?? null;
      if (contractId) data.contract = { connect: { id: contractId } };
      else data.contract = { disconnect: true };
    }

    const updated = await this.prisma.repairScheduleProject.update({
      where: { id },
      data,
      include: PROJECT_DETAIL_INCLUDE,
    });
    const derived = this.withDerived(updated);
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
        date: this.parseDateOnly(dto.date),
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
        ...(dto.date !== undefined ? { date: this.parseDateOnly(dto.date) } : {}),
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

  private normalizeContractKey(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase().replace(/\s+/g, '');
  }

  private normalizeName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private matchInstallerId(
    name: string | null,
    installers: Array<{ id: string; fullName: string }>,
  ): string | null {
    if (!name) return null;
    const key = this.normalizeName(name);
    const exact = installers.find((i) => this.normalizeName(i.fullName) === key);
    if (exact) return exact.id;
    const partial = installers.find(
      (i) =>
        this.normalizeName(i.fullName).includes(key) ||
        key.includes(this.normalizeName(i.fullName)),
    );
    return partial?.id ?? null;
  }

  /**
   * Импорт матрицы Excel/Google Sheets (.xlsx/.xls/.csv) за годы 2025–2026.
   * Upsert по № договора; еженедельные ячейки → записи WEEKLY.
   */
  async importFromExcel(buffer: Buffer, actorUserId: string, options?: { years?: number[] }) {
    const parsed = parseRepairScheduleExcel(buffer, {
      years: options?.years ?? [2025, 2026],
    });
    if (parsed.projects.length === 0) {
      throw new BadRequestException(
        'В файле не найдено проектов ремонта (проверьте лист и колонки 2025–2026)',
      );
    }

    const installers = await this.prisma.installerMaster.findMany({
      where: { direction: 'REPAIR' },
      select: { id: true, fullName: true },
    });

    const existing = await this.prisma.repairScheduleProject.findMany({
      where: { contractNumber: { not: null } },
      select: { id: true, contractNumber: true },
    });
    const byContract = new Map(
      existing
        .filter((p) => p.contractNumber)
        .map((p) => [this.normalizeContractKey(p.contractNumber), p.id]),
    );

    let created = 0;
    let updated = 0;
    let entriesUpserted = 0;

    for (const row of parsed.projects) {
      const installerId = this.matchInstallerId(row.installerName, installers);
      const contractKey = this.normalizeContractKey(row.contractNumber);
      const existingId = contractKey ? byContract.get(contractKey) : undefined;

      let projectId: string;
      if (existingId) {
        await this.prisma.repairScheduleProject.update({
          where: { id: existingId },
          data: {
            status: row.status,
            workScope: row.workScope,
            installerId,
            installerName: row.installerName,
            customerAddress: row.customerAddress,
            contractSum: this.decimalOrNull(row.contractSum) ?? undefined,
            payoutSum: this.decimalOrNull(row.payoutSum) ?? undefined,
            furnitureInfo: row.furnitureInfo,
            closedAt: row.status === RepairScheduleProjectStatus.CLOSED ? new Date() : null,
            updatedById: actorUserId,
          },
        });
        projectId = existingId;
        updated += 1;
      } else {
        const createdRow = await this.prisma.repairScheduleProject.create({
          data: {
            status: row.status,
            contractNumber: row.contractNumber,
            workScope: row.workScope,
            installerId,
            installerName: row.installerName,
            customerAddress: row.customerAddress,
            contractSum: this.decimalOrNull(row.contractSum) ?? null,
            payoutSum: this.decimalOrNull(row.payoutSum) ?? null,
            furnitureInfo: row.furnitureInfo,
            closedAt: row.status === RepairScheduleProjectStatus.CLOSED ? new Date() : null,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
        });
        projectId = createdRow.id;
        if (contractKey) byContract.set(contractKey, projectId);
        created += 1;
      }

      for (const entry of row.entries) {
        const date = this.parseDateOnly(entry.date);
        const existingEntry = await this.prisma.repairScheduleEntry.findFirst({
          where: { projectId, date },
          select: { id: true, text: true },
        });
        if (existingEntry) {
          if (existingEntry.text !== entry.text) {
            await this.prisma.repairScheduleEntry.update({
              where: { id: existingEntry.id },
              data: { text: entry.text, kind: RepairScheduleEntryKind.WEEKLY },
            });
            entriesUpserted += 1;
          }
        } else {
          await this.prisma.repairScheduleEntry.create({
            data: {
              projectId,
              date,
              kind: RepairScheduleEntryKind.WEEKLY,
              text: entry.text,
              createdById: actorUserId,
            },
          });
          entriesUpserted += 1;
        }
      }
    }

    return {
      sheetName: parsed.sheetName,
      weekColumns: parsed.weekColumns,
      projectsInFile: parsed.projects.length,
      skippedRows: parsed.skippedRows,
      created,
      updated,
      entriesUpserted,
    };
  }
}
