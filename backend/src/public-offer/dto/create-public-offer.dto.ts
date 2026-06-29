import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PublicOfferScopeDto } from './public-offer-scope.dto';

export class CreatePublicOfferDto {
  @ApiProperty({ description: 'URL-slug оферты' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug может содержать только латиницу, цифры и дефисы',
  })
  slug!: string;

  @ApiProperty({ description: 'Заголовок страницы оферты' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: 'Краткое название для списков и чекбокса' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ description: 'URL PDF-файла оферты' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  offerUrl?: string | null;

  @ApiPropertyOptional({ description: 'Текст оферты (если без PDF)' })
  @IsOptional()
  @IsString()
  offerContent?: string | null;

  @ApiPropertyOptional({ description: 'Текст чекбокса принятия оферты' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  acceptText?: string;

  @ApiPropertyOptional({ description: 'Показывать оферту на сайте' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Оферта по умолчанию, если нет совпадений по области' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Порядок сортировки' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [PublicOfferScopeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicOfferScopeDto)
  scopes?: PublicOfferScopeDto[];
}
