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
  type WorkDayRequest,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkDayRequestDto, ReviewWorkDayRequestDto } from './dto/work-day.dto';
import { WorkDayNotifyService } from './services/work-day-notify.service';
import { getTodayDateInTimezone } from './utils/work-day.utils';

const REQUEST_INCLUDE = {
  user: {
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  },
  reviewedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} as const;

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

    const duplicate = await this.prisma.workDayRequest.findFirst({
      where: {
        userId,
        type: dto.type as WorkDayRequestType,
        status: WorkDayRequestStatus.PENDING,
        requestDate,
      },
    });
    if (duplicate) {
      throw new BadRequestException('У вас уже есть ожидающий запрос этого типа на эту дату.');
    }

    const needsTime = dto.type === 'EARLY_LEAVE' || dto.type === 'LATE_ARRIVAL';
    const created = await this.prisma.workDayRequest.create({
      data: {
        userId,
        type: dto.type as WorkDayRequestType,
        requestDate,
        proposedEndTime: needsTime ? dto.proposedEndTime : null,
        comment: dto.comment?.trim() || null,
      },
      include: REQUEST_INCLUDE,
    });

    this.workDayNotify.onRequestCreated(created.id);
    return created;
  }

  async listMyRequests(
    userId: string,
    params: { dateFrom?: string; dateTo?: string; status?: string },
  ) {
    const where: {
      userId: string;
      requestDate?: { gte?: Date; lte?: Date };
      status?: WorkDayRequestStatus;
    } = { userId };
    if (params.dateFrom || params.dateTo) {
      where.requestDate = {};
      if (params.dateFrom) where.requestDate.gte = this.parseDateOnly(params.dateFrom);
      if (params.dateTo) where.requestDate.lte = this.parseDateOnly(params.dateTo);
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
    return this.prisma.workDayRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewComment: dto.reviewComment?.trim() || null,
      },
      include: REQUEST_INCLUDE,
    });
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
    };
  }
}
