import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { CreateContractDocumentPackageInstallerAdvanceDto } from '../../contract-document-packages/dto/payments/create-contract-document-package-installer-advance.dto';

/**
 * Выдача аванса мастеру прямо из раздела «Расчёт мастеров» — та же запись, что
 * в модалке «Заказ-наряды» договора (таблица installer advances), создаёт супер-админ.
 */
export class CreateInstallerSettlementAdvanceDto extends CreateContractDocumentPackageInstallerAdvanceDto {
  @ApiProperty({ description: 'Договор (пакет документов), по которому выдан аванс' })
  @IsString()
  packageId: string;
}
