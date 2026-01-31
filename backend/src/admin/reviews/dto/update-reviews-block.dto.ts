import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateReviewsBlockDto {
  @ApiPropertyOptional({ description: 'Включить отзывы и оценки' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Показывать рейтинг на карточках товаров' })
  @IsOptional()
  @IsBoolean()
  showOnCards?: boolean;

  @ApiPropertyOptional({ description: 'Только покупатели могут оставлять отзывы' })
  @IsOptional()
  @IsBoolean()
  requirePurchase?: boolean;

  @ApiPropertyOptional({ description: 'Разрешить гостям оставлять отзывы' })
  @IsOptional()
  @IsBoolean()
  allowGuestReviews?: boolean;

  @ApiPropertyOptional({ description: 'Требовать модерацию перед публикацией' })
  @IsOptional()
  @IsBoolean()
  requireModeration?: boolean;
}
