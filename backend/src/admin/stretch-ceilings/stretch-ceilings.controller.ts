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
import { StretchCeilingsService } from './stretch-ceilings.service';
import { CreateCeilingManufacturerDto } from './dto/create-ceiling-manufacturer.dto';
import { UpdateCeilingManufacturerDto } from './dto/update-ceiling-manufacturer.dto';
import { CreateCeilingFabricDto } from './dto/create-ceiling-fabric.dto';
import { UpdateCeilingFabricDto } from './dto/update-ceiling-fabric.dto';
import { UpdateStretchCeilingsSettingsDto } from './dto/update-stretch-ceilings-settings.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Request } from 'express';

const uploadDir = path.join(process.cwd(), 'uploads', 'stretch-ceilings');

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `temp-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

@ApiTags('admin/stretch-ceilings')
@Controller('admin/stretch-ceilings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
@ApiBearerAuth()
export class StretchCeilingsController {
  constructor(private readonly stretchCeilingsService: StretchCeilingsService) {}

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
  @ApiOperation({ summary: 'Загрузить изображение для раздела «Натяжные потолки»' })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.stretchCeilingsService.uploadImage(file, baseUrl);
  }

  // ===== Производители полотен =====

  @Get('manufacturers')
  @ApiOperation({ summary: 'Список производителей полотен' })
  findManufacturers() {
    return this.stretchCeilingsService.findManufacturers();
  }

  @Get('manufacturers/:id')
  @ApiOperation({ summary: 'Производитель по ID' })
  findManufacturer(@Param('id') id: string) {
    return this.stretchCeilingsService.findManufacturer(id);
  }

  @Post('manufacturers')
  @ApiOperation({ summary: 'Создать производителя' })
  createManufacturer(@Body() dto: CreateCeilingManufacturerDto) {
    return this.stretchCeilingsService.createManufacturer(dto);
  }

  @Patch('manufacturers/:id')
  @ApiOperation({ summary: 'Обновить производителя' })
  updateManufacturer(@Param('id') id: string, @Body() dto: UpdateCeilingManufacturerDto) {
    return this.stretchCeilingsService.updateManufacturer(id, dto);
  }

  @Delete('manufacturers/:id')
  @ApiOperation({ summary: 'Удалить производителя (вместе с фактурами)' })
  removeManufacturer(@Param('id') id: string) {
    return this.stretchCeilingsService.removeManufacturer(id);
  }

  // ===== Фактуры =====

  @Get('fabrics')
  @ApiOperation({ summary: 'Список фактур (опционально по производителю)' })
  findFabrics(@Query('manufacturerId') manufacturerId?: string) {
    return this.stretchCeilingsService.findFabrics(manufacturerId);
  }

  @Get('fabrics/:id')
  @ApiOperation({ summary: 'Фактура по ID' })
  findFabric(@Param('id') id: string) {
    return this.stretchCeilingsService.findFabric(id);
  }

  @Post('fabrics')
  @ApiOperation({ summary: 'Создать фактуру' })
  createFabric(@Body() dto: CreateCeilingFabricDto) {
    return this.stretchCeilingsService.createFabric(dto);
  }

  @Patch('fabrics/:id')
  @ApiOperation({ summary: 'Обновить фактуру' })
  updateFabric(@Param('id') id: string, @Body() dto: UpdateCeilingFabricDto) {
    return this.stretchCeilingsService.updateFabric(id, dto);
  }

  @Delete('fabrics/:id')
  @ApiOperation({ summary: 'Удалить фактуру' })
  removeFabric(@Param('id') id: string) {
    return this.stretchCeilingsService.removeFabric(id);
  }

  // ===== Настройки раздела =====

  @Get('settings')
  @ApiOperation({ summary: 'Настройки раздела «Натяжные потолки»' })
  getSettings() {
    return this.stretchCeilingsService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки раздела «Натяжные потолки»' })
  updateSettings(@Body() dto: UpdateStretchCeilingsSettingsDto) {
    return this.stretchCeilingsService.updateSettings(dto);
  }
}
