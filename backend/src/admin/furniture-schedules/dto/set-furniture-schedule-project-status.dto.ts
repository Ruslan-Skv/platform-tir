import { ApiProperty } from '@nestjs/swagger';
import { FurnitureScheduleProjectStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SetFurnitureScheduleProjectStatusDto {
  @ApiProperty({ enum: FurnitureScheduleProjectStatus })
  @IsEnum(FurnitureScheduleProjectStatus)
  status: FurnitureScheduleProjectStatus;
}
