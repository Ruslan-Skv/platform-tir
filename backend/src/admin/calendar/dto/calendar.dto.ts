import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCalendarCustomEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string | null;

  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  timeFrom?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  timeTo?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  notifyUserIds?: string[];
}
