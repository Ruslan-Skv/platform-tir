import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import { ContractStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CreateContractAdvanceDto } from './dto/create-contract-advance.dto';
import { CreateContractAmendmentDto } from './dto/create-contract-amendment.dto';

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  create(createContractDto: CreateContractDto) {
    return this.prisma.contract.create({
      data: {
        contractNumber: createContractDto.contractNumber,
        contractDate: new Date(createContractDto.contractDate),
        status: (createContractDto.status as ContractStatus) ?? 'DRAFT',
        directionId: createContractDto.directionId ?? null,
        managerId: createContractDto.managerId ?? null,
        deliveryId: createContractDto.deliveryId ?? null,
        surveyorId: createContractDto.surveyorId ?? null,
        validityStart: createContractDto.validityStart
          ? new Date(createContractDto.validityStart)
          : null,
        validityEnd: createContractDto.validityEnd ? new Date(createContractDto.validityEnd) : null,
        contractDurationDays: createContractDto.contractDurationDays ?? null,
        contractDurationType: createContractDto.contractDurationType ?? null,
        installationDate: createContractDto.installationDate
          ? new Date(createContractDto.installationDate)
          : null,
        deliveryDate: createContractDto.deliveryDate
          ? new Date(createContractDto.deliveryDate)
          : null,
        customerName: createContractDto.customerName,
        customerAddress: createContractDto.customerAddress ?? null,
        customerPhone: createContractDto.customerPhone ?? null,
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

  async update(id: string, updateContractDto: UpdateContractDto) {
    await this.findOne(id);
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

    return this.prisma.contract.update({
      where: { id },
      data,
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
    throw new BadRequestException('Удаление оформленных доп. соглашений запрещено');
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
