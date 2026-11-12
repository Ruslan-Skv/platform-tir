import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  UserRole,
  WorkDayRequestStatus,
  WorkDayRequestType,
  type Prisma,
  type WorkDayRequest,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkDayRequestDto, ReviewWorkDayRequestDto } from './dto/work-day.dto';
import { WorkDayNotifyService } from './services/work-day-notify.service';
import { getTodayDateInTimezone, isWorkDayPeriodRequestType } from './utils/work-day.utils';

const REQUEST_INCLUDE = {
  user: {
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  },
  reviewedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} as const;

type WorkDayRequestWithRelations = Prisma.WorkDayRequestGetPayload<{
  include: typeof REQUEST_INCLUDE;
}>;

/** Комментарий, который остаётся на запросе, согласованном автоматически по настройкам. */
const AUTO_APPROVED_REVIEW_COMMENT = 'Удовлетворён автоматически по настройкам';

@Injectable()
export class WorkDayRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workDayNotify: WorkDayNotifyService,
  ) {}

  async hasApprovedDayOff(userId: string, date: Date): Promise<boolean> {
    const row = await this.prisma.workDayRequest.findFirst({
      where: {
        userId,
        type: WorkDayRequestType.DAY_OFF,
        status: WorkDayRequestStatus.APPROVED,
        requestDate: date,
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async hasApprovedEarlyLeave(userId: string, date: Date): Promise<boolean> {
    const row = await this.prisma.workDayRequest.findFirst({
      where: {
        userId,
        type: WorkDayRequestType.EARLY_LEAVE,
        status: WorkDayRequestStatus.APPROVED,
        requestDate: date,
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async hasApprovedLateArrival(userId: string, date: Date): Promise<boolean> {
    const row = await this.prisma.workDayRequest.findFirst({
      where: {
        userId,
        type: WorkDayRequestType.LATE_ARRIVAL,
        status: WorkDayRequestStatus.APPROVED,
        requestDate: date,
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async createMyRequest(userId: string, dto: CreateWorkDayRequestDto) {
    const requestDate = this.parseDateOnly(dto.requestDate);
    if (dto.type === 'EARLY_LEAVE' && !dto.proposedEndTime) {
      throw new BadRequestException('Укажите желаемое время ухода.');
    }
    if (dto.type === 'LATE_ARRIVAL' && !dto.proposedEndTime) {
      throw new BadRequestException('Укажите желаемое время прихода.');
    }

    const type = dto.type as WorkDayRequestType;
    // Больничный и отпуск запрашиваются за период: requestDate … requestDateTo (или один день).
    const isPeriod = isWorkDayPeriodRequestType(type);
    const requestDateTo = isPeriod ? this.parseLeaveRange(requestDate, dto.requestDateTo) : null;

    if (isPeriod) {
      const overlappingLeave = await this.findOverlappingLeave(userId, requestDate, requestDateTo!);
      if (overlappingLeave) {
        const kind = overlappingLeave.type === 'VACATION' ? 'отпуском' : 'больничным';
        throw new BadRequestException(
          `Даты пересекаются с уже отмеченным ${kind} с ${overlappingLeave.dateFrom.toISOString().slice(0, 10)} по ${overlappingLeave.dateTo.toISOString().slice(0, 10)}.`,
        );
      }
      const overlappingPending = await this.prisma.workDayRequest.findFirst({
        where: {
          userId,
          type: { in: [WorkDayRequestType.SICK_LEAVE, WorkDayRequestType.VACATION_LEAVE] },
          status: WorkDayRequestStatus.PENDING,
          requestDate: { lte: requestDateTo! },
          requestDateTo: { gte: requestDate },
        },
        select: { id: true },
      });
      if (overlappingPending) {
        throw new BadRequestException(
          'У вас уже есть ожидающий запрос больничного или отпуска на пересекающиеся даты.',
        );
      }
    } else {
      const duplicate = await this.prisma.workDayRequest.findFirst({
        where: {
          userId,
          type,
          status: WorkDayRequestStatus.PENDING,
          requestDate,
        },
      });
      if (duplicate) {
        throw new BadRequestException('У вас уже есть ожидающий запрос этого типа на эту дату.');
      }
    }

    const needsTime = dto.type === 'EARLY_LEAVE' || dto.type === 'LATE_ARRIVAL';
    const created = await this.prisma.workDayRequest.create({
      data: {
        userId,
        type,
        requestDate,
        // Для больничных и отпусков конец периода хранится всегда (для одного дня — равен началу),
        // чтобы поиск пересечений по диапазону работал и без отдельной проверки NULL.
        requestDateTo,
        proposedEndTime: needsTime ? dto.proposedEndTime : null,
        comment: dto.comment?.trim() || null,
      },
      include: REQUEST_INCLUDE,
    });

    // Для типов из настройки автоудовлетворения запрос согласовывается сразу,
    // без ожидания ручного решения суперадмина.
    if (await this.isAutoApprovedType(type)) {
      return this.autoApproveRequest(created);
    }

    this.workDayNotify.onRequestCreated(created.id);
    return created;
  }

  /** Тип запроса включён суперадмином в режим автоудовлетворения. */
  private async isAutoApprovedType(type: WorkDayRequestType): Promise<boolean> {
    const settings = await this.prisma.workDaySettings.findUnique({
      where: { id: 'main' },
      select: { autoApprovedRequestTypes: true },
    });
    return (settings?.autoApprovedRequestTypes ?? []).includes(type);
  }

  /**
   * Мгновенное согласование только что созданного запроса: статус APPROVED без reviewer'а,
   * для больничного/отпуска дополнительно создаётся отметка workDayLeave на весь период.
   * Если автосогласование не удалось (например, пересечение с уже отмеченным больничным),
   * запрос остаётся ожидающим на ручное рассмотрение суперадмина.
   */
  private async autoApproveRequest(row: WorkDayRequestWithRelations) {
    try {
      const updated = isWorkDayPeriodRequestType(row.type)
        ? await this.approveLeaveRequest(row, null, {
            reviewComment: AUTO_APPROVED_REVIEW_COMMENT,
          })
        : await this.prisma.workDayRequest.update({
            where: { id: row.id },
            data: {
              status: WorkDayRequestStatus.APPROVED,
              reviewedAt: new Date(),
              reviewComment: AUTO_APPROVED_REVIEW_COMMENT,
            },
            include: REQUEST_INCLUDE,
          });
      this.workDayNotify.onRequestReviewed(updated);
      // Суперадмин узнаёт и о запросах, согласованных без его участия.
      this.workDayNotify.onRequestAutoApproved(updated.id);
      return updated;
    } catch {
      this.workDayNotify.onRequestCreated(row.id);
      return row;
    }
  }

  async listMyRequests(
    userId: string,
    params: { dateFrom?: string; dateTo?: string; status?: string },
  ) {
    const where: {
      userId: string;
      AND?: object[];
      status?: WorkDayRequestStatus;
    } = { userId };
    if (params.dateFrom || params.dateTo) {
      // Запрос попадает в выборку, если его дата (для больничного — период) пересекает окно фильтра.
      const and: object[] = [];
      if (params.dateTo) {
        and.push({ requestDate: { lte: this.parseDateOnly(params.dateTo) } });
      }
      if (params.dateFrom) {
        const from = this.parseDateOnly(params.dateFrom);
        and.push({
          OR: [
            { requestDateTo: { gte: from } },
            { requestDateTo: null, requestDate: { gte: from } },
          ],
        });
      }
      where.AND = and;
    }
    if (params.status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(params.status)) {
      where.status = params.status as WorkDayRequestStatus;
    }
    return this.prisma.workDayRequest.findMany({
      where,
      orderBy: [{ requestDate: 'desc' }, { createdAt: 'desc' }],
      include: REQUEST_INCLUDE,
    });
  }

  async cancelMyRequest(userId: string, requestId: string) {
    const row = await this.prisma.workDayRequest.findUnique({ where: { id: requestId } });
    if (!row || row.userId !== userId) {
      throw new NotFoundException('Запрос не найден');
    }
    if (row.status !== WorkDayRequestStatus.PENDING) {
      throw new BadRequestException('Отменить можно только ожидающий запрос');
    }
    return this.prisma.workDayRequest.update({
      where: { id: requestId },
      data: { status: WorkDayRequestStatus.CANCELLED },
      include: REQUEST_INCLUDE,
    });
  }

  async listRequests(params: { status?: string }) {
    const where: { status?: WorkDayRequestStatus } = {};
    if (params.status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(params.status)) {
      where.status = params.status as WorkDayRequestStatus;
    } else {
      where.status = WorkDayRequestStatus.PENDING;
    }
    return this.prisma.workDayRequest.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: REQUEST_INCLUDE,
      take: 200,
    });
  }

  async approveRequest(requestId: string, reviewerId: string, dto: ReviewWorkDayRequestDto) {
    return this.reviewRequest(requestId, reviewerId, WorkDayRequestStatus.APPROVED, dto);
  }

  async rejectRequest(requestId: string, reviewerId: string, dto: ReviewWorkDayRequestDto) {
    return this.reviewRequest(requestId, reviewerId, WorkDayRequestStatus.REJECTED, dto);
  }

  private async reviewRequest(
    requestId: string,
    reviewerId: string,
    status: typeof WorkDayRequestStatus.APPROVED | typeof WorkDayRequestStatus.REJECTED,
    dto: ReviewWorkDayRequestDto,
  ) {
    const row = await this.prisma.workDayRequest.findUnique({ where: { id: requestId } });
    if (!row) throw new NotFoundException('Запрос не найден');
    if (row.status !== WorkDayRequestStatus.PENDING) {
      throw new BadRequestException('Запрос уже обработан');
    }
    if (status === WorkDayRequestStatus.APPROVED && isWorkDayPeriodRequestType(row.type)) {
      return this.approveLeaveRequest(row, reviewerId, dto);
    }
    const updated = await this.prisma.workDayRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewComment: dto.reviewComment?.trim() || null,
      },
      include: REQUEST_INCLUDE,
    });
    this.workDayNotify.onRequestReviewed(updated);
    return updated;
  }

  /**
   * Подтверждение больничного или отпуска: вместе со сменой статуса создаётся отметка
   * workDayLeave на весь запрошенный период — дни перестают считаться прогулами
   * так же, как при отметке суперадмином вручную.
   */
  private async approveLeaveRequest(
    row: {
      id: string;
      userId: string;
      type: WorkDayRequestType;
      requestDate: Date;
      requestDateTo: Date | null;
      comment: string | null;
    },
    reviewerId: string | null,
    dto: ReviewWorkDayRequestDto,
  ) {
    const dateFrom = row.requestDate;
    const dateTo = row.requestDateTo ?? row.requestDate;
    const leaveType = row.type === WorkDayRequestType.VACATION_LEAVE ? 'VACATION' : 'SICK';

    const updated = await this.prisma.$transaction(async (tx) => {
      const overlapping = await tx.workDayLeave.findFirst({
        where: { userId: row.userId, dateFrom: { lte: dateTo }, dateTo: { gte: dateFrom } },
      });
      if (overlapping) {
        const kind = overlapping.type === 'VACATION' ? 'отпуск' : 'больничный';
        throw new BadRequestException(
          `Согласовать нельзя: у сотрудника уже есть ${kind} с ${overlapping.dateFrom.toISOString().slice(0, 10)} по ${overlapping.dateTo.toISOString().slice(0, 10)}, который пересекается с запрошенными датами.`,
        );
      }

      await tx.workDayLeave.create({
        data: {
          userId: row.userId,
          type: leaveType,
          dateFrom,
          dateTo,
          comment: row.comment,
          createdById: reviewerId,
        },
      });

      return tx.workDayRequest.update({
        where: { id: row.id },
        data: {
          status: WorkDayRequestStatus.APPROVED,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          reviewComment: dto.reviewComment?.trim() || null,
        },
        include: REQUEST_INCLUDE,
      });
    });

    this.workDayNotify.onRequestReviewed(updated);
    return updated;
  }

  assertSuperAdmin(role: UserRole) {
    if (role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Доступно только суперадмину');
    }
  }

  /** Today in work-day timezone as Date @db.Date */
  todayDate(): Date {
    return getTodayDateInTimezone();
  }

  private parseDateOnly(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Некорректная дата');
    }
    return new Date(`${value}T00:00:00.000Z`);
  }

  /** Конец периода больничного/отпуска: не раньше начала; без даты окончания — один день. */
  private parseLeaveRange(dateFrom: Date, dateTo?: string): Date {
    if (!dateTo) return dateFrom;
    const parsed = this.parseDateOnly(dateTo);
    if (parsed < dateFrom) {
      throw new BadRequestException('Дата окончания не может быть раньше даты начала.');
    }
    return parsed;
  }

  private findOverlappingLeave(userId: string, dateFrom: Date, dateTo: Date) {
    return this.prisma.workDayLeave.findFirst({
      where: { userId, dateFrom: { lte: dateTo }, dateTo: { gte: dateFrom } },
      orderBy: { dateFrom: 'asc' },
    });
  }

  mapRequest(
    row: WorkDayRequest & {
      user?: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        role?: string;
      };
      reviewedBy?: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      } | null;
    },
  ) {
    return {
      ...row,
      requestDate:
        row.requestDate instanceof Date
          ? row.requestDate.toISOString().slice(0, 10)
          : String(row.requestDate).slice(0, 10),
      requestDateTo: row.requestDateTo
        ? row.requestDateTo instanceof Date
          ? row.requestDateTo.toISOString().slice(0, 10)
          : String(row.requestDateTo).slice(0, 10)
        : null,
    };
  }
}
