import { ApiProperty } from '@nestjs/swagger';
import { RepairScheduleProjectStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SetRepairScheduleProjectStatusDto {
  @ApiProperty({ enum: RepairScheduleProjectStatus })
  @IsEnum(RepairScheduleProjectStatus)
  status: RepairScheduleProjectStatus;
}
