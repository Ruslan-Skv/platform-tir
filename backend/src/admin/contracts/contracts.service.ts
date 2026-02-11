import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import { ContractStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CreateContractAdvanceDto } from './dto/create-contract-advance.dto';
import { CreateContractAmendmentDto } from './dto/create-contract-amendment.dto';
import { UpdateContractAmendmentDto } from './dto/update-contract-amendment.dto';

const CONTRACT_SNAPSHOT_FIELDS = {
  contractNumber: true,
  contractDate: true,
  status: true,
  directionId: true,
  managerId: true,
  deliveryId: true,
  surveyorId: true,
  officeId: true,
  complexObjectId: true,
  validityStart: true,
  validityEnd: true,
  contractDurationDays: true,
  contractDurationType: true,
  installationDate: true,
  installationDurationDays: true,
  deliveryDate: true,
  customerName: true,
  customerAddress: true,
  customerPhone: true,
  customerId: true,
  discount: true,
  totalAmount: true,
  advanceAmount: true,
  notes: true,
  source: true,
  preferredExecutorId: true,
  measurementId: true,
  actWorkStartDate: true,
  actWorkEndDate: true,
  goodsTransferDate: true,
  installers: true,
  actWorkStartImages: true,
  actWorkEndImages: true,
} as const;

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  async create(createContractDto: CreateContractDto) {
    // Если есть комплексный объект и нет customerName, берём из объекта
    let customerName = createContractDto.customerName ?? null;
    let customerAddress = createContractDto.customerAddress ?? null;
    let customerPhone = createContractDto.customerPhone ?? null;
    let managerId = createContractDto.managerId ?? null;
    let officeId = createContractDto.officeId ?? null;

    if (createContractDto.complexObjectId) {
      const complexObject = await this.prisma.complexObject.findUnique({
        where: { id: createContractDto.complexObjectId },
        select: {
          customerName: true,
          address: true,
          customerPhones: true,
          managerId: true,
          officeId: true,
        },
      });
      if (complexObject) {
        if (!customerName) customerName = complexObject.customerName;
        if (!customerAddress) customerAddress = complexObject.address;
        if (!customerPhone && complexObject.customerPhones?.length) {
          customerPhone = complexObject.customerPhones[0];
        }
        if (!managerId) managerId = complexObject.managerId;
        if (!officeId) officeId = complexObject.officeId;
      }
    }

    return this.prisma.contract.create({
      data: {
        contractNumber: createContractDto.contractNumber,
        contractDate: new Date(createContractDto.contractDate),
        status: (createContractDto.status as ContractStatus) ?? 'DRAFT',
        directionId: createContractDto.directionId ?? null,
        managerId,
        deliveryId: createContractDto.deliveryId ?? null,
        surveyorId: createContractDto.surveyorId ?? null,
        officeId,
        complexObjectId: createContractDto.complexObjectId ?? null,
        validityStart: createContractDto.validityStart
          ? new Date(createContractDto.validityStart)
          : null,
        validityEnd: createContractDto.validityEnd ? new Date(createContractDto.validityEnd) : null,
        contractDurationDays: createContractDto.contractDurationDays ?? null,
        contractDurationType: createContractDto.contractDurationType ?? null,
        installationDate: createContractDto.installationDate
          ? new Date(createContractDto.installationDate)
          : null,
        installationDurationDays: createContractDto.installationDurationDays ?? null,
        deliveryDate: createContractDto.deliveryDate
          ? new Date(createContractDto.deliveryDate)
          : null,
        customerName,
        customerAddress,
        customerPhone,
        customerId: createContractDto.customerId ?? null,
        discount: new Prisma.Decimal(createContractDto.discount ?? 0),
        totalAmount: new Prisma.Decimal(createContractDto.totalAmount),
        advanceAmount: new Prisma.Decimal(createContractDto.advanceAmount ?? 0),
        notes: createContractDto.notes ?? null,
        source: createContractDto.source ?? null,
        preferredExecutorId: createContractDto.preferredExecutorId ?? null,
        measurementId: createContractDto.measurementId ?? null,
        actWorkStartDate: createContractDto.actWorkStartDate
          ? new Date(createContractDto.actWorkStartDate)
          : null,
        actWorkEndDate: createContractDto.actWorkEndDate
          ? new Date(createContractDto.actWorkEndDate)
          : null,
        goodsTransferDate: createContractDto.goodsTransferDate
          ? new Date(createContractDto.goodsTransferDate)
          : null,
        installers: createContractDto.installers ?? [],
        actWorkStartImages: createContractDto.actWorkStartImages ?? [],
        actWorkEndImages: createContractDto.actWorkEndImages ?? [],
      },
      include: this.contractInclude(),
    });
  }

  private contractInclude() {
    return {
      manager: { select: { id: true, firstName: true, lastName: true } },
      surveyor: { select: { id: true, firstName: true, lastName: true } },
      direction: { select: { id: true, name: true, slug: true } },
      office: { select: { id: true, name: true, address: true } },
      complexObject: { select: { id: true, name: true, customerName: true, address: true } },
      measurement: { select: { id: true, customerName: true, receptionDate: true } },
      advances: true,
      amendments: {
        orderBy: { number: { sort: 'asc' as const, nulls: 'first' as const } },
      },
      payments: { select: { id: true, amount: true } },
    };
  }

  async findAll(params?: {
    status?: string;
    managerId?: string;
    directionId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      managerId,
      directionId,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = params || {};

    const skip = (page - 1) * limit;
    const where: Prisma.ContractWhereInput = {};

    if (status) where.status = status as Prisma.EnumContractStatusFilter;
    if (managerId) where.managerId = managerId;
    if (directionId) where.directionId = directionId;

    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
        { customerAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      where.contractDate = {};
      if (dateFrom) where.contractDate.gte = new Date(dateFrom);
      if (dateTo) where.contractDate.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: this.contractInclude(),
        skip,
        take: limit,
        orderBy: { contractDate: 'desc' },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCustomersFromContracts(search?: string) {
    const where: Prisma.ContractWhereInput = {
      OR: [
        { customerName: { not: null, notIn: [''] } },
        { customerPhone: { not: null, notIn: [''] } },
      ],
    };
    if (search?.trim()) {
      const term = search.trim();
      where.AND = [
        {
          OR: [
            { customerName: { contains: term, mode: 'insensitive' } },
            { customerPhone: { contains: term } },
            { customerAddress: { contains: term, mode: 'insensitive' } },
          ],
        },
      ];
    }
    const contracts = await this.prisma.contract.findMany({
      where,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        totalAmount: true,
        contractDate: true,
        contractNumber: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { contractDate: 'desc' },
    });

    const key = (name: string | null, phone: string | null) =>
      `${(name ?? '').trim()}|${(phone ?? '').trim()}`;

    const map = new Map<
      string,
      {
        customerName: string | null;
        customerPhone: string | null;
        customerAddress: string | null;
        contractCount: number;
        totalAmount: number;
        lastContractDate: Date | null;
        lastContractId: string | null;
        lastContractNumber: string | null;
        manager: { id: string; firstName: string | null; lastName: string | null } | null;
      }
    >();

    for (const c of contracts) {
      const k = key(c.customerName, c.customerPhone);
      const existing = map.get(k);
      const totalAmount = Number(c.totalAmount ?? 0);
      if (!existing) {
        map.set(k, {
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          customerAddress: c.customerAddress,
          contractCount: 1,
          totalAmount,
          lastContractDate: c.contractDate,
          lastContractId: c.id,
          lastContractNumber: c.contractNumber,
          manager: c.manager,
        });
      } else {
        existing.contractCount += 1;
        existing.totalAmount += totalAmount;
      }
    }

    const customers = Array.from(map.values()).map((v) => ({
      customerName: v.customerName ?? '—',
      customerPhone: v.customerPhone ?? '—',
      customerAddress: v.customerAddress ?? null,
      contractCount: v.contractCount,
      totalAmount: v.totalAmount,
      lastContractDate: v.lastContractDate?.toISOString().slice(0, 10) ?? null,
      lastContractId: v.lastContractId,
      lastContractNumber: v.lastContractNumber,
      manager: v.manager
        ? {
            id: v.manager.id,
            firstName: v.manager.firstName,
            lastName: v.manager.lastName,
          }
        : null,
    }));

    return { customers };
  }

  async findOne(id: string) {
    const c = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        surveyor: { select: { id: true, firstName: true, lastName: true } },
        direction: { select: { id: true, name: true, slug: true } },
        measurement: true,
        advances: true,
        amendments: {
          orderBy: { number: { sort: 'asc' as const, nulls: 'first' as const } },
        },
        payments: {
          include: { manager: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!c) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }
    return c;
  }

  async update(id: string, updateContractDto: UpdateContractDto, changedById?: string) {
    const current = await this.prisma.contract.findUnique({
      where: { id },
      select: CONTRACT_SNAPSHOT_FIELDS,
    });
    if (!current) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }
    const data: Prisma.ContractUncheckedUpdateInput = {};
    if (updateContractDto.contractNumber) data.contractNumber = updateContractDto.contractNumber;
    if (updateContractDto.contractDate)
      data.contractDate = new Date(updateContractDto.contractDate);
    if (updateContractDto.status) data.status = updateContractDto.status as ContractStatus;
    if (updateContractDto.directionId !== undefined)
      data.directionId = updateContractDto.directionId ?? null;
    if (updateContractDto.managerId !== undefined)
      data.managerId = updateContractDto.managerId ?? null;
    if (updateContractDto.deliveryId !== undefined)
      data.deliveryId = updateContractDto.deliveryId ?? null;
    if (updateContractDto.surveyorId !== undefined)
      data.surveyorId = updateContractDto.surveyorId ?? null;
    if (updateContractDto.officeId !== undefined)
      data.officeId = updateContractDto.officeId ?? null;
    if (updateContractDto.complexObjectId !== undefined)
      data.complexObjectId = updateContractDto.complexObjectId ?? null;
    if (updateContractDto.validityStart !== undefined)
      data.validityStart = updateContractDto.validityStart
        ? new Date(updateContractDto.validityStart)
        : null;
    if (updateContractDto.validityEnd !== undefined)
      data.validityEnd = updateContractDto.validityEnd
        ? new Date(updateContractDto.validityEnd)
        : null;
    if (updateContractDto.contractDurationDays !== undefined)
      data.contractDurationDays = updateContractDto.contractDurationDays ?? null;
    if (updateContractDto.contractDurationType !== undefined)
      data.contractDurationType = updateContractDto.contractDurationType ?? null;
    if (updateContractDto.installationDate !== undefined)
      data.installationDate = updateContractDto.installationDate
        ? new Date(updateContractDto.installationDate)
        : null;
    if (updateContractDto.installationDurationDays !== undefined)
      data.installationDurationDays = updateContractDto.installationDurationDays ?? null;
    if (updateContractDto.deliveryDate !== undefined)
      data.deliveryDate = updateContractDto.deliveryDate
        ? new Date(updateContractDto.deliveryDate)
        : null;
    if (updateContractDto.customerName) data.customerName = updateContractDto.customerName;
    if (updateContractDto.customerAddress !== undefined)
      data.customerAddress = updateContractDto.customerAddress ?? null;
    if (updateContractDto.customerPhone !== undefined)
      data.customerPhone = updateContractDto.customerPhone ?? null;
    if (updateContractDto.customerId !== undefined)
      data.customerId = updateContractDto.customerId ?? null;
    if (updateContractDto.discount !== undefined)
      data.discount = new Prisma.Decimal(updateContractDto.discount);
    if (updateContractDto.totalAmount !== undefined)
      data.totalAmount = new Prisma.Decimal(updateContractDto.totalAmount);
    if (updateContractDto.advanceAmount !== undefined)
      data.advanceAmount = new Prisma.Decimal(updateContractDto.advanceAmount);
    if (updateContractDto.notes !== undefined) data.notes = updateContractDto.notes ?? null;
    if (updateContractDto.source !== undefined) data.source = updateContractDto.source ?? null;
    if (updateContractDto.preferredExecutorId !== undefined)
      data.preferredExecutorId = updateContractDto.preferredExecutorId ?? null;
    if (updateContractDto.measurementId !== undefined)
      data.measurementId = updateContractDto.measurementId ?? null;
    if (updateContractDto.actWorkStartDate !== undefined)
      data.actWorkStartDate = updateContractDto.actWorkStartDate
        ? new Date(updateContractDto.actWorkStartDate)
        : null;
    if (updateContractDto.actWorkEndDate !== undefined)
      data.actWorkEndDate = updateContractDto.actWorkEndDate
        ? new Date(updateContractDto.actWorkEndDate)
        : null;
    if (updateContractDto.goodsTransferDate !== undefined)
      data.goodsTransferDate = updateContractDto.goodsTransferDate
        ? new Date(updateContractDto.goodsTransferDate)
        : null;
    if (updateContractDto.installers !== undefined) data.installers = updateContractDto.installers;
    if (updateContractDto.actWorkStartImages !== undefined)
      data.actWorkStartImages = updateContractDto.actWorkStartImages;
    if (updateContractDto.actWorkEndImages !== undefined)
      data.actWorkEndImages = updateContractDto.actWorkEndImages;

    if (changedById && Object.keys(data).length > 0) {
      const snapshot = this.serializeContractSnapshot(current);
      const changedFields = Object.keys(data) as string[];
      await this.prisma.contractHistory.create({
        data: {
          contractId: id,
          snapshot: snapshot as object,
          changedFields,
          action: 'UPDATE',
          changedById,
        },
      });
    }

    return this.prisma.contract.update({
      where: { id },
      data,
      include: this.contractInclude(),
    });
  }

  private serializeContractSnapshot(c: {
    contractDate?: Date | null;
    validityStart?: Date | null;
    validityEnd?: Date | null;
    installationDate?: Date | null;
    deliveryDate?: Date | null;
    actWorkStartDate?: Date | null;
    actWorkEndDate?: Date | null;
    goodsTransferDate?: Date | null;
    discount?: unknown;
    totalAmount?: unknown;
    advanceAmount?: unknown;
    [key: string]: unknown;
  }): Record<string, unknown> {
    const obj = { ...c } as Record<string, unknown>;
    const dateFields = [
      'contractDate',
      'validityStart',
      'validityEnd',
      'installationDate',
      'deliveryDate',
      'actWorkStartDate',
      'actWorkEndDate',
      'goodsTransferDate',
    ];
    for (const f of dateFields) {
      const v = obj[f];
      if (v instanceof Date) obj[f] = v.toISOString().slice(0, 10);
    }
    for (const f of ['discount', 'totalAmount', 'advanceAmount']) {
      const v = obj[f];
      if (v != null && typeof v === 'object' && 'toNumber' in v) {
        obj[f] = Number(v);
      }
    }
    return obj;
  }

  async getHistory(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }
    const history = await this.prisma.contractHistory.findMany({
      where: { contractId },
      include: {
        changedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { changedAt: 'desc' },
    });
    return history.map((h) => ({
      id: h.id,
      action: h.action,
      changedAt: h.changedAt,
      changedBy: h.changedBy,
      changedFields: h.changedFields,
      snapshot: h.snapshot,
    }));
  }

  async rollback(contractId: string, historyId: string, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }
    const historyEntry = await this.prisma.contractHistory.findFirst({
      where: { id: historyId, contractId },
    });
    if (!historyEntry) {
      throw new NotFoundException(
        `History entry ${historyId} not found for contract ${contractId}`,
      );
    }
    const snapshot = historyEntry.snapshot as Record<string, unknown>;
    const updateData: Prisma.ContractUncheckedUpdateInput = {
      contractNumber: snapshot.contractNumber as string,
      contractDate: new Date(snapshot.contractDate as string),
      status: snapshot.status as ContractStatus,
      directionId: (snapshot.directionId as string) ?? null,
      managerId: (snapshot.managerId as string) ?? null,
      deliveryId: (snapshot.deliveryId as string) ?? null,
      surveyorId: (snapshot.surveyorId as string) ?? null,
      validityStart: snapshot.validityStart ? new Date(snapshot.validityStart as string) : null,
      validityEnd: snapshot.validityEnd ? new Date(snapshot.validityEnd as string) : null,
      contractDurationDays: (snapshot.contractDurationDays as number) ?? null,
      contractDurationType: (snapshot.contractDurationType as string) ?? null,
      installationDate: snapshot.installationDate
        ? new Date(snapshot.installationDate as string)
        : null,
      installationDurationDays: (snapshot.installationDurationDays as number) ?? null,
      deliveryDate: snapshot.deliveryDate ? new Date(snapshot.deliveryDate as string) : null,
      customerName: snapshot.customerName as string,
      customerAddress: (snapshot.customerAddress as string) ?? null,
      customerPhone: (snapshot.customerPhone as string) ?? null,
      customerId: (snapshot.customerId as string) ?? null,
      discount: new Prisma.Decimal(Number(snapshot.discount ?? 0)),
      totalAmount: new Prisma.Decimal(Number(snapshot.totalAmount ?? 0)),
      advanceAmount: new Prisma.Decimal(Number(snapshot.advanceAmount ?? 0)),
      notes: (snapshot.notes as string) ?? null,
      source: (snapshot.source as string) ?? null,
      preferredExecutorId: (snapshot.preferredExecutorId as string) ?? null,
      measurementId: (snapshot.measurementId as string) ?? null,
      actWorkStartDate: snapshot.actWorkStartDate
        ? new Date(snapshot.actWorkStartDate as string)
        : null,
      actWorkEndDate: snapshot.actWorkEndDate ? new Date(snapshot.actWorkEndDate as string) : null,
      goodsTransferDate: snapshot.goodsTransferDate
        ? new Date(snapshot.goodsTransferDate as string)
        : null,
      installers: (snapshot.installers as string[]) ?? [],
      actWorkStartImages: (snapshot.actWorkStartImages as string[]) ?? [],
      actWorkEndImages: (snapshot.actWorkEndImages as string[]) ?? [],
    };
    await this.prisma.contractHistory.create({
      data: {
        contractId,
        snapshot: historyEntry.snapshot as object,
        changedFields: [],
        action: 'ROLLBACK',
        changedById: userId,
      },
    });
    return this.prisma.contract.update({
      where: { id: contractId },
      data: updateData,
      include: this.contractInclude(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contract.delete({ where: { id } });
  }

  async addAdvance(contractId: string, dto: CreateContractAdvanceDto) {
    const contract = await this.findOne(contractId);
    const advance = await this.prisma.contractAdvance.create({
      data: {
        contractId,
        amount: new Prisma.Decimal(dto.amount),
        paidAt: new Date(dto.paidAt),
        notes: dto.notes ?? null,
      },
    });
    const totalAdvance = contract.advances.reduce((sum, a) => sum + Number(a.amount), 0);
    await this.prisma.contract.update({
      where: { id: contractId },
      data: { advanceAmount: new Prisma.Decimal(totalAdvance + dto.amount) },
    });
    return advance;
  }

  async addAmendment(contractId: string, dto: CreateContractAmendmentDto) {
    const contract = await this.findOne(contractId);
    const count = contract.amendments.length;
    if (count >= 5) {
      throw new BadRequestException('Maximum 5 amendments per contract');
    }
    const amendmentsWithNumber = contract.amendments as Array<{ number?: number | null }>;
    const maxNumber =
      amendmentsWithNumber.length > 0
        ? Math.max(...amendmentsWithNumber.map((a) => a.number ?? 0), 0)
        : 0;
    return this.prisma.contractAmendment.create({
      data: {
        contractId,
        number: maxNumber + 1,
        amount: new Prisma.Decimal(dto.amount),
        discount: new Prisma.Decimal(dto.discount ?? 0),
        date: new Date(dto.date),
        extendsValidityTo: dto.extendsValidityTo ? new Date(dto.extendsValidityTo) : null,
        durationAdditionDays: dto.durationAdditionDays ?? null,
        durationAdditionType: dto.durationAdditionType ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async removeAdvance(contractId: string, advanceId: string) {
    const advance = await this.prisma.contractAdvance.findFirst({
      where: { id: advanceId, contractId },
    });
    if (!advance) throw new NotFoundException('Advance not found');
    const contract = await this.findOne(contractId);
    await this.prisma.contractAdvance.delete({ where: { id: advanceId } });
    const remaining = contract.advances
      .filter((a) => a.id !== advanceId)
      .reduce((sum, a) => sum + Number(a.amount), 0);
    await this.prisma.contract.update({
      where: { id: contractId },
      data: { advanceAmount: new Prisma.Decimal(remaining) },
    });
    return { success: true };
  }

  async removeAmendment(_contractId: string, amendmentId: string) {
    const amendment = await this.prisma.contractAmendment.findFirst({
      where: { id: amendmentId, contractId: _contractId },
    });
    if (!amendment) throw new NotFoundException('Amendment not found');
    await this.prisma.contractAmendment.delete({
      where: { id: amendmentId },
    });
    return { success: true };
  }

  async updateAmendment(contractId: string, amendmentId: string, dto: UpdateContractAmendmentDto) {
    const amendment = await this.prisma.contractAmendment.findFirst({
      where: { id: amendmentId, contractId },
    });
    if (!amendment) throw new NotFoundException('Amendment not found');
    const data: Parameters<typeof this.prisma.contractAmendment.update>[0]['data'] = {};
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.discount !== undefined) data.discount = new Prisma.Decimal(dto.discount);
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.durationAdditionDays !== undefined)
      data.durationAdditionDays = dto.durationAdditionDays > 0 ? dto.durationAdditionDays : null;
    if (dto.durationAdditionType !== undefined)
      data.durationAdditionType = dto.durationAdditionType ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;
    return this.prisma.contractAmendment.update({
      where: { id: amendmentId },
      data,
    });
  }

  async uploadActImage(
    contractId: string,
    file: Express.Multer.File,
    type: 'start' | 'end',
  ): Promise<{ imageUrl: string }> {
    if (!file?.path) throw new BadRequestException('Файл не загружен');
    await this.findOne(contractId);
    const filename = path.basename(file.path);
    const imageUrl = `/uploads/contracts/acts/${filename}`;
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    const startImages =
      type === 'start'
        ? [...(contract?.actWorkStartImages ?? []), imageUrl]
        : (contract?.actWorkStartImages ?? []);
    const endImages =
      type === 'end'
        ? [...(contract?.actWorkEndImages ?? []), imageUrl]
        : (contract?.actWorkEndImages ?? []);
    await this.prisma.contract.update({
      where: { id: contractId },
      data: { actWorkStartImages: startImages, actWorkEndImages: endImages },
    });
    return { imageUrl };
  }
}
