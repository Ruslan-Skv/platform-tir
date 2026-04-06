import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProductCardBadgesService } from './product-card-badges.service';

const badgesDir = path.join(process.cwd(), 'uploads', 'product-card-badges');

@ApiTags('admin-product-card-badges')
@Controller('admin/product-card-badges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminProductCardBadgesController {
  constructor(private readonly productCardBadgesService: ProductCardBadgesService) {}

  @Post('definitions/:id/upload')
  @ApiOperation({ summary: 'Загрузить JPG для бэйджа карточки товара' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(badgesDir)) fs.mkdirSync(badgesDir, { recursive: true });
          cb(null, badgesDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `badge-${Date.now()}${extname(file.originalname) || '.jpg'}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = /\.jpe?g$/i.test(file.originalname) || file.mimetype === 'image/jpeg';
        if (!ok) {
          cb(new BadRequestException('Допустим только формат JPEG (.jpg, .jpeg)'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не получен');
    }
    const imageUrl = `/uploads/product-card-badges/${file.filename}`;
    return this.productCardBadgesService.setImageUrl(id, imageUrl);
  }

  @Patch('definitions/:id')
  @ApiOperation({
    summary:
      'Обновить бэйдж: imageUrl (null — снять картинку), description (подсказка при наведении)',
  })
  async patchDefinition(
    @Param('id') id: string,
    @Body() body: { imageUrl?: string | null; description?: string | null },
  ) {
    if (!('imageUrl' in body) && !('description' in body)) {
      throw new BadRequestException('Укажите imageUrl и/или description');
    }
    return this.productCardBadgesService.patchDefinition(id, body);
  }
}
