import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

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
}
