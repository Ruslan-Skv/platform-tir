import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NavigationService } from './navigation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateNavigationItemDto } from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto } from './dto/update-navigation-item.dto';
import { ReorderDto } from './dto/reorder.dto';
import { CreateDropdownItemDto } from './dto/create-dropdown-item.dto';
import { UpdateDropdownItemDto } from './dto/update-dropdown-item.dto';
import { CreateSubItemDto } from './dto/create-sub-item.dto';
import { UpdateSubItemDto } from './dto/update-sub-item.dto';

@ApiTags('navigation')
@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  @Header('Cache-Control', 'no-store, max-age=0')
  @ApiOperation({ summary: 'Получить активные пункты меню (публичный)' })
  getItems() {
    return this.navigationService.getActiveItems();
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
      isActive: dto.isActive,
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
      isActive: dto.isActive,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить кнопку меню' })
  deleteItem(@Param('id') id: string) {
    return this.navigationService.deleteItem(id);
  }

  // --- Пункты выпадающего меню (для пункта навигации :navId) ---

  @Post(':navId/dropdown-items')
  @ApiOperation({ summary: 'Добавить пункт выпадающего меню' })
  createDropdownItem(@Param('navId') navId: string, @Body() dto: CreateDropdownItemDto) {
    return this.navigationService.createDropdownItem(navId, {
      name: dto.name,
      href: dto.href ?? '#',
      icon: dto.icon,
    });
  }

  // Подпункты — более специфичные маршруты объявлены первыми
  @Post('dropdown-items/:dropdownId/sub-items')
  @ApiOperation({ summary: 'Добавить подпункт' })
  createSubItem(@Param('dropdownId') dropdownId: string, @Body() dto: CreateSubItemDto) {
    return this.navigationService.createSubItem(dropdownId, {
      name: dto.name,
      href: dto.href ?? '#',
    });
  }

  @Patch('dropdown-items/sub-items/:id')
  @ApiOperation({ summary: 'Редактировать подпункт' })
  updateSubItem(@Param('id') id: string, @Body() dto: UpdateSubItemDto) {
    return this.navigationService.updateSubItem(id, {
      name: dto.name,
      href: dto.href,
    });
  }

  @Delete('dropdown-items/sub-items/:id')
  @ApiOperation({ summary: 'Удалить подпункт' })
  deleteSubItem(@Param('id') id: string) {
    return this.navigationService.deleteSubItem(id);
  }

  @Patch('dropdown-items/:dropdownId/sub-items/reorder')
  @ApiOperation({ summary: 'Изменить порядок подпунктов' })
  reorderSubItems(@Param('dropdownId') dropdownId: string, @Body() dto: ReorderDto) {
    return this.navigationService.reorderSubItems(dropdownId, dto.ids);
  }

  @Patch('dropdown-items/:id')
  @ApiOperation({ summary: 'Редактировать пункт выпадающего меню' })
  updateDropdownItem(@Param('id') id: string, @Body() dto: UpdateDropdownItemDto) {
    return this.navigationService.updateDropdownItem(id, {
      name: dto.name,
      href: dto.href,
      icon: dto.icon,
    });
  }

  @Delete('dropdown-items/:id')
  @ApiOperation({ summary: 'Удалить пункт выпадающего меню' })
  deleteDropdownItem(@Param('id') id: string) {
    return this.navigationService.deleteDropdownItem(id);
  }

  @Patch(':navId/dropdown-items/reorder')
  @ApiOperation({ summary: 'Изменить порядок пунктов выпадающего меню' })
  reorderDropdownItems(@Param('navId') navId: string, @Body() dto: ReorderDto) {
    return this.navigationService.reorderDropdownItems(navId, dto.ids);
  }
}
