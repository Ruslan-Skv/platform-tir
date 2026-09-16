import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AdminBellNotificationHistoryItemDto {
  @IsString()
  @MaxLength(200)
  key!: string;

  @IsString()
  @MaxLength(100)
  type!: string;

  @IsString()
  @MaxLength(1000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  link?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class SaveAdminBellNotificationHistoryDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @Type(() => AdminBellNotificationHistoryItemDto)
  items!: AdminBellNotificationHistoryItemDto[];
}
