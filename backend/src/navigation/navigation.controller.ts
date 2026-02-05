import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NavigationService } from './navigation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateNavigationItemDto } from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto } from './dto/update-navigation-item.dto';
import { ReorderDto } from './dto/reorder.dto';

@ApiTags('navigation')
@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  @ApiOperation({ summary: 'Получить пункты меню навигации (публичный)' })
  getItems() {
    return this.navigationService.getItems();
  }
}

@ApiTags('admin/navigation')
@Controller('admin/navigation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminNavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  @ApiOperation({ summary: 'Получить пункты меню (админ)' })
  getItems() {
    return this.navigationService.getItems();
  }

  @Post()
  @ApiOperation({ summary: 'Добавить кнопку меню' })
  createItem(@Body() dto: CreateNavigationItemDto) {
    return this.navigationService.createItem({
      name: dto.name,
      href: dto.href ?? '#',
      hasDropdown: dto.hasDropdown,
      category: dto.category,
    });
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Изменить порядок кнопок' })
  reorder(@Body() dto: ReorderDto) {
    return this.navigationService.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Редактировать кнопку меню' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateNavigationItemDto) {
    return this.navigationService.updateItem(id, {
      name: dto.name,
      href: dto.href,
      hasDropdown: dto.hasDropdown,
      category: dto.category,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить кнопку меню' })
  deleteItem(@Param('id') id: string) {
    return this.navigationService.deleteItem(id);
  }
}
