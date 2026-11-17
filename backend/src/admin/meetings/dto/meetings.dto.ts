import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Запланированное начало (ISO 8601). Не задано — собрание «прямо сейчас». */
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  /** Приглашённые участники (без автора — автор добавляется автоматически). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  participantIds?: string[];
}

export class UpdateMeetingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  participantIds?: string[];
}

export class ListMeetingsDto {
  /** upcoming — запланированные и идущие, past — завершённые и отменённые. */
  @IsOptional()
  @IsIn(['upcoming', 'past'])
  scope?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6)
  limit?: string;
}
