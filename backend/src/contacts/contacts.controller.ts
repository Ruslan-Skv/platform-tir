import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
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
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ContactsService } from './contacts.service';
import { CreateContactSalonDto, UpdateContactsPageDto } from './dto/contacts.dto';
import { UpdateContactSalonDto } from './dto/update-contact-salon.dto';

const uploadDir = path.join(process.cwd(), 'uploads', 'contacts');

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `temp-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

@ApiTags('contacts')
@Controller('contacts')
export class ContactsPublicController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Страница контактов (публичный)' })
  getPublic() {
    return this.contacts.getPublic();
  }
}

@ApiTags('admin/contacts')
@Controller('admin/content/contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class ContactsAdminController {
  constructor(private readonly contacts: ContactsService) {}

  @Get('page')
  @ApiOperation({ summary: 'Настройки страницы контактов' })
  getPage() {
    return this.contacts.getAdminPage();
  }

  @Patch('page')
  @ApiOperation({ summary: 'Обновить настройки страницы' })
  updatePage(@Body() dto: UpdateContactsPageDto) {
    return this.contacts.updateAdminPage(dto);
  }

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
  @ApiOperation({ summary: 'Загрузить фото салона' })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.contacts.uploadImage(file, baseUrl);
  }

  @Get('salons')
  @ApiOperation({ summary: 'Список салонов (админ)' })
  listSalons() {
    return this.contacts.listAdminSalons();
  }

  @Post('salons')
  @ApiOperation({ summary: 'Создать салон' })
  createSalon(@Body() dto: CreateContactSalonDto) {
    return this.contacts.createSalon(dto);
  }

  @Get('salons/:id')
  @ApiOperation({ summary: 'Салон по ID' })
  getSalon(@Param('id') id: string) {
    return this.contacts.getAdminSalon(id);
  }

  @Patch('salons/:id')
  @ApiOperation({ summary: 'Обновить салон' })
  updateSalon(@Param('id') id: string, @Body() dto: UpdateContactSalonDto) {
    return this.contacts.updateSalon(id, dto);
  }

  @Delete('salons/:id')
  @ApiOperation({ summary: 'Удалить салон' })
  async removeSalon(@Param('id') id: string) {
    await this.contacts.removeSalon(id);
    return { ok: true };
  }
}
