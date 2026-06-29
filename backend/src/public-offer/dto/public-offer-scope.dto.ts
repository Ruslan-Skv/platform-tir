import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PUBLIC_OFFER_SCOPE_TYPES } from '../public-offer.types';

export class PublicOfferScopeDto {
  @ApiProperty({ enum: PUBLIC_OFFER_SCOPE_TYPES })
  @IsString()
  @IsIn(PUBLIC_OFFER_SCOPE_TYPES)
  scopeType!: (typeof PUBLIC_OFFER_SCOPE_TYPES)[number];

  @ApiPropertyOptional({ description: 'ID категории товаров или услуг' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  scopeId?: string | null;
}
