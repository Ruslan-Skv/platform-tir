import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
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
import { AdminQuizService } from './admin-quiz.service';
import { ReplaceQuizStepsDto } from './dto/replace-quiz-steps.dto';
import { UpdateQuizLandingDto } from './dto/update-quiz-landing.dto';
import { UpdateQuizSubmissionDto } from './dto/update-quiz-submission.dto';

const quizUploadDir = path.join(process.cwd(), 'uploads', 'quiz');
const quizCatalogDir = path.join(process.cwd(), 'uploads', 'quiz', 'catalog');

const imageStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(quizUploadDir)) fs.mkdirSync(quizUploadDir, { recursive: true });
    cb(null, quizUploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `option-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

const catalogStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(quizCatalogDir)) fs.mkdirSync(quizCatalogDir, { recursive: true });
    cb(null, quizCatalogDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `catalog-${Date.now()}${extname(file.originalname) || '.pdf'}`);
  },
});

@ApiTags('admin/quiz')
@Controller('admin/quiz')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN', 'MODERATOR', 'MANAGER')
@ApiBearerAuth()
export class AdminQuizController {
  constructor(private readonly adminQuiz: AdminQuizService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Получить квиз с шагами (админ)' })
  getLanding(@Param('slug') slug: string) {
    return this.adminQuiz.getLanding(slug);
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'Обновить настройки квиза' })
  updateLanding(@Param('slug') slug: string, @Body() dto: UpdateQuizLandingDto) {
    return this.adminQuiz.updateLanding(slug, dto);
  }

  @Put(':slug/steps')
  @ApiOperation({ summary: 'Заменить все шаги квиза' })
  replaceSteps(@Param('slug') slug: string, @Body() dto: ReplaceQuizStepsDto) {
    return this.adminQuiz.replaceSteps(slug, dto);
  }

  @Get(':slug/submissions')
  @ApiOperation({ summary: 'Заявки с квиза' })
  findSubmissions(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('furnitureType') furnitureType?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminQuiz.findSubmissions(slug, pageNum, limitNum, {
      status,
      furnitureType,
      search,
    });
  }

  @Patch(':slug/submissions/:submissionId')
  @ApiOperation({ summary: 'Обновить статус/заметку заявки' })
  updateSubmission(
    @Param('slug') slug: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: UpdateQuizSubmissionDto,
  ) {
    return this.adminQuiz.updateSubmission(slug, submissionId, dto);
  }

  @Post(':slug/upload-option-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: imageStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpe?g|png|webp|gif|svg)$/i.test(file.originalname);
        if (!allowed) {
          cb(new BadRequestException('Допустимы только изображения'), false);
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
  @ApiOperation({ summary: 'Загрузить изображение для варианта ответа' })
  uploadOptionImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }
    return { url: `/uploads/quiz/${file.filename}` };
  }

  @Post(':slug/upload-catalog')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: catalogStorage,
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(pdf|jpe?g|png)$/i.test(file.originalname);
        if (!allowed) {
          cb(new BadRequestException('Допустимы PDF или изображения'), false);
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
  @ApiOperation({ summary: 'Загрузить каталог (экран успеха)' })
  uploadCatalog(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const uploadsBase = baseUrl.replace(/\/api\/v1\/?$/, '');
    return { url: `${uploadsBase}/uploads/quiz/catalog/${file.filename}` };
  }
}
