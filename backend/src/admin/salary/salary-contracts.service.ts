import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { toNum, toDateIso, fromDateIso } from './salary.constants';
import type {
  CreateSalaryContractDto,
  QuerySalaryContractsDto,
  UpdateSalaryContractDto,
} from './dto/salary-contract.dto';

const CONTRACT_INCLUDE = {
  office: { select: { id: true, name: true } },
  category: { select: { id: true, code: true, name: true } },
  manager: { select: { id: true, firstName: true, lastName: true } },
  surveyor: { select: { id: true, firstName: true, lastName: true } },
  extraBills: { orderBy: { date: 'asc' as const } },
} satisfies Prisma.SalaryContractInclude;

function joinUserName(lastName?: string | null, firstName?: string | null): string | null {
  const name = [lastName, firstName].filter(Boolean).join(' ').trim();
  return name.length > 0 ? name : null;
}

@Injectable()
export class SalaryContractsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QuerySalaryContractsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where: Prisma.SalaryContractWhereInput = {
      officeId: query.officeId,
      categoryId: query.categoryId,
      // Тип записи: «auto» — синхронизированы из договоров, «manual» — внесены вручную/импом.
      sourcePackageId:
        query.entryKind === 'auto'
          ? { not: null }
          : query.entryKind === 'manual'
            ? null
            : undefined,
      signedAt: query.dateFrom
        ? {
            gte: fromDateIso(query.dateFrom),
            lte: query.dateTo ? fromDateIso(query.dateTo) : undefined,
          }
        : query.dateTo
          ? { lte: fromDateIso(query.dateTo) }
          : undefined,
      OR: query.search
        ? [
            { number: { contains: query.search, mode: 'insensitive' } },
            { customerName: { contains: query.search, mode: 'insensitive' } },
            { managerName: { contains: query.search, mode: 'insensitive' } },
            { surveyorName: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [total, contracts] = await Promise.all([
      this.prisma.salaryContract.count({ where }),
      this.prisma.salaryContract.findMany({
        where,
        include: CONTRACT_INCLUDE,
        orderBy: [{ signedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      items: contracts.map((c) => this.serialize(c)),
    };
  }

  async findOne(id: string) {
    const contract = await this.prisma.salaryContract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });
    if (!contract) throw new NotFoundException(`Договор ${id} не найден`);
    return this.serialize(contract);
  }

  async create(dto: CreateSalaryContractDto, userId?: string) {
    await this.ensureRefs(dto.officeId, dto.categoryId, dto.managerId, dto.surveyorId);
    await this.ensureUniqueNumber(dto.officeId, dto.number);
    const contract = await this.prisma.salaryContract.create({
      data: {
        officeId: dto.officeId,
        categoryId: dto.categoryId,
        number: dto.number.trim(),
        signedAt: dto.signedAt ? fromDateIso(dto.signedAt) : null,
        closedAt: dto.closedAt ? fromDateIso(dto.closedAt) : null,
        customerName: dto.customerName ?? null,
        managerId: dto.managerId ?? null,
        managerName: dto.managerName ?? null,
        surveyorId: dto.surveyorId ?? null,
        surveyorName: dto.surveyorName ?? null,
        managerHandled: dto.managerHandled ?? true,
        surveyorHandled: dto.surveyorHandled ?? true,
        baseAmount: dto.baseAmount,
        managerPercentOverride: dto.managerPercentOverride ?? null,
        surveyorPercentOverride: dto.surveyorPercentOverride ?? null,
        vsPercentOverride: dto.vsPercentOverride ?? null,
        brigadierPercentOverride: dto.brigadierPercentOverride ?? null,
        source: dto.source ?? null,
        note: dto.note ?? null,
        extraBills: dto.extraBills
          ? {
              create: dto.extraBills.map((b) => ({
                amount: b.amount,
                date: fromDateIso(b.date),
                note: b.note ?? null,
              })),
            }
          : undefined,
      },
      include: CONTRACT_INCLUDE,
    });
    void userId;
    return this.serialize(contract);
  }

  async update(id: string, dto: UpdateSalaryContractDto, userId?: string) {
    await this.findOne(id);
    if (dto.officeId || dto.categoryId) {
      await this.ensureRefs(
        dto.officeId ?? undefined,
        dto.categoryId ?? undefined,
        dto.managerId ?? undefined,
        dto.surveyorId ?? undefined,
      );
    }
    if (dto.number) {
      await this.ensureUniqueNumber(dto.officeId ?? undefined, dto.number, id);
    }

    const data: Prisma.SalaryContractUncheckedUpdateInput = {};
    if (dto.officeId !== undefined) data.officeId = dto.officeId;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.number !== undefined) data.number = dto.number.trim();
    if (dto.signedAt !== undefined) data.signedAt = dto.signedAt ? fromDateIso(dto.signedAt) : null;
    if (dto.closedAt !== undefined) data.closedAt = dto.closedAt ? fromDateIso(dto.closedAt) : null;
    if (dto.customerName !== undefined) data.customerName = dto.customerName ?? null;
    if (dto.managerId !== undefined) data.managerId = dto.managerId ?? null;
    if (dto.managerName !== undefined) data.managerName = dto.managerName ?? null;
    if (dto.surveyorId !== undefined) data.surveyorId = dto.surveyorId ?? null;
    if (dto.surveyorName !== undefined) data.surveyorName = dto.surveyorName ?? null;
    if (dto.managerHandled !== undefined) data.managerHandled = dto.managerHandled;
    if (dto.surveyorHandled !== undefined) data.surveyorHandled = dto.surveyorHandled;
    if (dto.baseAmount !== undefined) data.baseAmount = dto.baseAmount;
    if (dto.managerPercentOverride !== undefined)
      data.managerPercentOverride = dto.managerPercentOverride ?? null;
    if (dto.surveyorPercentOverride !== undefined)
      data.surveyorPercentOverride = dto.surveyorPercentOverride ?? null;
    if (dto.vsPercentOverride !== undefined) data.vsPercentOverride = dto.vsPercentOverride ?? null;
    if (dto.brigadierPercentOverride !== undefined)
      data.brigadierPercentOverride = dto.brigadierPercentOverride ?? null;
    if (dto.source !== undefined) data.source = dto.source ?? null;
    if (dto.note !== undefined) data.note = dto.note ?? null;

    if (dto.extraBills !== undefined) {
      await this.prisma.salaryContractExtraBill.deleteMany({ where: { contractId: id } });
      if (dto.extraBills.length > 0) {
        data.extraBills = {
          create: dto.extraBills.map((b) => ({
            amount: b.amount,
            date: fromDateIso(b.date),
            note: b.note ?? null,
          })),
        };
      }
    }

    const updated = await this.prisma.salaryContract.update({
      where: { id },
      data,
      include: CONTRACT_INCLUDE,
    });
    void userId;
    return this.serialize(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.salaryContract.delete({ where: { id } });
    return { ok: true };
  }

  // --- Внутреннее ---

  private serialize(
    contract: Prisma.SalaryContractGetPayload<{ include: typeof CONTRACT_INCLUDE }>,
  ) {
    return {
      id: contract.id,
      officeId: contract.officeId,
      officeName: contract.office.name,
      categoryId: contract.categoryId,
      categoryCode: contract.category.code,
      categoryName: contract.category.name,
      number: contract.number,
      signedAt: toDateIso(contract.signedAt),
      closedAt: toDateIso(contract.closedAt),
      customerName: contract.customerName,
      managerId: contract.managerId,
      managerName:
        contract.managerName ||
        joinUserName(contract.manager?.lastName, contract.manager?.firstName),
      surveyorId: contract.surveyorId,
      surveyorName:
        contract.surveyorName ||
        joinUserName(contract.surveyor?.lastName, contract.surveyor?.firstName),
      managerHandled: contract.managerHandled,
      surveyorHandled: contract.surveyorHandled,
      baseAmount: toNum(contract.baseAmount),
      managerPercentOverride:
        contract.managerPercentOverride === null ? null : toNum(contract.managerPercentOverride),
      surveyorPercentOverride:
        contract.surveyorPercentOverride === null ? null : toNum(contract.surveyorPercentOverride),
      vsPercentOverride:
        contract.vsPercentOverride === null ? null : toNum(contract.vsPercentOverride),
      brigadierPercentOverride:
        contract.brigadierPercentOverride === null
          ? null
          : toNum(contract.brigadierPercentOverride),
      source: contract.source,
      sourcePackageId: contract.sourcePackageId,
      note: contract.note,
      extraBills: contract.extraBills.map((b) => ({
        id: b.id,
        amount: toNum(b.amount),
        date: toDateIso(b.date),
        note: b.note,
      })),
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    };
  }

  private async ensureRefs(
    officeId?: string | null,
    categoryId?: string | null,
    managerId?: string | null,
    surveyorId?: string | null,
  ) {
    if (officeId) {
      const office = await this.prisma.office.findUnique({ where: { id: officeId } });
      if (!office) throw new NotFoundException(`Офис ${officeId} не найден`);
    }
    if (categoryId) {
      const category = await this.prisma.salaryCategory.findUnique({ where: { id: categoryId } });
      if (!category) throw new NotFoundException(`Направление ${categoryId} не найдено`);
    }
    if (managerId) {
      const user = await this.prisma.user.findUnique({ where: { id: managerId } });
      if (!user) throw new NotFoundException(`Менеджер ${managerId} не найден`);
    }
    if (surveyorId) {
      const user = await this.prisma.user.findUnique({ where: { id: surveyorId } });
      if (!user) throw new NotFoundException(`Замерщик ${surveyorId} не найден`);
    }
  }

  private async ensureUniqueNumber(
    officeId: string | undefined,
    number: string,
    exceptId?: string,
  ) {
    if (!officeId) return;
    const existing = await this.prisma.salaryContract.findFirst({
      where: { officeId, number: number.trim() },
    });
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException(
        `Договор №${number.trim()} уже есть в этом офисе (${existing.id})`,
      );
    }
  }
}
