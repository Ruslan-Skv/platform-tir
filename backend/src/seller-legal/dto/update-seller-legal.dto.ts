import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSellerLegalDto {
  @ApiPropertyOptional({ description: 'Заголовок публичной страницы' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pageTitle?: string;

  @ApiPropertyOptional({ description: 'Полное наименование продавца' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  legalName?: string;

  @ApiPropertyOptional({ description: 'Тип организации: IP (ИП) или UL (юрлицо)' })
  @IsOptional()
  @IsIn(['IP', 'UL'])
  entityType?: 'IP' | 'UL';

  @ApiPropertyOptional({ description: 'ИНН' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  inn?: string;

  @ApiPropertyOptional({ description: 'ОГРН или ОГРНИП' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ogrn?: string;

  @ApiPropertyOptional({ description: 'Юридический адрес' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  legalAddress?: string;

  @ApiPropertyOptional({ description: 'Контактный телефон' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Контактный e-mail' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ description: 'Показывать страницу на сайте' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
