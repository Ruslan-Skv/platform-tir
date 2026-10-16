import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Статус ведомости (производный от статусов строк). */
export const INSTALLER_ADVANCE_SHEET_STATUSES = ['PENDING', 'QUESTION', 'PAID'] as const;

export type InstallerAdvanceSheetStatusFilter = (typeof INSTALLER_ADVANCE_SHEET_STATUSES)[number];

export class QueryInstallerAdvanceSheetsDto {
  /** PENDING — есть невыплатанные строки; QUESTION — есть вопросы; PAID — всё выдано. */
  @IsOptional()
  @IsIn(INSTALLER_ADVANCE_SHEET_STATUSES)
  status?: InstallerAdvanceSheetStatusFilter;

  /** Мастер из справочника «Мастера (монтажники)». */
  @IsOptional()
  @IsString()
  installerId?: string;

  /** Период по дате создания ведомости. */
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  /** Поиск: № ведомости, мастер, № договора, заказчик. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
