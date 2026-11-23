import { IsString, IsOptional, MinLength, IsBoolean, IsInt, IsArray } from 'class-validator';

/** Дополнительная характеристика изделия («название — значение»). */
export class ProductCharacteristicItemDto {
  @IsString()
  @MinLength(1, { message: 'Название характеристики обязательно' })
  label: string;

  @IsString()
  value: string;
}

export class CreateFurnitureProductDto {
  @IsString()
  categoryId: string;

  @IsString()
  @MinLength(1, { message: 'Название изделия обязательно' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Slug обязателен' })
  slug: string;

  @IsString()
  @IsOptional()
  tagline?: string;

  @IsString()
  @MinLength(1, { message: 'Описание обязательно' })
  description: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  /** Видео об изделии (Rutube/YouTube/VK или прямой файл) */
  @IsString()
  @IsOptional()
  videoUrl?: string;

  /** Конфигурация: «Прямая», «Угловая», «П-образная», «Встроенная», «Корпусная» */
  @IsString()
  @IsOptional()
  configuration?: string;

  /** Материал фасадов: «ЛДСП Egger», «МДФ в плёнке ПВХ», «МДФ эмаль», «Шпон» */
  @IsString()
  @IsOptional()
  facadeMaterial?: string;

  /** Фурнитура: «Blum», «Hettich», «Boyard», «GTV» */
  @IsString()
  @IsOptional()
  hardware?: string;

  @IsArray()
  @IsOptional()
  characteristics?: ProductCharacteristicItemDto[];

  @IsArray()
  @IsOptional()
  advantages?: string[];

  /** Цена «от», ₽ */
  @IsInt()
  @IsOptional()
  priceFrom?: number;

  /** Единица цены: «пог. м» (кухни), «м²», пусто — за изделие целиком */
  @IsString()
  @IsOptional()
  priceUnit?: string;

  @IsString()
  @IsOptional()
  badge?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
