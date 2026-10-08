import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { toDateIso } from './salary.constants';
import { SalaryCalculationService } from './salary-calculation.service';
import type { CreateSalarySettlementDto } from './dto/calculate-salary.dto';

/**
 * Зафиксированные расчёты з/п за период (аналог «закрытых» месяцев таблицы):
 * при создании снимок расчёта сохраняется целиком — дальнейшие правки договоров
 * на зафиксированный расчёт не влияют.
 */
@Injectable()
export class SalarySettlementsService {
  constructor(
    private prisma: PrismaService,
    private calculation: SalaryCalculationService,
  ) {}

  /** Пересчитать и зафиксировать расчёт за период. */
  async create(dto: CreateSalarySettlementDto, userId?: string) {
    const result = await this.calculation.calculate(dto);
    const settlement = await this.prisma.salarySettlement.create({
      data: {
        dateFrom: new Date(`${dto.dateFrom.slice(0, 10)}T00:00:00.000Z`),
        dateTo: new Date(`${dto.dateTo.slice(0, 10)}T00:00:00.000Z`),
        status: 'DRAFT',
        snapshot: result as object,
        createdById: userId ?? null,
      },
    });
    return { id: settlement.id, createdAt: settlement.createdAt, status: settlement.status };
  }

  /** Список расчётов (без тяжёлых снапшотов). */
  async findAll() {
    const settlements = await this.prisma.salarySettlement.findMany({
      select: {
        id: true,
        dateFrom: true,
        dateTo: true,
        status: true,
        createdAt: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return settlements.map((s) => ({
      id: s.id,
      dateFrom: toDateIso(s.dateFrom),
      dateTo: toDateIso(s.dateTo),
      status: s.status,
      createdAt: s.createdAt,
      createdByName:
        [s.createdBy?.lastName, s.createdBy?.firstName].filter(Boolean).join(' ') || null,
    }));
  }

  async findOne(id: string) {
    const settlement = await this.prisma.salarySettlement.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!settlement) throw new NotFoundException(`Расчёт ${id} не найден`);
    return {
      id: settlement.id,
      dateFrom: toDateIso(settlement.dateFrom),
      dateTo: toDateIso(settlement.dateTo),
      status: settlement.status,
      createdAt: settlement.createdAt,
      createdByName:
        [settlement.createdBy?.lastName, settlement.createdBy?.firstName]
          .filter(Boolean)
          .join(' ') || null,
      snapshot: settlement.snapshot,
    };
  }

  /** Подтвердить расчёт (после проверки — редактировать нельзя). */
  async confirm(id: string) {
    const settlement = await this.prisma.salarySettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException(`Расчёт ${id} не найден`);
    if (settlement.status === 'CONFIRMED') {
      throw new BadRequestException('Расчёт уже подтверждён');
    }
    return this.prisma.salarySettlement.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  /** Удалить можно только черновик. */
  async remove(id: string) {
    const settlement = await this.prisma.salarySettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException(`Расчёт ${id} не найден`);
    if (settlement.status === 'CONFIRMED') {
      throw new BadRequestException('Подтверждённый расчёт удалить нельзя');
    }
    await this.prisma.salarySettlement.delete({ where: { id } });
    return { ok: true };
  }
}
