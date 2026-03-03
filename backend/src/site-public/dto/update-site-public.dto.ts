import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateSitePublicDto {
  @ApiPropertyOptional({
    description: 'Роли, которым показывать кнопку «Админка» на публичке. null = по умолчанию.',
    example: ['SUPER_ADMIN', 'ADMIN'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rolesShowAdminLink?: string[] | null;
}
