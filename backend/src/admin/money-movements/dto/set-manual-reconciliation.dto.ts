import { IsBoolean } from 'class-validator';

/** Ручная сверка оплаты, не сверяемой с банком (наличные, переводы на ЛК),
 *  супер-админом (золотая печать в журнале ДП). */
export class SetManualReconciliationDto {
  /** true — отметить оплату сверенной, false — снять отметку. */
  @IsBoolean()
  reconciled!: boolean;
}
