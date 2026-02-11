import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAccessService } from './admin-access.service';
import { SetPermissionDto, AdminResourcePermissionLevel } from './dto/set-permission.dto';

@Controller('admin/access')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
@ApiTags('Admin access')
export class AdminAccessController {
  constructor(private readonly service: AdminAccessService) {}

  @Get('users')
  @ApiOperation({ summary: 'Список пользователей админки для назначения доступа' })
  getAdminUsers() {
    return this.service.getAdminUsers();
  }

  @Get('resources')
  @ApiOperation({ summary: 'Список ресурсов админки для управления доступом' })
  getResources() {
    return this.service.getResources();
  }

  @Get('resources/:resourceId/permissions')
  @ApiOperation({ summary: 'Кто имеет доступ к ресурсу' })
  getPermissions(@Param('resourceId') resourceId: string) {
    return this.service.getPermissions(resourceId);
  }

  @Post('resources/:resourceId/permissions')
  @ApiOperation({ summary: 'Выдать или изменить доступ пользователю' })
  setPermission(@Param('resourceId') resourceId: string, @Body() dto: SetPermissionDto) {
    return this.service.setPermission(
      resourceId,
      dto.userId,
      dto.permission as AdminResourcePermissionLevel,
    );
  }

  @Delete('resources/:resourceId/permissions/:userId')
  @ApiOperation({ summary: 'Удалить доступ пользователя к ресурсу' })
  revokePermission(@Param('resourceId') resourceId: string, @Param('userId') userId: string) {
    return this.service.revokePermission(resourceId, userId);
  }
}
