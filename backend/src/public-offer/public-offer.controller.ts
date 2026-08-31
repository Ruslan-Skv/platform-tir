import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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

import { extname } from 'path';

import * as fs from 'fs';

import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

import { Roles } from '../common/decorators/roles.decorator';

import { RolesGuard } from '../common/guards/roles.guard';

import type { RequestWithUser } from '../common/types/request-with-user.types';

import { assertPdfUploadMagicBytes } from '../common/utils/upload-magic-bytes.util';

import { CreatePublicOfferDto } from './dto/create-public-offer.dto';

import { ResolvePublicOffersDto } from './dto/resolve-public-offers.dto';

import { UpdatePublicOfferDto } from './dto/update-public-offer.dto';

import { ensureOfferUploadDir, offerUploadDir, PublicOfferService } from './public-offer.service';

const offerStorage = diskStorage({
  destination: (_req, _file, cb) => {
    ensureOfferUploadDir();

    cb(null, offerUploadDir);
  },

  filename: (_req, file, cb) => {
    cb(null, `offer-${Date.now()}${extname(file.originalname) || '.pdf'}`);
  },
});

@ApiTags('public-offers')
@Controller('public-offers')
export class PublicOffersController {
  constructor(private readonly publicOffer: PublicOfferService) {}

  @Get()
  @ApiOperation({ summary: 'Список опубликованных оферт' })
  listPublic() {
    return this.publicOffer.listPublic();
  }

  @Post('resolve')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Определить оферты для корзины или заказа' })
  resolve(@Body() dto: ResolvePublicOffersDto, @Req() req: RequestWithUser) {
    return this.publicOffer.resolveForCart(dto, req.user?.id);
  }

  @Get(':slug/revisions/:versionNumber')
  @ApiOperation({ summary: 'Архивная редакция оферты по slug и номеру версии' })
  async getRevision(@Param('slug') slug: string, @Param('versionNumber') versionNumberRaw: string) {
    const versionNumber = Number(versionNumberRaw);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      throw new BadRequestException('Некорректный номер версии');
    }
    const data = await this.publicOffer.getPublicRevision(slug, versionNumber);
    if (!data) {
      throw new NotFoundException('Редакция оферты не найдена');
    }
    return data;
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Публичная оферта по slug' })
  async getBySlug(@Param('slug') slug: string) {
    const data = await this.publicOffer.getPublicBySlug(slug);

    if (!data) {
      throw new NotFoundException('Публичная оферта не найдена');
    }

    return data;
  }
}

/** @deprecated Используйте PublicOffersController */

@ApiTags('public-offer')
@Controller('public-offer')
export class PublicOfferLegacyController {
  constructor(private readonly publicOffer: PublicOfferService) {}

  @Get()
  @ApiOperation({ summary: 'Публичная оферта по умолчанию (устаревший)' })
  async getPublic() {
    const data = await this.publicOffer.getPublicDefault();

    if (!data) {
      throw new NotFoundException('Публичная оферта не опубликована');
    }

    return data;
  }
}

@ApiTags('admin/public-offers')
@Controller('admin/settings/public-offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminPublicOffersController {
  constructor(private readonly publicOffer: PublicOfferService) {}

  @Get()
  @ApiOperation({ summary: 'Список оферт (админ)' })
  listAdmin() {
    return this.publicOffer.listAdmin();
  }

  @Post()
  @ApiOperation({ summary: 'Создать оферту' })
  create(@Body() dto: CreatePublicOfferDto) {
    return this.publicOffer.create(dto);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'История редакций оферты' })
  listVersions(@Param('id') id: string) {
    return this.publicOffer.listAdminVersions(id);
  }

  @Post(':id/versions/:versionNumber/restore')
  @ApiOperation({ summary: 'Восстановить архивную редакцию как текущую' })
  restoreVersion(@Param('id') id: string, @Param('versionNumber') versionNumberRaw: string) {
    const versionNumber = Number(versionNumberRaw);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      throw new BadRequestException('Некорректный номер версии');
    }
    return this.publicOffer.restoreVersion(id, versionNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Оферта по ID (админ)' })
  getById(@Param('id') id: string) {
    return this.publicOffer.getAdminById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить оферту' })
  update(@Param('id') id: string, @Body() dto: UpdatePublicOfferDto) {
    return this.publicOffer.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить оферту' })
  async remove(@Param('id') id: string) {
    await this.publicOffer.remove(id);

    return { ok: true };
  }

  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: offerStorage,

      limits: { fileSize: 20 * 1024 * 1024 },

      fileFilter: (_req, file, cb) => {
        const allowed = /\.pdf$/i.test(file.originalname);

        if (!allowed) {
          cb(new BadRequestException('Допустим только PDF'), false);

          return;
        }

        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',

      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Загрузить PDF оферты' })
  async uploadOffer(
    @Param('id') id: string,

    @UploadedFile() file: Express.Multer.File,

    @Req() req: Request,
  ) {
    if (file?.path) {
      assertPdfUploadMagicBytes(fs.readFileSync(file.path), file.originalname);
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    return this.publicOffer.uploadOfferPdf(id, file, baseUrl);
  }
}
