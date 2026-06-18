import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import type { Request } from 'express';
import { SalesCandidateStatus } from '@prisma/client';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentAnalyticsService } from './recruitment-analytics.service';
import { RecruitmentCampaignService } from './recruitment-campaign.service';
import { RecruitmentUploadService } from './recruitment-upload.service';
import { CreateSalesCandidateDto } from './dto/create-sales-candidate.dto';
import { UpdateSalesCandidateDto } from './dto/update-sales-candidate.dto';
import {
  CloseRecruitmentCampaignDto,
  CreateRecruitmentCampaignDto,
} from './dto/create-recruitment-campaign.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const resumesDir = path.join(process.cwd(), 'uploads', 'recruitment');

@Controller('admin/recruitment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class RecruitmentController {
  constructor(
    private readonly recruitmentService: RecruitmentService,
    private readonly analyticsService: RecruitmentAnalyticsService,
    private readonly campaignService: RecruitmentCampaignService,
    private readonly uploadService: RecruitmentUploadService,
  ) {}

  @Post('upload/resume')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });
          cb(null, resumesDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `temp-${Date.now()}${extname(file.originalname) || '.pdf'}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(pdf|docx?|txt)$/i.test(file.originalname);
        if (!allowed) {
          cb(new BadRequestException('Допустимы файлы: PDF, DOCX, TXT'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadResume(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.uploadService.uploadResume(file, baseUrl);
  }

  @Post(':id/parse-resume')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });
          cb(null, resumesDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `temp-${Date.now()}${extname(file.originalname) || '.pdf'}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(pdf|docx?|txt)$/i.test(file.originalname);
        if (!allowed) {
          cb(new BadRequestException('Допустимы файлы: PDF, DOCX, TXT'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadAndParseResume(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const uploaded = this.uploadService.uploadResume(file, baseUrl);

    await this.recruitmentService.update(id, {
      resumeFileUrl: uploaded.fileUrl,
      resumeFileName: uploaded.fileName,
    });

    return this.recruitmentService.parseResumeForCandidate(
      id,
      uploaded.filePath,
      uploaded.mimeType,
    );
  }

  @Get('analytics/comparison')
  getComparisonAnalytics(@Query('campaignId') campaignId?: string) {
    return this.analyticsService.getComparisonAnalytics(campaignId);
  }

  @Get('campaigns/active')
  getActiveCampaign() {
    return this.campaignService.getActive();
  }

  @Get('campaigns')
  findAllCampaigns() {
    return this.campaignService.findAll();
  }

  @Post('campaigns')
  createCampaign(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: CreateRecruitmentCampaignDto,
  ) {
    return this.campaignService.create(req.user.id, dto);
  }

  @Get('campaigns/:campaignId')
  findOneCampaign(@Param('campaignId') campaignId: string) {
    return this.campaignService.findOne(campaignId);
  }

  @Post('campaigns/:campaignId/close')
  closeCampaign(@Param('campaignId') campaignId: string, @Body() dto: CloseRecruitmentCampaignDto) {
    return this.campaignService.close(campaignId, dto);
  }

  @Post()
  create(@Req() req: Request & { user: { id: string } }, @Body() dto: CreateSalesCandidateDto) {
    return this.recruitmentService.create(req.user.id, dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: SalesCandidateStatus,
    @Query('campaignId') campaignId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recruitmentService.findAll({
      search,
      status,
      campaignId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id/training-progress')
  getTrainingProgress(@Param('id') id: string) {
    return this.recruitmentService.getTrainingProgress(id);
  }

  @Post(':id/link-trainee')
  linkTrainee(@Param('id') id: string, @Body('email') email: string) {
    if (!email?.trim()) {
      throw new BadRequestException('email обязателен');
    }
    return this.recruitmentService.linkTraineeByEmail(id, email.trim());
  }

  @Post(':id/unlink-trainee')
  unlinkTrainee(@Param('id') id: string) {
    return this.recruitmentService.unlinkTraineeUser(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recruitmentService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalesCandidateDto) {
    return this.recruitmentService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recruitmentService.remove(id);
  }
}
