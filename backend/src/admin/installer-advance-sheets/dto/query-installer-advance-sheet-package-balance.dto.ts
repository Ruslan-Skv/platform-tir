import { IsString } from 'class-validator';

/** Остаток з/п мастера по договору для формы ведомости. */
export class QueryInstallerAdvanceSheetPackageBalanceDto {
  @IsString()
  packageId: string;

  @IsString()
  installerId: string;
}
