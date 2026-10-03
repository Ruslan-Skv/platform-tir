import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetAdminNoteDto {
  /** Текст примечания; пустая строка удаляет примечание. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  /** Отметить примечание решённым (снимает заливку строки цветом). */
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}
