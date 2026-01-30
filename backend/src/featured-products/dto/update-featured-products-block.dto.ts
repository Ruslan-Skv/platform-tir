import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const PRIMARY_FILTERS = ['featured', 'new', 'featured_or_new', 'any'] as const;
const SECONDARY_ORDERS = ['sort_order', 'created_desc'] as const;

export class UpdateFeaturedProductsBlockDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;

  @ApiProperty({
    required: false,
    enum: PRIMARY_FILTERS,
    description: 'Показывать первыми: featured (Хит), new (Новинка), featured_or_new, any',
  })
  @IsOptional()
  @IsString()
  @IsIn(PRIMARY_FILTERS)
  primaryFilter?: (typeof PRIMARY_FILTERS)[number];

  @ApiProperty({
    required: false,
    enum: SECONDARY_ORDERS,
    description: 'Сортировка остальных: sort_order (по порядку), created_desc (по дате)',
  })
  @IsOptional()
  @IsString()
  @IsIn(SECONDARY_ORDERS)
  secondaryOrder?: (typeof SECONDARY_ORDERS)[number];
}
