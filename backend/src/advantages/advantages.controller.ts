import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AdvantagesService } from './advantages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateAdvantagesBlockDto } from './dto/update-advantages-block.dto';
import { CreateAdvantageItemDto } from './dto/create-advantage-item.dto';
import { UpdateAdvantageItemDto } from './dto/update-advantage-item.dto';
import { ReorderDto } from './dto/reorder.dto';
import type { Request } from 'express';

const iconsDir = path.join(process.cwd(), 'uploads', 'advantages', 'icons');

@ApiTags('home-advantages')
@Controller('home/advantages')
export class AdvantagesController {
  constructor(private readonly advantagesService: AdvantagesService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные секции «Почему выбирают нас» (публичный)' })
  getData(@Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.advantagesService.getData(baseUrl);
  }
}

@ApiTags('admin/home-advantages')
@Controller('admin/home/advantages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminAdvantagesController {
  constructor(private readonly advantagesService: AdvantagesService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные секции (админ)' })
  getData(@Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.advantagesService.getData(baseUrl);
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить заголовок секции' })
  updateBlock(@Body() dto: UpdateAdvantagesBlockDto) {
    return this.advantagesService.updateBlock(dto);
  }

  @Post('items/icon')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
          cb(null, iconsDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `icon-${Date.now()}${extname(file.originalname) || '.png'}`);
        },
      }),
      limits: { fileSize: 512 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpe?g|png|webp|gif|svg)$/i.test(file.originalname);
        if (!allowed) {
          cb(
            new BadRequestException('Допустимы только изображения: jpg, png, webp, gif, svg'),
            false,
          );
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
  @ApiOperation({ summary: 'Загрузить иконку для преимущества' })
  async uploadIcon(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.advantagesService.uploadIcon(file, baseUrl);
  }

  @Post('items')
  @ApiOperation({ summary: 'Добавить преимущество' })
  createItem(@Body() dto: CreateAdvantageItemDto) {
    return this.advantagesService.createItem(dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Обновить преимущество' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateAdvantageItemDto) {
    return this.advantagesService.updateItem(id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Удалить преимущество' })
  deleteItem(@Param('id') id: string) {
    return this.advantagesService.deleteItem(id);
  }

  @Patch('items/reorder')
  @ApiOperation({ summary: 'Изменить порядок преимуществ' })
  reorderItems(@Body() dto: ReorderDto) {
    return this.advantagesService.reorderItems(dto.ids);
  }
}
