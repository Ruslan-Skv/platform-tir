import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateOfficeOtherExpenseDto } from './dto/create-other-expense.dto';
import { CreateOfficeIncassationDto } from './dto/create-incassation.dto';

@Injectable()
export class OfficeCashService {
  constructor(private readonly prisma: PrismaService) {}

  async getCashSummary(officeId: string, dateFrom?: string, dateTo?: string) {
    const office = await this.prisma.office.findUnique({
      where: { id: officeId },
      select: { id: true, name: true },
    });
    if (!office) throw new NotFoundException('Офис не найден');

    // Офис может быть указан у договора или у привязанного объекта (ComplexObject)
    const officeWhere: Prisma.ContractPaymentWhereInput = {
      OR: [
        { contract: { officeId } },
        {
          contract: {
            complexObjectId: { not: null },
            complexObject: { officeId },
          },
        },
      ],
    };
    if (dateFrom || dateTo) {
      officeWhere.paymentDate = {};
      if (dateFrom) officeWhere.paymentDate.gte = new Date(dateFrom);
      if (dateTo) officeWhere.paymentDate.lte = new Date(dateTo);
    }

    const expenseWhere: Prisma.OfficeOtherExpenseWhereInput = { officeId };
    if (dateFrom || dateTo) {
      expenseWhere.expenseDate = {};
      if (dateFrom) expenseWhere.expenseDate.gte = new Date(dateFrom);
      if (dateTo) expenseWhere.expenseDate.lte = new Date(dateTo);
    }
    const incassationWhere: Prisma.OfficeIncassationWhereInput = { officeId };
    if (dateFrom || dateTo) {
      incassationWhere.incassationDate = {};
      if (dateFrom) incassationWhere.incassationDate.gte = new Date(dateFrom);
      if (dateTo) incassationWhere.incassationDate.lte = new Date(dateTo);
    }

    const [
      cashResult,
      terminalResult,
      qrResult,
      invoiceResult,
      otherExpensesResult,
      incassationsResult,
    ] = await Promise.all([
      this.prisma.contractPayment.aggregate({
        where: { ...officeWhere, paymentForm: 'CASH' },
        _sum: { amount: true },
      }),
      this.prisma.contractPayment.aggregate({
        where: { ...officeWhere, paymentForm: 'TERMINAL' },
        _sum: { amount: true },
      }),
      this.prisma.contractPayment.aggregate({
        where: { ...officeWhere, paymentForm: 'QR' },
        _sum: { amount: true },
      }),
      this.prisma.contractPayment.aggregate({
        where: { ...officeWhere, paymentForm: 'INVOICE' },
        _sum: { amount: true },
      }),
      this.prisma.officeOtherExpense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
      }),
      this.prisma.officeIncassation.aggregate({
        where: incassationWhere,
        _sum: { amount: true },
      }),
    ]);

    let receivedByLcTransfer = 0;
    try {
      const lcTransferResult = await this.prisma.contractPayment.aggregate({
        where: { ...officeWhere, paymentForm: 'LC_TRANSFER' as const },
        _sum: { amount: true },
      });
      receivedByLcTransfer = Number(lcTransferResult._sum.amount ?? 0);
    } catch {
      // LC_TRANSFER может отсутствовать в enum БД до применения миграции
    }

    const receivedFromClients = Number(cashResult._sum.amount ?? 0);
    const receivedByTerminal = Number(terminalResult._sum.amount ?? 0);
    const receivedByQr = Number(qrResult._sum.amount ?? 0);
    const receivedByInvoice = Number(invoiceResult._sum.amount ?? 0);
    const otherExpensesTotal = Number(otherExpensesResult._sum.amount ?? 0);
    const incassationsTotal = Number(incassationsResult._sum.amount ?? 0);
    const balanceInCash = receivedFromClients - otherExpensesTotal - incassationsTotal;

    return {
      officeId,
      officeName: office.name,
      receivedFromClients,
      receivedByTerminal,
      receivedByQr,
      receivedByInvoice,
      receivedByLcTransfer,
      otherExpensesTotal,
      incassationsTotal,
      balanceInCash,
      balanceToIncassate: receivedFromClients - otherExpensesTotal,
    };
  }

  async getOtherExpenses(officeId: string, dateFrom?: string, dateTo?: string) {
    const where: Prisma.OfficeOtherExpenseWhereInput = { officeId };
    if (dateFrom || dateTo) {
      where.expenseDate = {};
      if (dateFrom) where.expenseDate.gte = new Date(dateFrom);
      if (dateTo) where.expenseDate.lte = new Date(dateTo);
    }
    return this.prisma.officeOtherExpense.findMany({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });
  }

  async createOtherExpense(dto: CreateOfficeOtherExpenseDto, createdById?: string) {
    return this.prisma.officeOtherExpense.create({
      data: {
        officeId: dto.officeId,
        amount: new Prisma.Decimal(dto.amount),
        expenseDate: new Date(dto.expenseDate),
        description: dto.description ?? null,
        createdById: createdById ?? null,
      },
      include: {
        office: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getIncassations(officeId: string, dateFrom?: string, dateTo?: string) {
    const where: Prisma.OfficeIncassationWhereInput = { officeId };
    if (dateFrom || dateTo) {
      where.incassationDate = {};
      if (dateFrom) where.incassationDate.gte = new Date(dateFrom);
      if (dateTo) where.incassationDate.lte = new Date(dateTo);
    }
    return this.prisma.officeIncassation.findMany({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { incassationDate: 'desc' },
    });
  }

  async createIncassation(dto: CreateOfficeIncassationDto, createdById?: string) {
    const incassatorValue =
      typeof dto.incassator === 'string' && dto.incassator.trim() ? dto.incassator.trim() : null;
    return this.prisma.officeIncassation.create({
      data: {
        officeId: dto.officeId,
        amount: new Prisma.Decimal(dto.amount),
        incassationDate: new Date(dto.incassationDate),
        incassator: incassatorValue,
        notes: dto.notes ?? null,
        createdById: createdById ?? null,
      },
      include: {
        office: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
