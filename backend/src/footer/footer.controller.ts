import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FooterService } from './footer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateFooterBlockDto } from './dto/update-footer-block.dto';
import { CreateFooterSectionDto } from './dto/create-footer-section.dto';
import { UpdateFooterSectionDto } from './dto/update-footer-section.dto';
import { CreateFooterLinkDto } from './dto/create-footer-link.dto';
import { UpdateFooterLinkDto } from './dto/update-footer-link.dto';
import { ReorderDto } from './dto/reorder.dto';
import type { Request } from 'express';

const uploadDir = path.join(process.cwd(), 'uploads', 'footer');

@ApiTags('home-footer')
@Controller('home/footer')
export class FooterController {
  constructor(private readonly footerService: FooterService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные футера (публичный)' })
  getData(@Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.footerService.getData(baseUrl);
  }
}

@ApiTags('admin/home-footer')
@Controller('admin/home/footer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminFooterController {
  constructor(private readonly footerService: FooterService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные футера (админ)' })
  getData(@Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.footerService.getData(baseUrl);
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить блок контактов и соцсетей' })
  updateBlock(@Body() dto: UpdateFooterBlockDto) {
    return this.footerService.updateBlock(dto);
  }

  @Post('vk-icon')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `vk-${Date.now()}${path.extname(file.originalname) || '.png'}`);
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
  @ApiOperation({ summary: 'Загрузить иконку ВКонтакте' })
  async uploadVkIcon(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.footerService.uploadVkIcon(file, baseUrl);
  }

  @Post('sections')
  @ApiOperation({ summary: 'Добавить секцию' })
  createSection(@Body() dto: CreateFooterSectionDto) {
    return this.footerService.createSection(dto.title);
  }

  @Patch('sections/:id')
  @ApiOperation({ summary: 'Обновить секцию' })
  updateSection(@Param('id') id: string, @Body() dto: UpdateFooterSectionDto) {
    return this.footerService.updateSection(id, dto);
  }

  @Delete('sections/:id')
  @ApiOperation({ summary: 'Удалить секцию' })
  deleteSection(@Param('id') id: string) {
    return this.footerService.deleteSection(id);
  }

  @Patch('sections/reorder')
  @ApiOperation({ summary: 'Изменить порядок секций' })
  reorderSections(@Body() dto: ReorderDto) {
    return this.footerService.reorderSections(dto.ids);
  }

  @Post('sections/:sectionId/links')
  @ApiOperation({ summary: 'Добавить ссылку в секцию' })
  createLink(@Param('sectionId') sectionId: string, @Body() dto: CreateFooterLinkDto) {
    return this.footerService.createLink(sectionId, dto);
  }

  @Patch('sections/:sectionId/links/:id')
  @ApiOperation({ summary: 'Обновить ссылку' })
  updateLink(@Param('id') id: string, @Body() dto: UpdateFooterLinkDto) {
    return this.footerService.updateLink(id, dto);
  }

  @Delete('sections/:sectionId/links/:id')
  @ApiOperation({ summary: 'Удалить ссылку' })
  deleteLink(@Param('id') id: string) {
    return this.footerService.deleteLink(id);
  }

  @Patch('sections/:sectionId/links/reorder')
  @ApiOperation({ summary: 'Изменить порядок ссылок в секции' })
  reorderLinks(@Param('sectionId') sectionId: string, @Body() dto: ReorderDto) {
    return this.footerService.reorderLinks(sectionId, dto.ids);
  }
}
