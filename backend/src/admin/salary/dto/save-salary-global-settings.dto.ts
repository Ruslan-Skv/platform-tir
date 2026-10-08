import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SaveSalaryGlobalSettingsDto {
  /** Налог, удерживаемый из фондов, % */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercent?: number;

  /** Пользователь-бригадир (получатель бригадирского фонда); '' / null — не назначен. */
  @IsOptional()
  @IsString()
  brigadierUserId?: string | null;
}
