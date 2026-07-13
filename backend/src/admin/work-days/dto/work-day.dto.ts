import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateWorkDaySettingsDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  trackedRoles?: UserRole[];

  @IsOptional()
  @IsBoolean()
  blockAdminWithoutWorkDay?: boolean;

  @IsOptional()
  @IsBoolean()
  requireOfficeIp?: boolean;

  @IsOptional()
  @IsBoolean()
  blockMobileDevices?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  autoCloseHour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  autoCloseMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  defaultGracePeriodMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  greetingMessages?: string[];
}

export class UpdateUserWorkScheduleDto {
  @IsOptional()
  @IsString()
  officeId?: string | null;

  @IsOptional()
  @IsBoolean()
  workDayTrackingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  useCustomWorkSchedule?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  workDayStartTime?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  workDayEndTime?: string | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  workDaysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  gracePeriodMinutes?: number | null;

  @IsOptional()
  @IsObject()
  workDayWeeklySchedule?: Record<string, unknown>;
}

export class UpdateOfficeWorkScheduleDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  workDayStartTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  workDayEndTime?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  workDaysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  gracePeriodMinutes?: number;

  @IsOptional()
  @IsObject()
  workDayWeeklySchedule?: Record<string, unknown>;
}

export class StartWorkDayDto {
  @IsOptional()
  @IsString()
  officeId?: string;
}

export class StartAbsenceDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CloseForgottenWorkDayDto {
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  reportedEndTime: string;

  @IsString()
  workDayId: string;
}
