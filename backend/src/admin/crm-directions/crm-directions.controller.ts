import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CrmDirectionsService } from './crm-directions.service';
import { CreateCrmDirectionDto } from './dto/create-crm-direction.dto';
import { UpdateCrmDirectionDto } from './dto/update-crm-direction.dto';
import { UpdateUserCrmDirectionsDto } from './dto/update-user-crm-directions.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/types/request-with-user.types';

const CRM_ROLES = [
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
  'DRIVER',
  'INSTALLER',
] as const;

const USER_DIRECTIONS_ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']);

@Controller('admin/crm-directions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class CrmDirectionsController {
  constructor(private readonly crmDirectionsService: CrmDirectionsService) {}

  @Post()
  create(@Body() createCrmDirectionDto: CreateCrmDirectionDto) {
    return this.crmDirectionsService.create(createCrmDirectionDto);
  }

  @Get()
  findAll() {
    return this.crmDirectionsService.findAll();
  }

  @Get('users/list')
  getCrmUsers() {
    return this.crmDirectionsService.getCrmUsers();
  }

  @Get('users/me/directions')
  async getMyDirections(@Request() req: RequestWithUser) {
    const directionIds = await this.crmDirectionsService.getUserDirectionIds(req.user.id);
    return { directionIds };
  }

  @Get('users/:userId/directions')
  async getUserDirections(@Param('userId') userId: string) {
    const directionIds = await this.crmDirectionsService.getUserDirectionIds(userId);
    return { directionIds };
  }

  @Put('users/:userId/directions')
  async setUserDirections(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserCrmDirectionsDto,
    @Request() req: RequestWithUser,
  ) {
    const canEditOthers = USER_DIRECTIONS_ADMIN_ROLES.has(req.user.role);
    if (userId !== req.user.id && !canEditOthers) {
      throw new ForbiddenException(
        'Недостаточно прав для изменения направлений другого пользователя',
      );
    }
    const directionIds = await this.crmDirectionsService.setUserDirectionIds(
      userId,
      dto.directionIds,
    );
    return { directionIds };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crmDirectionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCrmDirectionDto: UpdateCrmDirectionDto) {
    return this.crmDirectionsService.update(id, updateCrmDirectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmDirectionsService.remove(id);
  }
}
