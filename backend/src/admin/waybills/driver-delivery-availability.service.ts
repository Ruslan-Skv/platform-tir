import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  DriverDeliveryAbsenceBlockDto,
  DriverDeliveryCycleDayDto,
  UpsertDriverDeliveryAvailabilityDto,
} from './dto/upsert-driver-delivery-availability.dto';

export type DriverDeliveryCycleDay = {
  kind: 'ON' | 'OFF';
  availableFrom?: string | null;
  availableTo?: string | null;
};

export type DriverDeliveryAbsenceBlock = {
  kind: 'VACATION' | 'SICK';
  dateFrom: string;
  dateTo: string;
  note?: string | null;
};

export type DriverAvailabilityStatus = {
  userId: string;
  hasScheme: boolean;
  isActive: boolean;
  available: boolean;
  kind: 'ON' | 'OFF' | 'VACATION' | 'SICK' | 'NONE';
  availableFrom: string | null;
  availableTo: string | null;
  label: string;
  outsideWindow: boolean;
};

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

/** Роли, которых можно назначать водителем в задании и для которых настраивается схема. */
const ASSIGNABLE_DRIVER_ROLES = ['DRIVER', 'ADMIN', 'MANAGER'] as const;

type ResolvedDay = Omit<DriverAvailabilityStatus, 'userId' | 'hasScheme' | 'isActive'>;

@Injectable()
export class DriverDeliveryAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private assignableDriversWhere() {
    return {
      OR: [
        { role: { in: [...ASSIGNABLE_DRIVER_ROLES] } },
        { waybillTasksAsDriver: { some: {} } },
        { driverDeliveryAvailability: { isNot: null } },
      ],
    };
  }

  private parseDateOnly(dateStr: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!m) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  private toIsoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private daysBetweenUtc(from: Date, to: Date): number {
    const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    return Math.floor((b - a) / 86_400_000);
  }

  private normalizeCycleDays(days: DriverDeliveryCycleDayDto[]): DriverDeliveryCycleDay[] {
    return days.map((day) => {
      if (day.kind === 'OFF') {
        return { kind: 'OFF', availableFrom: null, availableTo: null };
      }
      const availableFrom = day.availableFrom?.trim() || '00:00';
      const availableTo = day.availableTo?.trim() || '23:59';
      if (availableFrom > availableTo) {
        throw new BadRequestException('availableFrom must be <= availableTo');
      }
      return { kind: 'ON', availableFrom, availableTo };
    });
  }

  private normalizeAbsenceBlocks(
    blocks: DriverDeliveryAbsenceBlockDto[] | undefined,
  ): DriverDeliveryAbsenceBlock[] {
    if (!blocks?.length) return [];
    return blocks.map((block, index) => {
      const dateFrom = this.toIsoDate(this.parseDateOnly(block.dateFrom));
      const dateTo = this.toIsoDate(this.parseDateOnly(block.dateTo));
      if (dateFrom > dateTo) {
        throw new BadRequestException(`absenceBlocks[${index}]: dateFrom must be <= dateTo`);
      }
      const note = block.note?.trim() ? block.note.trim() : null;
      return {
        kind: block.kind,
        dateFrom,
        dateTo,
        note,
      };
    });
  }

  private parseCycleDays(raw: Prisma.JsonValue): DriverDeliveryCycleDay[] {
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw.map((item) => {
      const row = item as Record<string, unknown>;
      const kind = row.kind === 'OFF' ? 'OFF' : 'ON';
      if (kind === 'OFF') {
        return { kind: 'OFF' as const, availableFrom: null, availableTo: null };
      }
      return {
        kind: 'ON' as const,
        availableFrom: typeof row.availableFrom === 'string' ? row.availableFrom : '00:00',
        availableTo: typeof row.availableTo === 'string' ? row.availableTo : '23:59',
      };
    });
  }

  private parseAbsenceBlocks(
    raw: Prisma.JsonValue | undefined | null,
  ): DriverDeliveryAbsenceBlock[] {
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const out: DriverDeliveryAbsenceBlock[] = [];
    for (const item of raw) {
      const row = item as Record<string, unknown>;
      if (row.kind !== 'VACATION' && row.kind !== 'SICK') continue;
      if (typeof row.dateFrom !== 'string' || typeof row.dateTo !== 'string') continue;
      try {
        const dateFrom = this.toIsoDate(this.parseDateOnly(row.dateFrom));
        const dateTo = this.toIsoDate(this.parseDateOnly(row.dateTo));
        if (dateFrom > dateTo) continue;
        out.push({
          kind: row.kind,
          dateFrom,
          dateTo,
          note: typeof row.note === 'string' && row.note.trim() ? row.note.trim() : null,
        });
      } catch {
        // skip invalid rows
      }
    }
    return out;
  }

  private findAbsence(
    blocks: DriverDeliveryAbsenceBlock[],
    date: Date,
  ): DriverDeliveryAbsenceBlock | null {
    const iso = this.toIsoDate(date);
    for (const block of blocks) {
      if (iso >= block.dateFrom && iso <= block.dateTo) {
        return block;
      }
    }
    return null;
  }

  private absenceLabel(block: DriverDeliveryAbsenceBlock): string {
    const base = block.kind === 'VACATION' ? 'Отпуск' : 'Больничный';
    return block.note ? `${base}: ${block.note}` : base;
  }

  private mapScheme(scheme: {
    id: string;
    userId: string;
    isActive: boolean;
    cycleAnchorDate: Date;
    cycleDays: Prisma.JsonValue;
    absenceBlocks?: Prisma.JsonValue | null;
    notes: string | null;
    updatedAt: Date;
  }) {
    return {
      id: scheme.id,
      userId: scheme.userId,
      isActive: scheme.isActive,
      cycleAnchorDate: this.toIsoDate(scheme.cycleAnchorDate),
      cycleDays: this.parseCycleDays(scheme.cycleDays),
      absenceBlocks: this.parseAbsenceBlocks(scheme.absenceBlocks),
      notes: scheme.notes,
      updatedAt: scheme.updatedAt.toISOString(),
    };
  }

  resolveDay(
    cycleAnchorDate: Date,
    cycleDays: DriverDeliveryCycleDay[],
    date: Date,
    timeFrom?: string | null,
    absenceBlocks: DriverDeliveryAbsenceBlock[] = [],
  ): ResolvedDay {
    const absence = this.findAbsence(absenceBlocks, date);
    if (absence) {
      return {
        available: false,
        kind: absence.kind,
        availableFrom: null,
        availableTo: null,
        label: this.absenceLabel(absence),
        outsideWindow: false,
      };
    }

    if (cycleDays.length === 0) {
      return {
        available: true,
        kind: 'NONE',
        availableFrom: null,
        availableTo: null,
        label: 'Без схемы',
        outsideWindow: false,
      };
    }
    const diff = this.daysBetweenUtc(cycleAnchorDate, date);
    const index = ((diff % cycleDays.length) + cycleDays.length) % cycleDays.length;
    const day = cycleDays[index]!;
    if (day.kind === 'OFF') {
      return {
        available: false,
        kind: 'OFF',
        availableFrom: null,
        availableTo: null,
        label: 'Выходной',
        outsideWindow: false,
      };
    }
    const from = day.availableFrom || '00:00';
    const to = day.availableTo || '23:59';
    const fullDay = from === '00:00' && to === '23:59';
    let outsideWindow = false;
    if (timeFrom?.trim() && (timeFrom < from || timeFrom > to)) {
      outsideWindow = true;
    }
    return {
      available: !outsideWindow,
      kind: 'ON',
      availableFrom: from,
      availableTo: to,
      label: fullDay ? 'Доступен' : `с ${from}${to !== '23:59' ? ` до ${to}` : ''}`,
      outsideWindow,
    };
  }

  async list() {
    const [drivers, schemes] = await Promise.all([
      this.prisma.user.findMany({
        where: this.assignableDriversWhere(),
        select: USER_SELECT,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { email: 'asc' }],
      }),
      this.prisma.driverDeliveryAvailability.findMany({
        include: { user: { select: USER_SELECT } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const byUserId = new Map(schemes.map((s) => [s.userId, s]));
    return drivers.map((driver) => {
      const scheme = byUserId.get(driver.id);
      return {
        user: driver,
        scheme: scheme ? this.mapScheme(scheme) : null,
      };
    });
  }

  async upsert(userId: string, dto: UpsertDriverDeliveryAvailabilityDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    const cycleDays = this.normalizeCycleDays(dto.cycleDays);
    const absenceBlocks = this.normalizeAbsenceBlocks(dto.absenceBlocks);
    const cycleAnchorDate = this.parseDateOnly(dto.cycleAnchorDate);
    const notes = dto.notes === undefined ? undefined : dto.notes?.trim() ? dto.notes.trim() : null;

    const data = {
      isActive: dto.isActive ?? true,
      cycleAnchorDate,
      cycleDays: cycleDays as unknown as Prisma.InputJsonValue,
      absenceBlocks: absenceBlocks as unknown as Prisma.InputJsonValue,
      ...(notes !== undefined ? { notes } : {}),
    };

    const row = await this.prisma.driverDeliveryAvailability.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      include: { user: { select: USER_SELECT } },
    });

    return {
      ...this.mapScheme(row),
      user: row.user,
    };
  }

  async remove(userId: string) {
    const existing = await this.prisma.driverDeliveryAvailability.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException('Схема не найдена');
    }
    await this.prisma.driverDeliveryAvailability.delete({ where: { userId } });
    return { ok: true };
  }

  async resolveAll(dateStr: string, timeFrom?: string | null): Promise<DriverAvailabilityStatus[]> {
    const date = this.parseDateOnly(dateStr);
    const [drivers, schemes] = await Promise.all([
      this.prisma.user.findMany({
        where: this.assignableDriversWhere(),
        select: { id: true },
      }),
      this.prisma.driverDeliveryAvailability.findMany(),
    ]);
    const byUser = new Map(schemes.map((s) => [s.userId, s]));

    return drivers.map((d) => {
      const scheme = byUser.get(d.id);
      if (!scheme || !scheme.isActive) {
        return {
          userId: d.id,
          hasScheme: Boolean(scheme),
          isActive: scheme?.isActive ?? false,
          available: true,
          kind: 'NONE' as const,
          availableFrom: null,
          availableTo: null,
          label: scheme && !scheme.isActive ? 'Схема выключена' : 'Без схемы',
          outsideWindow: false,
        };
      }
      const resolved = this.resolveDay(
        scheme.cycleAnchorDate,
        this.parseCycleDays(scheme.cycleDays),
        date,
        timeFrom,
        this.parseAbsenceBlocks(scheme.absenceBlocks),
      );
      return {
        userId: d.id,
        hasScheme: true,
        isActive: true,
        ...resolved,
      };
    });
  }

  async preview(userId: string, fromDateStr: string, days = 14) {
    const scheme = await this.prisma.driverDeliveryAvailability.findUnique({
      where: { userId },
    });
    if (!scheme) {
      throw new NotFoundException('Схема не найдена');
    }
    const cycleDays = this.parseCycleDays(scheme.cycleDays);
    const absenceBlocks = this.parseAbsenceBlocks(scheme.absenceBlocks);
    const from = this.parseDateOnly(fromDateStr);
    const out: Array<{ date: string } & ResolvedDay> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + i);
      out.push({
        date: this.toIsoDate(d),
        ...this.resolveDay(scheme.cycleAnchorDate, cycleDays, d, null, absenceBlocks),
      });
    }
    return {
      isActive: scheme.isActive,
      days: out,
    };
  }
}
