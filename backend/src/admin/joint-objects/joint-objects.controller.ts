import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JointObjectsService } from './joint-objects.service';

const HUB_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
] as const;

@Controller('admin/joint-objects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...HUB_ROLES)
export class JointObjectsController {
  constructor(private readonly service: JointObjectsService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('includeClosed') includeClosed?: string,
    @Query('installFrom') installFrom?: string,
    @Query('installTo') installTo?: string,
    @Query('waybillFrom') waybillFrom?: string,
    @Query('waybillTo') waybillTo?: string,
  ) {
    return this.service.list({
      search,
      includeClosed: includeClosed === '1' || includeClosed === 'true',
      installFrom,
      installTo,
      waybillFrom,
      waybillTo,
    });
  }
}
