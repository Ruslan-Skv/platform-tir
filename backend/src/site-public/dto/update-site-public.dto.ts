import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';

export class RolesShowAdminLinkByDeviceDto {
  @ApiPropertyOptional({
    description:
      'Роли для кнопки «Админка» в шапке (десктоп, ширина > 768px). null = набор по умолчанию сервера.',
    type: [String],
    nullable: true,
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsArray()
  @IsString({ each: true })
  desktop?: string[] | null;

  @ApiPropertyOptional({
    description:
      'Роли для кнопки в нижней мобильной навигации (≤768px). null = набор по умолчанию сервера.',
    type: [String],
    nullable: true,
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsArray()
  @IsString({ each: true })
  mobile?: string[] | null;
}

export class UpdateSitePublicDto {
  @ApiPropertyOptional({
    description:
      'Устарело: один список ролей для обоих вариантов отображения. Предпочтительно rolesShowAdminLinkByDevice.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rolesShowAdminLink?: string[] | null;

  @ApiPropertyOptional({
    description:
      'Роли по устройствам. null — сбросить всё (как в БД Json null). Пустой массив для канала — не показывать кнопку ни одной роли на этом устройстве.',
    type: RolesShowAdminLinkByDeviceDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RolesShowAdminLinkByDeviceDto)
  rolesShowAdminLinkByDevice?: RolesShowAdminLinkByDeviceDto | null;
}
