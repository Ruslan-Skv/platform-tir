import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminBellPushService } from '../../bell-push/admin-bell-push.service';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import { PrismaService } from '../../database/prisma.service';
import { CreateCalendarCustomEventDto } from './dto/calendar.dto';

export type CalendarEventType =
  | 'installation'
  | 'waybill'
  | 'measurement'
  | 'contract'
  | 'delivery'
  | 'contract_install'
  | 'work_day'
  | 'custom';

export type CalendarEventDto = {
  id: string;
  type: CalendarEventType;
  date: string;
  timeFrom: string | null;
  timeTo: string | null;
  title: string;
  subtitle: string | null;
  status: string | null;
  href: string;
  body?: string | null;
};

const ALL_TYPES: CalendarEventType[] = [
  'installation',
  'waybill',
  'measurement',
  'contract',
  'delivery',
  'contract_install',
  'work_day',
  'custom',
];

/** Направления монтажей / доставок (коды из CRM). */
const DIRECTION_LABELS: Record<string, string> = {
  REPAIR: 'Ремонт',
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Натяжные потолки',
  FURNITURE: 'Мебель',
  BLINDS: 'Жалюзи',
  DELIVERY: 'Доставка',
};

const INSTALL_WAYBILL_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'В плане',
  DONE: 'Выполнено',
  FAILED: 'Не выполнено',
};

const MEASUREMENT_STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  ASSIGNED: 'Назначен',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отказ',
  CONVERTED: 'Договор',
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершён',
  EXPIRED: 'Истёк',
  CANCELLED: 'Отменён',
};

const WORK_DAY_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  CLOSED: 'Закрыт',
  AUTO_CLOSED: 'Авто-закрыт',
};

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
  ) {}

  async listEvents(params: { from?: string; to?: string; types?: string }) {
    const from = this.parseDate(params.from, 'from');
    const to = this.parseDate(params.to, 'to');
    if (from > to) {
      throw new BadRequestException('from must be <= to');
    }

    const types = this.parseTypes(params.types);
    const range = { gte: from, lte: to };

    const jobs: Array<Promise<CalendarEventDto[]>> = [];

    if (types.has('installation')) {
      jobs.push(this.loadInstallations(range));
    }
    if (types.has('waybill')) {
      jobs.push(this.loadWaybills(range));
    }
    if (types.has('measurement')) {
      jobs.push(this.loadMeasurements(range));
    }
    if (types.has('contract') || types.has('delivery') || types.has('contract_install')) {
      jobs.push(this.loadContracts(range, types));
    }
    if (types.has('work_day')) {
      jobs.push(this.loadWorkDays(range));
    }
    if (types.has('custom')) {
      jobs.push(this.loadCustomEvents(range));
    }

    const batches = await Promise.all(jobs);
    const events = batches.flat();
    events.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const at = a.timeFrom || '99:99';
      const bt = b.timeFrom || '99:99';
      if (at !== bt) return at.localeCompare(bt);
      return a.title.localeCompare(b.title, 'ru');
    });

    return { from: this.toIso(from), to: this.toIso(to), events };
  }

  async createCustomEvent(userId: string, dto: CreateCalendarCustomEventDto) {
    const date = this.parseDate(dto.date, 'date');
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Укажите название события');
    }

    const notifyIds = Array.from(new Set([...(dto.notifyUserIds ?? []), userId]));
    const validUsers = await this.prisma.user.findMany({
      where: { id: { in: notifyIds }, isActive: true, role: { in: ADMIN_ROLES } },
      select: { id: true },
    });
    const recipientIds = validUsers.map((u) => u.id);
    if (!recipientIds.includes(userId)) {
      recipientIds.push(userId);
    }

    const event = await this.prisma.calendarCustomEvent.create({
      data: {
        title,
        body: dto.body?.trim() || null,
        date,
        timeFrom: dto.timeFrom?.trim() || null,
        timeTo: dto.timeTo?.trim() || null,
        createdById: userId,
        recipients: {
          create: recipientIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        recipients: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    const dateIso = this.toIso(event.date);
    const timeLabel =
      event.timeFrom && event.timeTo
        ? `${event.timeFrom}–${event.timeTo}`
        : event.timeFrom || event.timeTo || null;
    const message = [dateIso, timeLabel, event.body?.slice(0, 120)].filter(Boolean).join(' · ');
    const bellTitle = `Событие в календаре: ${event.title}`;
    const href = `/admin/calendar?date=${dateIso}`;

    const notifyTargets = recipientIds.filter((id) => id !== userId);
    if (notifyTargets.length > 0) {
      await this.prisma.calendarCustomEventBellEvent.createMany({
        data: notifyTargets.map((recipientId) => ({
          recipientId,
          calendarEventId: event.id,
          kind: 'created',
          title: bellTitle,
          message: message || event.title,
          href,
        })),
      });

      await Promise.all(
        notifyTargets.map((recipientId) =>
          this.adminBellPush.notifyUsers([recipientId], 'calendar_event', {
            title: bellTitle,
            body: message || event.title,
            url: href,
            tag: `calendar-event-${event.id}-${recipientId}`,
          }),
        ),
      );
    }

    return {
      id: `custom:${event.id}`,
      type: 'custom' as const,
      date: dateIso,
      timeFrom: event.timeFrom,
      timeTo: event.timeTo,
      title: event.title,
      subtitle: event.body?.slice(0, 120) || null,
      status: null,
      href,
      body: event.body,
    };
  }

  private async loadCustomEvents(range: { gte: Date; lte: Date }): Promise<CalendarEventDto[]> {
    const rows = await this.prisma.calendarCustomEvent.findMany({
      where: { deletedAt: null, date: range },
      include: {
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        recipients: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
          take: 5,
        },
      },
      orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }],
      take: 5000,
    });

    return rows.map((row) => {
      const author = this.formatUser(row.createdBy);
      const people = row.recipients.map((r) => this.formatUser(r.user)).filter((n) => n !== '—');
      return {
        id: `custom:${row.id}`,
        type: 'custom' as const,
        date: this.toIso(row.date),
        timeFrom: row.timeFrom,
        timeTo: row.timeTo,
        title: row.title,
        subtitle: [author !== '—' ? `от ${author}` : null, people.length ? people.join(', ') : null]
          .filter(Boolean)
          .join(' · '),
        status: null,
        href: `/admin/calendar?date=${this.toIso(row.date)}`,
        body: row.body,
      };
    });
  }

  private async loadInstallations(range: { gte: Date; lte: Date }): Promise<CalendarEventDto[]> {
    const rows = await this.prisma.installationScheduleEntry.findMany({
      where: {
        deletedAt: null,
        date: { lte: range.lte },
        OR: [{ dateEnd: null, date: { gte: range.gte } }, { dateEnd: { gte: range.gte } }],
      },
      select: {
        id: true,
        date: true,
        dateEnd: true,
        timeFrom: true,
        timeTo: true,
        status: true,
        direction: true,
        customerName: true,
        customerAddress: true,
        contractNumber: true,
        installerName: true,
      },
      orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }],
      take: 5000,
    });

    const events: CalendarEventDto[] = [];
    for (const row of rows) {
      const start = row.date;
      const end = row.dateEnd && row.dateEnd > row.date ? row.dateEnd : row.date;
      const title = row.customerName?.trim() || row.contractNumber || 'Монтаж';
      const subtitle =
        [this.labelDirection(row.direction), row.installerName, row.customerAddress]
          .filter(Boolean)
          .join(' · ') || null;
      const status = this.labelStatus(row.status, INSTALL_WAYBILL_STATUS_LABELS);
      const href = `/admin/crm/installation-schedules?date=${this.toIso(row.date)}`;

      for (const day of this.eachDayInRange(start, end, range)) {
        events.push({
          id: `installation:${row.id}:${day}`,
          type: 'installation' as const,
          date: day,
          timeFrom: row.timeFrom,
          timeTo: row.timeTo,
          title,
          subtitle,
          status,
          href,
        });
      }
    }
    return events;
  }

  /** Дни монтажа, пересекающие запрошенное окно календаря. */
  private eachDayInRange(start: Date, end: Date, range: { gte: Date; lte: Date }): string[] {
    const from = start > range.gte ? start : range.gte;
    const to = end < range.lte ? end : range.lte;
    if (from > to) return [];
    const days: string[] = [];
    const cur = new Date(from);
    while (cur <= to) {
      days.push(this.toIso(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return days;
  }

  private async loadWaybills(range: { gte: Date; lte: Date }): Promise<CalendarEventDto[]> {
    const rows = await this.prisma.waybillTask.findMany({
      where: { deletedAt: null, date: range },
      select: {
        id: true,
        date: true,
        timeFrom: true,
        timeTo: true,
        status: true,
        direction: true,
        taskText: true,
        customerName: true,
        contract: { select: { contractNumber: true } },
        driver: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }],
      take: 5000,
    });

    return rows.map((row) => {
      const driver = this.formatUser(row.driver);
      return {
        id: `waybill:${row.id}`,
        type: 'waybill' as const,
        date: this.toIso(row.date),
        timeFrom: row.timeFrom,
        timeTo: row.timeTo,
        title: row.customerName?.trim() || row.contract?.contractNumber || 'Доставка',
        subtitle:
          [
            this.labelDirection(row.direction),
            driver !== '—' ? driver : null,
            row.taskText?.slice(0, 80),
          ]
            .filter(Boolean)
            .join(' · ') || null,
        status: this.labelStatus(row.status, INSTALL_WAYBILL_STATUS_LABELS),
        href: `/admin/crm/waybills?date=${this.toIso(row.date)}`,
      };
    });
  }

  private async loadMeasurements(range: { gte: Date; lte: Date }): Promise<CalendarEventDto[]> {
    const rows = await this.prisma.measurement.findMany({
      where: {
        OR: [{ executionDate: range }, { executionDate: null, receptionDate: range }],
      },
      select: {
        id: true,
        receptionDate: true,
        executionDate: true,
        status: true,
        customerName: true,
        customerAddress: true,
        direction: { select: { name: true } },
      },
      orderBy: [{ executionDate: 'asc' }, { receptionDate: 'asc' }],
      take: 5000,
    });

    const events: CalendarEventDto[] = [];
    for (const row of rows) {
      const date = row.executionDate ?? row.receptionDate;
      if (date < range.gte || date > range.lte) continue;
      events.push({
        id: `measurement:${row.id}`,
        type: 'measurement',
        date: this.toIso(date),
        timeFrom: null,
        timeTo: null,
        title: row.customerName?.trim() || 'Замер',
        subtitle: [row.direction?.name, row.customerAddress].filter(Boolean).join(' · ') || null,
        status: this.labelStatus(row.status, MEASUREMENT_STATUS_LABELS),
        href: `/admin/measurements/${row.id}`,
      });
    }
    return events;
  }

  private async loadContracts(
    range: { gte: Date; lte: Date },
    types: Set<CalendarEventType>,
  ): Promise<CalendarEventDto[]> {
    const or: Prisma.ContractWhereInput[] = [];
    if (types.has('contract')) or.push({ contractDate: range });
    if (types.has('delivery')) or.push({ deliveryDate: range });
    if (types.has('contract_install')) or.push({ installationDate: range });
    if (or.length === 0) return [];

    const rows = await this.prisma.contract.findMany({
      where: { OR: or },
      select: {
        id: true,
        contractNumber: true,
        contractDate: true,
        deliveryDate: true,
        installationDate: true,
        status: true,
        customerName: true,
        customerAddress: true,
        direction: { select: { name: true } },
      },
      take: 5000,
    });

    const events: CalendarEventDto[] = [];
    for (const row of rows) {
      const baseTitle = row.contractNumber || 'Договор';
      const customer = row.customerName?.trim();
      const subtitle =
        [customer, row.direction?.name, row.customerAddress].filter(Boolean).join(' · ') || null;

      if (types.has('contract') && this.inRange(row.contractDate, range)) {
        events.push({
          id: `contract:${row.id}`,
          type: 'contract',
          date: this.toIso(row.contractDate),
          timeFrom: null,
          timeTo: null,
          title: `Договор ${baseTitle}`,
          subtitle,
          status: this.labelStatus(row.status, CONTRACT_STATUS_LABELS),
          href: `/admin/contract-documents/contracts`,
        });
      }
      if (types.has('delivery') && row.deliveryDate && this.inRange(row.deliveryDate, range)) {
        events.push({
          id: `delivery:${row.id}`,
          type: 'delivery',
          date: this.toIso(row.deliveryDate),
          timeFrom: null,
          timeTo: null,
          title: `Доставка · ${baseTitle}`,
          subtitle,
          status: this.labelStatus(row.status, CONTRACT_STATUS_LABELS),
          href: `/admin/contract-documents/contracts`,
        });
      }
      if (
        types.has('contract_install') &&
        row.installationDate &&
        this.inRange(row.installationDate, range)
      ) {
        events.push({
          id: `contract_install:${row.id}`,
          type: 'contract_install',
          date: this.toIso(row.installationDate),
          timeFrom: null,
          timeTo: null,
          title: `Монтаж (договор) · ${baseTitle}`,
          subtitle,
          status: this.labelStatus(row.status, CONTRACT_STATUS_LABELS),
          href: `/admin/contract-documents/contracts`,
        });
      }
    }
    return events;
  }

  private async loadWorkDays(range: { gte: Date; lte: Date }): Promise<CalendarEventDto[]> {
    const rows = await this.prisma.workDay.findMany({
      where: { workDate: range },
      select: {
        id: true,
        workDate: true,
        status: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        office: { select: { name: true } },
      },
      orderBy: [{ workDate: 'asc' }],
      take: 5000,
    });

    return rows.map((row) => ({
      id: `work_day:${row.id}`,
      type: 'work_day' as const,
      date: this.toIso(row.workDate),
      timeFrom: null,
      timeTo: null,
      title: this.formatUser(row.user),
      subtitle: row.office?.name || null,
      status: this.labelStatus(row.status, WORK_DAY_STATUS_LABELS),
      href: `/admin/crm/work-days`,
    }));
  }

  private labelDirection(value: string | null | undefined): string | null {
    const raw = value?.trim();
    if (!raw) return null;
    return DIRECTION_LABELS[raw] ?? raw;
  }

  private labelStatus(
    value: string | null | undefined,
    map: Record<string, string>,
  ): string | null {
    if (!value) return null;
    return map[value] ?? value;
  }

  private parseTypes(raw?: string): Set<CalendarEventType> {
    if (!raw?.trim()) return new Set(ALL_TYPES);
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as CalendarEventType[];
    const set = new Set<CalendarEventType>();
    for (const p of parts) {
      if ((ALL_TYPES as string[]).includes(p)) set.add(p);
    }
    return set.size > 0 ? set : new Set(ALL_TYPES);
  }

  private parseDate(value: string | undefined, label: string): Date {
    const raw = value?.trim();
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      throw new BadRequestException(`Query "${label}" must be YYYY-MM-DD`);
    }
    const d = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Query "${label}" is invalid`);
    }
    return d;
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private inRange(d: Date, range: { gte: Date; lte: Date }) {
    return d >= range.gte && d <= range.lte;
  }

  private formatUser(
    user: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null,
  ): string {
    if (!user) return '—';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email || '—';
  }
}
