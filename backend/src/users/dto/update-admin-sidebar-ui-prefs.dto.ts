import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateAdminSidebarUiPrefsDto {
  @ApiPropertyOptional({ description: 'Скрыть эмодзи-иконки пунктов админ-сайдбара' })
  @IsOptional()
  @IsBoolean()
  hideIcons?: boolean;

  @ApiPropertyOptional({
    description: 'Вид мобильного админ-меню',
    enum: ['list', 'grid3'],
  })
  @IsOptional()
  @IsIn(['list', 'grid3'])
  mobileLayout?: 'list' | 'grid3';

  @ApiPropertyOptional({
    description: 'Вид десктопного админ-меню',
    enum: ['list', 'grid2'],
  })
  @IsOptional()
  @IsIn(['list', 'grid2'])
  desktopLayout?: 'list' | 'grid2';

  @ApiPropertyOptional({
    description: 'Порядок разделов админ-сайдбара (href верхнего уровня); [] — по умолчанию',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  navOrder?: string[];

  @ApiPropertyOptional({
    description: 'Вариант логотипа админки (шрифт подписи «Виртуальный офис»)',
    enum: ['classic', 'mission'],
  })
  @IsOptional()
  @IsIn(['classic', 'mission'])
  logoVariant?: 'classic' | 'mission';
}
