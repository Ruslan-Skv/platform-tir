import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { PACKAGE_DIRECTION_REGISTRY } from '../../../common/config/package-direction-registry.config';

/** Направления раздела — как в журнале ДП. */
const DIRECTION_NAMES = PACKAGE_DIRECTION_REGISTRY.map((d) => d.name);

export class QueryInstallerSettlementsDto {
  /** Мастер из справочника «Мастера (монтажники)». */
  @IsOptional()
  @IsString()
  installerId?: string;

  /** Направление (имя из реестра направлений: Ремонт, Окна, …). */
  @IsOptional()
  @IsIn(DIRECTION_NAMES)
  direction?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  /** Поиск: № договора, заказчик, мастер, комментарий аванса. */
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
