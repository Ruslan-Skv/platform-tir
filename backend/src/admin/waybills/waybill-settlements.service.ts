import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, WaybillTaskStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWaybillSettlementDto } from './dto/create-waybill-settlement.dto';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

const SETTLEMENT_INCLUDE = {
  driver: { select: USER_SELECT },
  createdBy: { select: USER_SELECT },
} as const;

/** Плательщик «Заказчик» — деньги взяты водителем на руки (наличные у водителя). */
const CUSTOMER_PAYER = 'Заказчик';

@Injectable()
export class WaybillSettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateOnly(dateStr: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!m) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  private emptyToNull(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  /**
   * Итоговый расчёт з/п водителя за период: создаёт запись в истории расчётов и закрывает
   * все выполненные задания водителя за период (статус CLOSED — дальше не редактируются).
   */
  async createSettlement(dto: CreateWaybillSettlementDto, createdById: string) {
    const dateFrom = this.parseDateOnly(dto.dateFrom);
    const dateTo = this.parseDateOnly(dto.dateTo);
    if (dateTo < dateFrom) {
      throw new BadRequestException('Дата «по» раньше даты «с»');
    }
    const driverUserId = dto.driverUserId.trim();
    if (!driverUserId) {
      throw new BadRequestException('Укажите водителя, по которому делается расчёт');
    }

    const taskFilter: Prisma.WaybillTaskWhereInput = {
      date: { gte: dateFrom, lte: dateTo },
      driverUserId,
      status: WaybillTaskStatus.DONE,
      deletedAt: null,
    };

    const tasks = await this.prisma.waybillTask.findMany({
      where: taskFilter,
      select: {
        deliveryCost: true,
        deliveryPayer: true,
        moversCost: true,
        moversPayer: true,
      },
    });
    if (tasks.length === 0) {
      throw new BadRequestException('За выбранный период нет выполненных заданий этого водителя');
    }

    let deliveryTotal = new Prisma.Decimal(0);
    let moversTotal = new Prisma.Decimal(0);
    let collectedFromCustomers = new Prisma.Decimal(0);
    for (const task of tasks) {
      if (task.deliveryCost) {
        deliveryTotal = deliveryTotal.add(task.deliveryCost);
        if ((task.deliveryPayer ?? '').trim() === CUSTOMER_PAYER) {
          collectedFromCustomers = collectedFromCustomers.add(task.deliveryCost);
        }
      }
      if (task.moversCost) {
        moversTotal = moversTotal.add(task.moversCost);
        if ((task.moversPayer ?? '').trim() === CUSTOMER_PAYER) {
          collectedFromCustomers = collectedFromCustomers.add(task.moversCost);
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.waybillSettlement.create({
        data: {
          dateFrom,
          dateTo,
          driverUserId,
          payoutAmount: new Prisma.Decimal(dto.payoutAmount ?? 0),
          depositAmount: new Prisma.Decimal(dto.depositAmount ?? 0),
          deliveryTotal,
          moversTotal,
          collectedFromCustomers,
          tasksCount: tasks.length,
          note: this.emptyToNull(dto.note),
          createdById,
        },
        include: SETTLEMENT_INCLUDE,
      });
      await tx.waybillTask.updateMany({
        where: taskFilter,
        data: {
          status: WaybillTaskStatus.CLOSED,
          settlementId: settlement.id,
        },
      });
      return settlement;
    });
  }

  /** История расчётов з/п водителей — свежие сверху. */
  listSettlements(limit = 100) {
    return this.prisma.waybillSettlement.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
      include: SETTLEMENT_INCLUDE,
    });
  }
}
