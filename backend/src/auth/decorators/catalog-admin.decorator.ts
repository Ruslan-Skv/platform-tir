import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** JWT + любая роль админки (дальше — AdminResourceInterceptor по resourceId). */
export function CatalogAdminAuth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...ADMIN_ROLES),
    ApiBearerAuth(),
  );
}
