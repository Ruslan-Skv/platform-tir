import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { extname } from 'path';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ContactFormService } from './contact-form.service';
import { UpdateContactFormBlockDto } from './dto/update-contact-form-block.dto';

const uploadDir = process.cwd() + '/uploads/contact-form';
const storage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `bg-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

@ApiTags('home-contact-form')
@Controller('home/contact-form')
export class ContactFormController {
  constructor(private readonly contactFormService: ContactFormService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные блока «Контактная форма» (публичный)' })
  getBlock() {
    return this.contactFormService.getBlock();
  }
}

@ApiTags('admin/home-contact-form')
@Controller('admin/home/contact-form')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminContactFormController {
  constructor(private readonly contactFormService: ContactFormService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные блока (админ)' })
  getBlock() {
    return this.contactFormService.getBlock();
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить блок «Контактная форма»' })
  updateBlock(@Body() dto: UpdateContactFormBlockDto) {
    return this.contactFormService.updateBlock(dto);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 5 * 1024 * 1024 },
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
  @ApiOperation({ summary: 'Загрузить фоновую картинку для блока «Контактная форма»' })
  uploadBackground(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): { imageUrl: string } {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl.replace(/\/$/, '')}/uploads/contact-form/${file.filename}`;
    return { imageUrl };
  }
}
