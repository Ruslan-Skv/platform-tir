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
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import type { Request as ExpressRequest } from 'express';
import { KnowledgePlatformFeedbackType } from '@prisma/client';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeQuizService } from './knowledge-quiz.service';
import { SubmitKnowledgeQuizDto } from './dto/submit-knowledge-quiz.dto';
import { UpsertKnowledgeQuizDto } from './dto/upsert-knowledge-quiz.dto';
import { CreateKnowledgeMaterialCommentDto } from './dto/create-knowledge-material-comment.dto';
import { CreateKnowledgePlatformFeedbackDto } from './dto/create-knowledge-platform-feedback.dto';
import { CreateKnowledgeCategoryDto } from './dto/create-knowledge-category.dto';
import { ImportKnowledgeCategoryOutlineDto } from './dto/import-knowledge-category-outline.dto';
import { CreateKnowledgeModuleDto } from './dto/create-knowledge-module.dto';
import { CreateKnowledgeMaterialDto } from './dto/create-knowledge-material.dto';
import { CreateKnowledgeTargetAudienceDto } from './dto/create-knowledge-target-audience.dto';
import { UpdateKnowledgeMaterialDto } from './dto/update-knowledge-material.dto';
import { UpdateVideoProgressDto } from './dto/update-video-progress.dto';
import { KnowledgeTrainingAnalyticsService } from './knowledge-training-analytics.service';
import { AdminAccessService } from '../admin-access/admin-access.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../../common/types/request-with-user.types';
import { UserRole } from '@prisma/client';

const KNOWLEDGE_RESOURCE_ID = 'admin.knowledge';

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

@Controller('admin/knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly knowledgeQuizService: KnowledgeQuizService,
    private readonly trainingAnalyticsService: KnowledgeTrainingAnalyticsService,
    private readonly adminAccessService: AdminAccessService,
  ) {}

  private async canEditKnowledge(req: RequestWithUser): Promise<boolean> {
    return (
      (await this.adminAccessService.getUserEffectivePermission(
        req.user.id,
        req.user.role as UserRole,
        KNOWLEDGE_RESOURCE_ID,
      )) === 'EDIT'
    );
  }

  private async getViewerCategoryScope(req: RequestWithUser, editorView: boolean) {
    if (editorView) {
      return undefined;
    }
    return this.adminAccessService.listAccessibleKnowledgeCategoryIds(
      req.user.id,
      req.user.role as UserRole,
    );
  }

  private async assertKnowledgeCategoryAccess(
    req: RequestWithUser,
    categoryId: string,
    editorView: boolean,
  ): Promise<void> {
    if (editorView) return;

    const allowedCategoryIds = await this.getViewerCategoryScope(req, false);
    if (!allowedCategoryIds?.includes(categoryId)) {
      throw new ForbiddenException('Нет доступа к этой категории');
    }
  }

  private async assertMaterialCategoryAccess(
    req: RequestWithUser,
    categoryId: string,
    editorView: boolean,
  ): Promise<void> {
    await this.assertKnowledgeCategoryAccess(req, categoryId, editorView);
  }

  @Get('stats')
  async getStats(@Request() req: RequestWithUser) {
    if (!(await this.canEditKnowledge(req))) {
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
  getTrainingAnalytics(
    @Request() req: RequestWithUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (req.user.role === 'TRAINEE') {
      throw new ForbiddenException('Статистика обучения недоступна для роли стажёра');
    }
    return this.trainingAnalyticsService.getTrainingAnalytics({ dateFrom, dateTo });
  }

  @Get('materials/search/suggestions')
  async searchMaterialSuggestions(
    @Request() req: RequestWithUser,
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('moduleId') moduleId?: string,
    @Query('type') type?: string,
  ) {
    const editorView = await this.canEditKnowledge(req);
    const allowedCategoryIds = await this.getViewerCategoryScope(req, editorView);
    if (categoryId) {
      await this.assertKnowledgeCategoryAccess(req, categoryId, editorView);
    }
    return this.knowledgeService
      .searchMaterialSuggestions({
        q,
        limit: limit ? parseInt(limit, 10) : 8,
        categoryId,
        moduleId,
        type,
        editorView,
        allowedCategoryIds,
      })
      .then((suggestions) => ({ suggestions }));
  }

  @Get('materials')
  async findAllMaterials(
    @Request() req: RequestWithUser,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('moduleId') moduleId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const editorView = await this.canEditKnowledge(req);
    const allowedCategoryIds = await this.getViewerCategoryScope(req, editorView);
    if (categoryId) {
      await this.assertKnowledgeCategoryAccess(req, categoryId, editorView);
    }
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
      allowedCategoryIds,
    });
  }

  @Get('materials/:id')
  async findOneMaterial(@Param('id') id: string, @Request() req: RequestWithUser) {
    const editorView = await this.canEditKnowledge(req);
    const material = await this.knowledgeService.findOneMaterial(id, editorView, req.user.id);
    await this.assertMaterialCategoryAccess(req, material.categoryId, editorView);
    return material;
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
  async getMaterialQuiz(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeQuizService.getQuizForMaterial(
      id,
      req.user.id,
      await this.canEditKnowledge(req),
    );
  }

  @Put('materials/:id/quiz')
  upsertMaterialQuiz(@Param('id') id: string, @Body() dto: UpsertKnowledgeQuizDto) {
    return this.knowledgeQuizService.upsertQuiz(id, dto);
  }

  @Post('materials/:id/quiz/submit')
  async submitMaterialQuiz(
    @Param('id') id: string,
    @Body() dto: SubmitKnowledgeQuizDto,
    @Request() req: RequestWithUser,
  ) {
    return this.knowledgeQuizService.submitAttempt(
      id,
      req.user.id,
      dto,
      await this.canEditKnowledge(req),
    );
  }

  @Patch('materials/:id/pin')
  togglePin(@Param('id') id: string) {
    return this.knowledgeService.togglePin(id);
  }

  @Patch('materials/:id/like')
  toggleMaterialLike(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeService.toggleLike(id, req.user.id);
  }

  @Get('materials/:id/likes')
  getMaterialLikes(@Param('id') id: string) {
    return this.knowledgeService.getMaterialLikers(id);
  }

  @Get('materials/:id/comments')
  getMaterialComments(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeService.listMaterialComments(id, req.user.id);
  }

  @Post('materials/:id/comments')
  createMaterialComment(
    @Param('id') id: string,
    @Body() dto: CreateKnowledgeMaterialCommentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.knowledgeService.createMaterialComment(id, req.user.id, dto.text);
  }

  @Post('feedback')
  createPlatformFeedback(
    @Body() dto: CreateKnowledgePlatformFeedbackDto,
    @Request() req: RequestWithUser,
  ) {
    return this.knowledgeService.createPlatformFeedback(req.user.id, dto.type, dto.text);
  }

  @Get('feedback')
  listPlatformFeedback(
    @Query('type') type?: KnowledgePlatformFeedbackType,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.knowledgeService.listPlatformFeedback({
      type,
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Patch('feedback/mark-read')
  markPlatformFeedbackRead() {
    return this.knowledgeService.markPlatformFeedbackRead();
  }

  @Post('materials')
  createMaterial(@Body() dto: CreateKnowledgeMaterialDto, @Request() req: RequestWithUser) {
    return this.knowledgeService.createMaterial(req.user.id, dto);
  }

  @Patch('materials/:id')
  updateMaterial(@Param('id') id: string, @Body() dto: UpdateKnowledgeMaterialDto) {
    return this.knowledgeService.updateMaterial(id, dto);
  }

  @Patch('materials/:id/publish')
  publishMaterial(@Param('id') id: string) {
    return this.knowledgeService.publishMaterial(id);
  }

  @Delete('materials/:id')
  removeMaterial(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeService.removeMaterial(id, req.user.id);
  }

  @Get('trash')
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
  getTrashCount() {
    return this.knowledgeService.getTrashCount().then((count) => ({ count }));
  }

  @Post('trash/:type/:id/restore')
  restoreTrashItem(
    @Param('type') type: 'material' | 'category' | 'module',
    @Param('id') id: string,
  ) {
    return this.knowledgeService.restoreTrashItem(type, id);
  }

  @Get('categories')
  async findAllCategories(@Request() req: RequestWithUser) {
    const editorView = await this.canEditKnowledge(req);
    const categories = await this.knowledgeService.findAllCategories(editorView);
    if (editorView) {
      return categories;
    }

    const allowedCategoryIds = new Set(
      await this.adminAccessService.listAccessibleKnowledgeCategoryIds(
        req.user.id,
        req.user.role as UserRole,
      ),
    );
    return categories.filter((category) => allowedCategoryIds.has(category.id));
  }

  @Get('target-audiences')
  findAllTargetAudiences() {
    return this.knowledgeService.findAllTargetAudiences();
  }

  @Post('target-audiences')
  createTargetAudience(@Body() dto: CreateKnowledgeTargetAudienceDto) {
    return this.knowledgeService.createTargetAudience(dto);
  }

  @Post('categories')
  createCategory(@Body() dto: CreateKnowledgeCategoryDto) {
    return this.knowledgeService.createCategory(dto);
  }

  @Post('categories/:id/import-outline')
  importCategoryOutline(
    @Param('id') id: string,
    @Body() dto: ImportKnowledgeCategoryOutlineDto,
    @Request() req: RequestWithUser,
  ) {
    return this.knowledgeService.importCategoryOutline(id, req.user.id, dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() data: Partial<CreateKnowledgeCategoryDto>) {
    return this.knowledgeService.updateCategory(id, data);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeService.removeCategory(id, req.user.id);
  }

  @Get('modules')
  async findAllModules(@Request() req: RequestWithUser, @Query('categoryId') categoryId: string) {
    if (!categoryId) {
      throw new BadRequestException('Укажите categoryId');
    }
    const editorView = await this.canEditKnowledge(req);
    await this.assertKnowledgeCategoryAccess(req, categoryId, editorView);
    return this.knowledgeService.findAllModules(categoryId, editorView);
  }

  @Post('modules')
  createModule(@Body() dto: CreateKnowledgeModuleDto) {
    return this.knowledgeService.createModule(dto);
  }

  @Patch('modules/:id')
  updateModule(@Param('id') id: string, @Body() data: Partial<CreateKnowledgeModuleDto>) {
    return this.knowledgeService.updateModule(id, data);
  }

  @Delete('modules/:id')
  removeModule(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.knowledgeService.removeModule(id, req.user.id);
  }

  @Post('upload')
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
