import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

import { InstallerAdvancePaymentMethodDto } from '../../contract-document-packages/dto/payments/payment.enums';

/** Отметка выплаты строки/ведомости: дата и способ выдачи денег мастеру. */
export class PayInstallerAdvanceSheetDto {
  @ApiProperty({ description: 'Дата выдачи аванса' })
  @IsDateString()
  paidAt: string;

  @ApiPropertyOptional({
    enum: InstallerAdvancePaymentMethodDto,
    description: 'Способ оплаты: CASH — наличные, BANK — банк',
  })
  @IsOptional()
  @IsEnum(InstallerAdvancePaymentMethodDto)
  paymentMethod?: InstallerAdvancePaymentMethodDto;
}
