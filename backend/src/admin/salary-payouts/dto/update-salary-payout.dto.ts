import { PartialType } from '@nestjs/mapped-types';

import { CreateSalaryPayoutDto } from './create-salary-payout.dto';

/** Правка выплаты — только супер-админ; незаполненные поля не меняются. */
export class UpdateSalaryPayoutDto extends PartialType(CreateSalaryPayoutDto) {}
