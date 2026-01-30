import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePartnerProductsBlockDto {
  @ApiProperty({ required: false, description: 'URL логотипа партнёра' })
  @IsOptional()
  @IsString()
  partnerLogoUrl?: string;

  @ApiProperty({ required: false, description: 'Показывать иконку партнёра на карточках товаров' })
  @IsOptional()
  @IsBoolean()
  showPartnerIconOnCards?: boolean;
}
