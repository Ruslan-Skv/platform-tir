import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { WindowsService } from './windows.service';
import { CreateWindowBrandDto } from './dto/create-window-brand.dto';
import { UpdateWindowBrandDto } from './dto/update-window-brand.dto';
import { CreateWindowSystemDto } from './dto/create-window-system.dto';
import { UpdateWindowSystemDto } from './dto/update-window-system.dto';
import { UpdateWindowsSettingsDto } from './dto/update-windows-settings.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Request } from 'express';

const uploadDir = path.join(process.cwd(), 'uploads', 'windows');

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `temp-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

@ApiTags('admin/windows')
@Controller('admin/windows')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
@ApiBearerAuth()
export class WindowsController {
  constructor(private readonly windowsService: WindowsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpe?g|png|webp|gif)$/i.test(file.originalname);
        if (!allowed) {
          cb(new BadRequestException('Допустимы только изображения: jpg, png, webp, gif'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: 'Загрузить изображение для раздела «Окна»' })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.windowsService.uploadImage(file, baseUrl);
  }

  // ===== Бренды =====

  @Get('brands')
  @ApiOperation({ summary: 'Список брендов окон' })
  findBrands() {
    return this.windowsService.findBrands();
  }

  @Get('brands/:id')
  @ApiOperation({ summary: 'Бренд по ID' })
  findBrand(@Param('id') id: string) {
    return this.windowsService.findBrand(id);
  }

  @Post('brands')
  @ApiOperation({ summary: 'Создать бренд' })
  createBrand(@Body() dto: CreateWindowBrandDto) {
    return this.windowsService.createBrand(dto);
  }

  @Patch('brands/:id')
  @ApiOperation({ summary: 'Обновить бренд' })
  updateBrand(@Param('id') id: string, @Body() dto: UpdateWindowBrandDto) {
    return this.windowsService.updateBrand(id, dto);
  }

  @Delete('brands/:id')
  @ApiOperation({ summary: 'Удалить бренд (вместе с профильными системами)' })
  removeBrand(@Param('id') id: string) {
    return this.windowsService.removeBrand(id);
  }

  // ===== Профильные системы =====

  @Get('systems')
  @ApiOperation({ summary: 'Список профильных систем (опционально по бренду)' })
  findSystems(@Query('brandId') brandId?: string) {
    return this.windowsService.findSystems(brandId);
  }

  @Get('systems/:id')
  @ApiOperation({ summary: 'Профильная система по ID' })
  findSystem(@Param('id') id: string) {
    return this.windowsService.findSystem(id);
  }

  @Post('systems')
  @ApiOperation({ summary: 'Создать профильную систему' })
  createSystem(@Body() dto: CreateWindowSystemDto) {
    return this.windowsService.createSystem(dto);
  }

  @Patch('systems/:id')
  @ApiOperation({ summary: 'Обновить профильную систему' })
  updateSystem(@Param('id') id: string, @Body() dto: UpdateWindowSystemDto) {
    return this.windowsService.updateSystem(id, dto);
  }

  @Delete('systems/:id')
  @ApiOperation({ summary: 'Удалить профильную систему' })
  removeSystem(@Param('id') id: string) {
    return this.windowsService.removeSystem(id);
  }

  // ===== Настройки раздела =====

  @Get('settings')
  @ApiOperation({ summary: 'Настройки раздела «Окна»' })
  getSettings() {
    return this.windowsService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки раздела «Окна»' })
  updateSettings(@Body() dto: UpdateWindowsSettingsDto) {
    return this.windowsService.updateSettings(dto);
  }
}
