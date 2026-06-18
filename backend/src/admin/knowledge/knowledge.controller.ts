import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
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
import type { Request as ExpressRequest } from 'express';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeQuizService } from './knowledge-quiz.service';
import { SubmitKnowledgeQuizDto } from './dto/submit-knowledge-quiz.dto';
import { UpsertKnowledgeQuizDto } from './dto/upsert-knowledge-quiz.dto';
import { CreateKnowledgeCategoryDto } from './dto/create-knowledge-category.dto';
import { ImportKnowledgeCategoryOutlineDto } from './dto/import-knowledge-category-outline.dto';
import { CreateKnowledgeModuleDto } from './dto/create-knowledge-module.dto';
import { CreateKnowledgeMaterialDto } from './dto/create-knowledge-material.dto';
import { CreateKnowledgeTargetAudienceDto } from './dto/create-knowledge-target-audience.dto';
import { UpdateKnowledgeMaterialDto } from './dto/update-knowledge-material.dto';
import { UpdateVideoProgressDto } from './dto/update-video-progress.dto';
import { KnowledgeTrainingAnalyticsService } from './knowledge-training-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithUser } from '../../common/types/request-with-user.types';

const knowledgeUploadDir = path.join(process.cwd(), 'uploads', 'knowledge');

const knowledgeUploadStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(knowledgeUploadDir)) fs.mkdirSync(knowledgeUploadDir, { recursive: true });
    cb(null, knowledgeUploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `temp-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

const KNOWLEDGE_EDITOR_ROLES = ['SUPER_ADMIN'] as const;

function isKnowledgeEditor(role: string | undefined): boolean {
  return role === 'SUPER_ADMIN';
}

@Controller('admin/knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly knowledgeQuizService: KnowledgeQuizService,
    private readonly trainingAnalyticsService: KnowledgeTrainingAnalyticsService,
  ) {}

  @Get('stats')
  getStats(@Request() req: RequestWithUser) {
    if (!isKnowledgeEditor(req.user.role)) {
      return this.knowledgeService.getStats().then((stats) => ({
        totalMaterials: stats.publishedMaterials,
        publishedMaterials: stats.publishedMaterials,
        draftMaterials: 0,
        videoCount: stats.videoCount,
        articleCount: stats.articleCount,
        linkCount: stats.linkCount,
        categoryCount: stats.categoryCount,
        pinnedCount: stats.pinnedCount,
      }));
    }
    return this.knowledgeService.getStats();
  }

  @Get('training-analytics')
  getTrainingAnalytics(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.trainingAnalyticsService.getTrainingAnalytics({ dateFrom, dateTo });
  }

  @Get('materials/search/suggestions')
  searchMaterialSuggestions(
    @Request() req: RequestWithUser,
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('moduleId') moduleId?: string,
    @Query('type') type?: string,
  ) {
    const editorView = isKnowledgeEditor(req.user.role);
    return this.knowledgeService
      .searchMaterialSuggestions({
        q,
        limit: limit ? parseInt(limit, 10) : 8,
        categoryId,
        moduleId,
        type,
        editorView,
      })
      .then((suggestions) => ({ suggestions }));
  }

  @Get('materials')
  findAllMaterials(
    @Request() req: RequestWithUser,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('moduleId') moduleId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const editorView = isKnowledgeEditor(req.user.role);
    return this.knowledgeService.findAllMaterials({
      status,
      categoryId,
      moduleId,
      type,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 24,
      editorView,
      userId: req.user.id,
    });
  }

  @Get('materials/:id')
  findOneMaterial(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeService.findOneMaterial(id, isKnowledgeEditor(req.user.role), req.user.id);
  }

  @Get('materials/:id/progress')
  getVideoProgress(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeService.getVideoProgress(req.user.id, id);
  }

  @Patch('materials/:id/progress')
  updateVideoProgress(
    @Param('id') id: string,
    @Body() dto: UpdateVideoProgressDto,
    @Request() req: RequestWithUser,
  ) {
    return this.knowledgeService.upsertVideoProgress(req.user.id, id, dto);
  }

  @Get('materials/:id/quiz')
  getMaterialQuiz(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeQuizService.getQuizForMaterial(
      id,
      req.user.id,
      isKnowledgeEditor(req.user.role),
    );
  }

  @Put('materials/:id/quiz')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  upsertMaterialQuiz(@Param('id') id: string, @Body() dto: UpsertKnowledgeQuizDto) {
    return this.knowledgeQuizService.upsertQuiz(id, dto);
  }

  @Post('materials/:id/quiz/submit')
  submitMaterialQuiz(
    @Param('id') id: string,
    @Body() dto: SubmitKnowledgeQuizDto,
    @Request() req: RequestWithUser,
  ) {
    return this.knowledgeQuizService.submitAttempt(
      id,
      req.user.id,
      dto,
      isKnowledgeEditor(req.user.role),
    );
  }

  @Patch('materials/:id/pin')
  togglePin(@Param('id') id: string) {
    return this.knowledgeService.togglePin(id);
  }

  @Post('materials')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  createMaterial(@Body() dto: CreateKnowledgeMaterialDto, @Request() req: RequestWithUser) {
    return this.knowledgeService.createMaterial(req.user.id, dto);
  }

  @Patch('materials/:id')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  updateMaterial(@Param('id') id: string, @Body() dto: UpdateKnowledgeMaterialDto) {
    return this.knowledgeService.updateMaterial(id, dto);
  }

  @Patch('materials/:id/publish')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  publishMaterial(@Param('id') id: string) {
    return this.knowledgeService.publishMaterial(id);
  }

  @Delete('materials/:id')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  removeMaterial(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeService.removeMaterial(id, req.user.id);
  }

  @Get('trash')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  listTrash(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.knowledgeService.listTrash({
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  @Get('trash/count')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  getTrashCount() {
    return this.knowledgeService.getTrashCount().then((count) => ({ count }));
  }

  @Post('trash/:type/:id/restore')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  restoreTrashItem(
    @Param('type') type: 'material' | 'category' | 'module',
    @Param('id') id: string,
  ) {
    return this.knowledgeService.restoreTrashItem(type, id);
  }

  @Get('categories')
  findAllCategories(@Request() req: RequestWithUser) {
    return this.knowledgeService.findAllCategories(isKnowledgeEditor(req.user.role));
  }

  @Get('target-audiences')
  findAllTargetAudiences() {
    return this.knowledgeService.findAllTargetAudiences();
  }

  @Post('target-audiences')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  createTargetAudience(@Body() dto: CreateKnowledgeTargetAudienceDto) {
    return this.knowledgeService.createTargetAudience(dto);
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  createCategory(@Body() dto: CreateKnowledgeCategoryDto) {
    return this.knowledgeService.createCategory(dto);
  }

  @Post('categories/:id/import-outline')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  importCategoryOutline(
    @Param('id') id: string,
    @Body() dto: ImportKnowledgeCategoryOutlineDto,
    @Request() req: RequestWithUser,
  ) {
    return this.knowledgeService.importCategoryOutline(id, req.user.id, dto);
  }

  @Patch('categories/:id')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  updateCategory(@Param('id') id: string, @Body() data: Partial<CreateKnowledgeCategoryDto>) {
    return this.knowledgeService.updateCategory(id, data);
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  removeCategory(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeService.removeCategory(id, req.user.id);
  }

  @Get('modules')
  findAllModules(@Request() req: RequestWithUser, @Query('categoryId') categoryId: string) {
    if (!categoryId) {
      throw new BadRequestException('Укажите categoryId');
    }
    return this.knowledgeService.findAllModules(categoryId, isKnowledgeEditor(req.user.role));
  }

  @Post('modules')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  createModule(@Body() dto: CreateKnowledgeModuleDto) {
    return this.knowledgeService.createModule(dto);
  }

  @Patch('modules/:id')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  updateModule(@Param('id') id: string, @Body() data: Partial<CreateKnowledgeModuleDto>) {
    return this.knowledgeService.updateModule(id, data);
  }

  @Delete('modules/:id')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  removeModule(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeService.removeModule(id, req.user.id);
  }

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: knowledgeUploadStorage,
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
  uploadThumbnail(@UploadedFile() file: Express.Multer.File, @Req() req: ExpressRequest) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.knowledgeService.uploadThumbnail(file, baseUrl);
  }

  @Post('upload-attachment')
  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_EDITOR_ROLES)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: knowledgeUploadStorage,
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpe?g|png|webp|gif|pdf|docx?|xlsx?|pptx?|zip|rar|txt|csv)$/i.test(
          file.originalname,
        );
        if (!allowed) {
          cb(
            new BadRequestException(
              'Допустимы: изображения, PDF, Word, Excel, PowerPoint, ZIP, TXT, CSV',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadAttachment(@UploadedFile() file: Express.Multer.File, @Req() req: ExpressRequest) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.knowledgeService.uploadAttachment(file, baseUrl);
  }
}
