import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentForm, PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateContractPaymentDto } from './dto/create-contract-payment.dto';

@Injectable()
export class ContractPaymentsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateContractPaymentDto) {
    return this.prisma.contractPayment.create({
      data: {
        contractId: dto.contractId,
        paymentDate: new Date(dto.paymentDate),
        amount: new Prisma.Decimal(dto.amount),
        paymentForm: dto.paymentForm as PaymentForm,
        paymentType: dto.paymentType as PaymentType,
        managerId: dto.managerId ?? null,
        notes: dto.notes ?? null,
      },
      include: {
        contract: { select: { id: true, contractNumber: true, customerName: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(params?: {
    contractId?: string;
    officeId?: string;
    managerId?: string;
    paymentForm?: string;
    paymentType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      contractId,
      officeId,
      managerId,
      paymentForm,
      paymentType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = params || {};

    const skip = (page - 1) * limit;
    const where: Prisma.ContractPaymentWhereInput = {};

    if (contractId) where.contractId = contractId;
    // Офис может быть указан у договора или у привязанного объекта (ComplexObject)
    if (officeId) {
      where.OR = [
        { contract: { officeId } },
        {
          contract: {
            complexObjectId: { not: null },
            complexObject: { officeId },
          },
        },
      ];
    }
    if (managerId) where.managerId = managerId;
    if (paymentForm) where.paymentForm = paymentForm as Prisma.EnumPaymentFormFilter;
    if (paymentType) where.paymentType = paymentType as Prisma.EnumPaymentTypeFilter;

    if (dateFrom || dateTo) {
      where.paymentDate = {};
      if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
      if (dateTo) where.paymentDate.lte = new Date(dateTo);
    }

    const [rawData, total] = await Promise.all([
      this.prisma.contractPayment.findMany({
        where,
        include: {
          contract: {
            select: {
              id: true,
              contractNumber: true,
              customerName: true,
              totalAmount: true,
              officeId: true,
              office: { select: { id: true, name: true } },
              manager: { select: { id: true, firstName: true, lastName: true } },
              complexObject: {
                select: {
                  officeId: true,
                  office: { select: { id: true, name: true } },
                  manager: { select: { id: true, firstName: true, lastName: true } },
                },
              },
            },
          },
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
      }),
      this.prisma.contractPayment.count({ where }),
    ]);

    const contractIds = [...new Set(rawData.map((p) => p.contractId))];
    const totals =
      contractIds.length > 0
        ? await this.prisma.contractPayment.groupBy({
            by: ['contractId'],
            where: { contractId: { in: contractIds } },
            _sum: { amount: true },
          })
        : [];
    const totalByContract = Object.fromEntries(
      totals.map((t) => [t.contractId, Number(t._sum.amount ?? 0)]),
    );

    const data = rawData.map((p) => ({
      ...p,
      contractTotalPaid: totalByContract[p.contractId] ?? 0,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const p = await this.prisma.contractPayment.findUnique({
      where: { id },
      include: {
        contract: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!p) {
      throw new NotFoundException(`Contract payment with ID ${id} not found`);
    }
    return p;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contractPayment.delete({ where: { id } });
  }
}
