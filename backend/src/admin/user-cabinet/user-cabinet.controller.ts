import {
  BadRequestException,
  Body,
  Controller,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateUserCabinetDto } from './dto/update-user-cabinet.dto';
import { UserCabinetService } from './user-cabinet.service';

const authPolicyDir = path.join(process.cwd(), 'uploads', 'auth', 'policy');

const policyStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(authPolicyDir)) fs.mkdirSync(authPolicyDir, { recursive: true });
    cb(null, authPolicyDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `policy-${Date.now()}${extname(file.originalname) || '.pdf'}`);
  },
});

@ApiTags('admin/user-cabinet')
@Controller('admin/user-cabinet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class UserCabinetController {
  constructor(private readonly userCabinet: UserCabinetService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Получить настройки личного кабинета (супер-админ)' })
  getSettings() {
    return this.userCabinet.getAdminSettings();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Данные личного кабинета пользователя (супер-админ)' })
  getUserCabinet(@Param('userId') userId: string) {
    return this.userCabinet.getUserCabinet(userId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки личного кабинета (супер-админ)' })
  updateSettings(@Body() dto: UpdateUserCabinetDto) {
    return this.userCabinet.updateSettings(dto);
  }

  @Post('upload-privacy-policy')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: policyStorage,
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
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: 'Загрузить PDF политики конфиденциальности (регистрация)' })
  uploadPrivacyPolicy(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const uploadsBase = baseUrl.replace(/\/api\/v1\/?$/, '');
    return { url: `${uploadsBase}/uploads/auth/policy/${file.filename}` };
  }
}
