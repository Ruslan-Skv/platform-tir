import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  UserRole,
  WorkDayCloseReason,
  WorkDayStatus,
  type Office,
  type User,
  type WorkDay,
  type WorkDaySettings,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import {
  CloseForgottenWorkDayDto,
  StartAbsenceDto,
  StartWorkDayDto,
  UpdateUserWorkScheduleDto,
  UpdateWorkDaySettingsDto,
} from './dto/work-day.dto';
import {
  WORK_DAY_TIMEZONE,
  calculateEarlyLeaveMinutes,
  calculateLateMinutes,
  combineDateAndTime,
  extractClientIp,
  getDayOfWeekInTimezone,
  getTodayDateInTimezone,
  isIpAllowed,
  isMobileUserAgent,
  pickRandomGreeting,
  resolveDaySchedule,
  resolveWorkSchedule,
} from './utils/work-day.utils';
import { type WeeklySchedule } from './utils/weekly-schedule.types';
import { WorkDayNotifyService } from './services/work-day-notify.service';
import { WorkDayRequestsService } from './work-day-requests.service';
import { DEFAULT_WORK_DAY_SETTINGS, WORK_DAY_RECORD_INCLUDE } from './work-day.constants';
import {
  USER_WORK_SCHEDULE_SELECT,
  legacyFieldsFromWeeklySchedule,
} from './work-day-schedule.helpers';

type RequestMeta = {
  userAgent?: string;
  forwardedFor?: string | string[];
  realIp?: string;
  remoteAddress?: string;
};

@Injectable()
export class WorkDaysService implements OnModuleInit {
  private autoCloseTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly workDayNotify: WorkDayNotifyService,
    private readonly workDayRequests: WorkDayRequestsService,
  ) {}

  onModuleInit() {
    void this.runAutoCloseSweep();
    this.autoCloseTimer = setInterval(() => void this.runAutoCloseSweep(), 15 * 60_000);
  }

  async getSettings(): Promise<WorkDaySettings> {
    const existing = await this.prisma.workDaySettings.findUnique({ where: { id: 'main' } });
    if (existing) return existing;
    return this.prisma.workDaySettings.create({ data: DEFAULT_WORK_DAY_SETTINGS });
  }

  async updateSettings(dto: UpdateWorkDaySettingsDto): Promise<WorkDaySettings> {
    await this.getSettings();
    return this.prisma.workDaySettings.update({
      where: { id: 'main' },
      data: dto,
    });
  }

  async isUserTracked(user: Pick<User, 'role' | 'workDayTrackingEnabled'>): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings.isEnabled) return false;
    if (!user.workDayTrackingEnabled) return false;
    if (user.role === UserRole.SUPER_ADMIN) return false;
    return settings.trackedRoles.includes(user.role);
  }

  private async getUserWithOffice(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { office: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  private getClientMeta(meta: RequestMeta) {
    return {
      ip: extractClientIp(meta.forwardedFor, meta.realIp, meta.remoteAddress),
      userAgent: meta.userAgent,
    };
  }

  getClientIpInfo(meta: RequestMeta) {
    const { ip } = this.getClientMeta(meta);
    return { ip };
  }

  private async validateStartAccess(
    user: User & { office: Office | null },
    settings: WorkDaySettings,
    meta: RequestMeta,
    office: Office | null,
  ) {
    if (settings.blockMobileDevices && isMobileUserAgent(meta.userAgent)) {
      throw new ForbiddenException(
        'Начать рабочий день можно только с компьютера в офисе, не с мобильного устройства.',
      );
    }
    if (settings.requireOfficeIp) {
      if (!office) {
        throw new BadRequestException(
          'Для вас не назначен офис. Обратитесь к администратору для настройки учёта рабочего времени.',
        );
      }
      if (!office.skipWorkDayIpCheck) {
        const { ip } = this.getClientMeta(meta);
        if (!isIpAllowed(ip, office.allowedIps)) {
          throw new ForbiddenException(
            `Начать рабочий день можно только из офиса «${office.name}» (IP не совпадает с разрешённым списком).`,
          );
        }
      }
    }
  }

  async runAutoCloseSweep() {
    const settings = await this.getSettings();
    if (!settings.isEnabled) return;

    const openDays = await this.prisma.workDay.findMany({
      where: { status: WorkDayStatus.OPEN },
      include: { user: { include: { office: true } } },
    });

    const now = new Date();
    for (const day of openDays) {
      const dayOfWeek = getDayOfWeekInTimezone(WORK_DAY_TIMEZONE, day.workDate);
      const schedule = resolveDaySchedule(day.user, day.user.office, settings, dayOfWeek);
      const autoCloseAt = combineDateAndTime(
        day.workDate,
        `${String(settings.autoCloseHour).padStart(2, '0')}:${String(settings.autoCloseMinute).padStart(2, '0')}`,
      );
      if (now >= autoCloseAt) {
        await this.closeWorkDayRecord(day, {
          endedAt: autoCloseAt,
          closeReason: WorkDayCloseReason.AUTO_AT_DEADLINE,
          status: WorkDayStatus.AUTO_CLOSED,
          autoClosedAt: now,
          schedule,
        });
      }
    }
  }

  private async closeWorkDayRecord(
    day: WorkDay,
    opts: {
      endedAt: Date;
      closeReason: WorkDayCloseReason;
      status: WorkDayStatus;
      autoClosedAt?: Date;
      endedFromIp?: string | null;
      reportedEndAt?: Date;
      schedule: ReturnType<typeof resolveDaySchedule>;
    },
  ) {
    const earlyLeaveApproved = await this.workDayRequests.hasApprovedEarlyLeave(
      day.userId,
      day.workDate,
    );
    const earlyLeaveMinutes = earlyLeaveApproved
      ? 0
      : calculateEarlyLeaveMinutes(opts.endedAt, day.workDate, opts.schedule);
    await this.prisma.workDayAbsence.updateMany({
      where: { workDayId: day.id, endedAt: null },
      data: { endedAt: opts.endedAt },
    });
    const updated = await this.prisma.workDay.update({
      where: { id: day.id },
      data: {
        status: opts.status,
        endedAt: opts.endedAt,
        closeReason: opts.closeReason,
        autoClosedAt: opts.autoClosedAt ?? null,
        endedFromIp: opts.endedFromIp ?? null,
        reportedEndAt: opts.reportedEndAt ?? null,
        earlyLeaveMinutes,
      },
      include: WORK_DAY_RECORD_INCLUDE,
    });
    this.workDayNotify.onWorkDayClosed(updated);
    return updated;
  }

  async getMyStatus(userId: string, role: UserRole) {
    await this.runAutoCloseSweep();
    const settings = await this.getSettings();
    const user = await this.getUserWithOffice(userId);
    const tracked = await this.isUserTracked(user);
    const today = getTodayDateInTimezone();
    const dayOfWeek = getDayOfWeekInTimezone();
    const todayDay = await this.prisma.workDay.findUnique({
      where: { userId_workDate: { userId, workDate: today } },
      include: WORK_DAY_RECORD_INCLUDE,
    });

    const openPrevious = await this.prisma.workDay.findFirst({
      where: {
        userId,
        status: WorkDayStatus.OPEN,
        workDate: { lt: today },
      },
      orderBy: { workDate: 'desc' },
      include: WORK_DAY_RECORD_INCLUDE,
    });

    const scheduleResolved = resolveWorkSchedule(user, user.office, settings, dayOfWeek);
    const todaySchedule = resolveDaySchedule(user, user.office, settings, dayOfWeek);
    const approvedDayOff = await this.workDayRequests.hasApprovedDayOff(userId, today);
    const approvedEarlyLeave = await this.workDayRequests.hasApprovedEarlyLeave(userId, today);
    const approvedLateArrival = await this.workDayRequests.hasApprovedLateArrival(userId, today);
    const isWorkDayToday = todaySchedule.isWorkDay && !approvedDayOff;

    return {
      tracked,
      settings: {
        isEnabled: settings.isEnabled,
        blockAdminWithoutWorkDay: settings.blockAdminWithoutWorkDay,
        requireOfficeIp: settings.requireOfficeIp,
        blockMobileDevices: settings.blockMobileDevices,
      },
      isWorkDayToday,
      approvedDayOff,
      approvedEarlyLeave,
      approvedLateArrival,
      todayWorkDay: todayDay,
      forgottenOpenDay: openPrevious,
      hasOpenAbsence: todayDay?.absences.some((a) => !a.endedAt) ?? false,
      canAccessAdmin:
        !tracked ||
        !settings.isEnabled ||
        !settings.blockAdminWithoutWorkDay ||
        role === UserRole.SUPER_ADMIN ||
        !isWorkDayToday ||
        (todayDay?.status === WorkDayStatus.OPEN && !openPrevious),
      schedule: scheduleResolved,
      office: user.office
        ? {
            id: user.office.id,
            name: user.office.name,
            allowedIps: user.office.allowedIps,
            skipWorkDayIpCheck: user.office.skipWorkDayIpCheck,
          }
        : null,
    };
  }

  async startWorkDay(userId: string, role: UserRole, dto: StartWorkDayDto, meta: RequestMeta) {
    await this.runAutoCloseSweep();
    const settings = await this.getSettings();
    const user = await this.getUserWithOffice(userId);
    if (!(await this.isUserTracked(user))) {
      throw new ForbiddenException('Учёт рабочего дня для вас не включён.');
    }

    const dayOfWeek = getDayOfWeekInTimezone();
    const todaySchedule = resolveDaySchedule(user, user.office, settings, dayOfWeek);
    const today = getTodayDateInTimezone();
    if (!todaySchedule.isWorkDay || (await this.workDayRequests.hasApprovedDayOff(userId, today))) {
      throw new BadRequestException('Сегодня нерабочий день по вашему графику.');
    }

    const openPrevious = await this.prisma.workDay.findFirst({
      where: { userId, status: WorkDayStatus.OPEN, workDate: { lt: today } },
    });
    if (openPrevious) {
      throw new BadRequestException({
        message: 'Сначала укажите время ухода за предыдущий рабочий день.',
        code: 'FORGOTTEN_CLOSE_REQUIRED',
        workDayId: openPrevious.id,
        workDate: openPrevious.workDate,
      });
    }

    const existing = await this.prisma.workDay.findUnique({
      where: { userId_workDate: { userId, workDate: today } },
    });
    if (existing && existing.status !== WorkDayStatus.OPEN) {
      throw new BadRequestException('Рабочий день на сегодня уже завершён.');
    }
    if (existing?.status === WorkDayStatus.OPEN) {
      throw new BadRequestException('Рабочий день уже начат.');
    }

    const officeId = dto.officeId?.trim() || user.officeId;
    const office = officeId
      ? await this.prisma.office.findUnique({ where: { id: officeId } })
      : user.office;
    if (!office) {
      throw new BadRequestException('Выберите офис для начала рабочего дня.');
    }
    if (!office.isActive) {
      throw new BadRequestException('Выбранный офис неактивен.');
    }

    await this.validateStartAccess(user, settings, meta, office);

    const now = new Date();
    const { ip, userAgent } = this.getClientMeta(meta);
    const lateArrivalApproved = await this.workDayRequests.hasApprovedLateArrival(userId, today);
    const lateMinutes = lateArrivalApproved ? 0 : calculateLateMinutes(now, today, todaySchedule);

    const workDay = await this.prisma.workDay.create({
      data: {
        userId,
        officeId: office.id,
        workDate: today,
        status: WorkDayStatus.OPEN,
        startedAt: now,
        startedFromIp: ip,
        startedFromUserAgent: userAgent ?? null,
        lateMinutes,
      },
      include: WORK_DAY_RECORD_INCLUDE,
    });
    this.workDayNotify.onWorkDayStarted(workDay.id, lateMinutes);

    return {
      workDay,
      greeting: pickRandomGreeting(settings.greetingMessages, user.firstName, user.lastName),
    };
  }

  async endWorkDay(userId: string, role: UserRole, meta: RequestMeta) {
    const settings = await this.getSettings();
    const user = await this.getUserWithOffice(userId);
    const today = getTodayDateInTimezone();
    const day = await this.prisma.workDay.findUnique({
      where: { userId_workDate: { userId, workDate: today } },
    });
    if (!day || day.status !== WorkDayStatus.OPEN) {
      throw new BadRequestException('Нет открытого рабочего дня для завершения.');
    }

    const openAbsence = await this.prisma.workDayAbsence.findFirst({
      where: { workDayId: day.id, endedAt: null },
    });
    if (openAbsence) {
      throw new BadRequestException('Сначала отметьте возвращение из отсутствия.');
    }

    const dayOfWeek = getDayOfWeekInTimezone(WORK_DAY_TIMEZONE, today);
    const todaySchedule = resolveDaySchedule(user, user.office, settings, dayOfWeek);
    const now = new Date();
    const { ip } = this.getClientMeta(meta);
    return this.closeWorkDayRecord(day, {
      endedAt: now,
      closeReason: WorkDayCloseReason.MANUAL,
      status: WorkDayStatus.CLOSED,
      endedFromIp: ip,
      schedule: todaySchedule,
    });
  }

  async startAbsence(userId: string, dto: StartAbsenceDto) {
    const today = getTodayDateInTimezone();
    const day = await this.prisma.workDay.findUnique({
      where: { userId_workDate: { userId, workDate: today } },
    });
    if (!day || day.status !== WorkDayStatus.OPEN) {
      throw new BadRequestException('Сначала начните рабочий день.');
    }
    const openAbsence = await this.prisma.workDayAbsence.findFirst({
      where: { workDayId: day.id, endedAt: null },
    });
    if (openAbsence) {
      throw new BadRequestException('Уже есть незавершённое отсутствие.');
    }
    return this.prisma.workDayAbsence.create({
      data: {
        workDayId: day.id,
        startedAt: new Date(),
        reason: dto.reason?.trim() || null,
        comment: dto.comment?.trim() || null,
      },
    });
  }

  async endAbsence(userId: string) {
    const today = getTodayDateInTimezone();
    const day = await this.prisma.workDay.findUnique({
      where: { userId_workDate: { userId, workDate: today } },
    });
    if (!day || day.status !== WorkDayStatus.OPEN) {
      throw new BadRequestException('Нет активного рабочего дня.');
    }
    const openAbsence = await this.prisma.workDayAbsence.findFirst({
      where: { workDayId: day.id, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!openAbsence) {
      throw new BadRequestException('Нет активного отсутствия.');
    }
    return this.prisma.workDayAbsence.update({
      where: { id: openAbsence.id },
      data: { endedAt: new Date() },
    });
  }

  async closeForgottenWorkDay(userId: string, dto: CloseForgottenWorkDayDto) {
    const day = await this.prisma.workDay.findFirst({
      where: { id: dto.workDayId, userId, status: WorkDayStatus.OPEN },
      include: { user: { include: { office: true } } },
    });
    if (!day) {
      throw new NotFoundException('Незакрытый рабочий день не найден.');
    }

    const settings = await this.getSettings();
    const dayOfWeek = getDayOfWeekInTimezone(WORK_DAY_TIMEZONE, day.workDate);
    const schedule = resolveDaySchedule(day.user, day.user.office, settings, dayOfWeek);
    const reportedEndAt = combineDateAndTime(day.workDate, dto.reportedEndTime);

    if (reportedEndAt <= day.startedAt) {
      throw new BadRequestException('Время ухода должно быть позже времени начала рабочего дня.');
    }

    return this.closeWorkDayRecord(day, {
      endedAt: reportedEndAt,
      closeReason: WorkDayCloseReason.REPORTED_NEXT_DAY,
      status: WorkDayStatus.CLOSED,
      reportedEndAt,
      schedule,
    });
  }

  async listMyWorkDays(userId: string, params: { dateFrom?: string; dateTo?: string }) {
    const records = await this.listWorkDays({ ...params, userId });
    const lateDays = records.filter((r) => r.lateMinutes > 0).length;
    const earlyLeaveDays = records.filter((r) => r.earlyLeaveMinutes > 0).length;
    const autoClosedDays = records.filter((r) => r.status === WorkDayStatus.AUTO_CLOSED).length;
    const totalAbsenceMinutes = records.reduce((sum, row) => {
      const now = Date.now();
      const dayAbsence = row.absences.reduce((s, a) => {
        const end = a.endedAt ? a.endedAt.getTime() : now;
        return s + (end - a.startedAt.getTime()) / 60_000;
      }, 0);
      return sum + dayAbsence;
    }, 0);

    return {
      records,
      summary: {
        totalDays: records.length,
        lateDays,
        earlyLeaveDays,
        autoClosedDays,
        totalAbsenceMinutes: Math.round(totalAbsenceMinutes),
      },
    };
  }

  async listWorkDays(params: {
    dateFrom?: string;
    dateTo?: string;
    officeId?: string;
    userId?: string;
  }) {
    const where: {
      workDate?: { gte?: Date; lte?: Date };
      officeId?: string;
      userId?: string;
    } = {};
    if (params.dateFrom) where.workDate = { ...where.workDate, gte: new Date(params.dateFrom) };
    if (params.dateTo) where.workDate = { ...where.workDate, lte: new Date(params.dateTo) };
    if (params.officeId) where.officeId = params.officeId;
    if (params.userId) where.userId = params.userId;

    return this.prisma.workDay.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        office: { select: { id: true, name: true } },
        absences: { orderBy: { startedAt: 'asc' } },
      },
      orderBy: [{ workDate: 'desc' }, { startedAt: 'desc' }],
    });
  }

  async deleteWorkDay(workDayId: string) {
    const existing = await this.prisma.workDay.findUnique({
      where: { id: workDayId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Запись рабочего дня не найдена');
    }
    await this.prisma.workDay.delete({ where: { id: workDayId } });
    return { id: workDayId };
  }

  async updateUserWorkSchedule(userId: string, dto: UpdateUserWorkScheduleDto) {
    await this.getUserWithOffice(userId);
    const data: Record<string, unknown> = {};
    if (dto.officeId !== undefined) data.officeId = dto.officeId;
    if (dto.workDayTrackingEnabled !== undefined) {
      data.workDayTrackingEnabled = dto.workDayTrackingEnabled;
    }
    if (dto.useCustomWorkSchedule !== undefined)
      data.useCustomWorkSchedule = dto.useCustomWorkSchedule;
    if (dto.workDayStartTime !== undefined) data.workDayStartTime = dto.workDayStartTime;
    if (dto.workDayEndTime !== undefined) data.workDayEndTime = dto.workDayEndTime;
    if (dto.workDaysOfWeek !== undefined) data.workDaysOfWeek = dto.workDaysOfWeek;
    if (dto.gracePeriodMinutes !== undefined) data.gracePeriodMinutes = dto.gracePeriodMinutes;
    if (dto.workDayWeeklySchedule !== undefined) {
      data.workDayWeeklySchedule = dto.workDayWeeklySchedule;
      Object.assign(
        data,
        legacyFieldsFromWeeklySchedule(dto.workDayWeeklySchedule as WeeklySchedule),
      );
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_WORK_SCHEDULE_SELECT,
    });
  }

  async listTrackedUsers() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ADMIN_ROLES.filter((r) => r !== UserRole.SUPER_ADMIN) },
      },
      select: USER_WORK_SCHEDULE_SELECT,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }
}
