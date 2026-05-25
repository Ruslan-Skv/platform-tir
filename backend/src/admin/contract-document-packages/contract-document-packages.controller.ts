import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ContractDocumentPackageKind } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { ContractDocumentPackagePaymentsService } from './contract-document-package-payments.service';
import { ContractDocumentPackagesService } from './contract-document-packages.service';
import { CreateContractDocumentPackageDto } from './dto/create-contract-document-package.dto';
import { SetGlobalExecutorProfilesDto } from './dto/set-global-executor-profiles.dto';
import { SetGlobalContractTemplatesDto } from './dto/set-global-contract-templates.dto';
import { SetGlobalSignatoryProfilesDto } from './dto/set-global-signatory-profiles.dto';
import { SetGlobalEstimatePresetsDto } from './dto/set-global-estimate-presets.dto';
import { SetGlobalContractTemplateDto } from './dto/set-global-contract-template.dto';
import { CreateContractDocumentPackagePaymentDto } from './dto/create-contract-document-package-payment.dto';
import { UpdateContractDocumentPackageDto } from './dto/update-contract-document-package.dto';
import { UpdateContractDocumentPackagePaymentDto } from './dto/update-contract-document-package-payment.dto';
import {
  ApplyRepairWorkPeriodToAllDto,
  SetRepairContractSettingsDto,
} from './dto/set-repair-settings.dto';

const CRM_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
] as const;

const repairWorkStartActsDir = path.join(
  process.cwd(),
  'uploads',
  'contract-document-packages',
  'work-start-acts',
);

const repairContractCloseActsDir = path.join(
  process.cwd(),
  'uploads',
  'contract-document-packages',
  'contract-close-acts',
);

@Controller('admin/contract-document-packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class ContractDocumentPackagesController {
  constructor(
    private readonly service: ContractDocumentPackagesService,
    private readonly packagePayments: ContractDocumentPackagePaymentsService,
  ) {}

  @Post()
  create(@Body() dto: CreateContractDocumentPackageDto, @Req() req: RequestWithUser) {
    return this.service.create(dto, req.user?.id);
  }

  @Get()
  findAll(@Query('kind') kind?: string) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    const k = kind && allowed.has(kind) ? (kind as ContractDocumentPackageKind) : undefined;
    return this.service.findAll(k);
  }

  @Get('trash')
  findTrash(
    @Query('kind') kind: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.findTrash(kind as ContractDocumentPackageKind, {
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  @Get('global-templates')
  getGlobalTemplate(@Query('kind') kind: string, @Query('tab') tab: string) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    if (!tab?.trim()) {
      throw new BadRequestException('Укажите query-параметр tab');
    }
    return this.service.getGlobalTemplate(kind as ContractDocumentPackageKind, tab.trim());
  }

  @Put('global-templates')
  @Roles('SUPER_ADMIN')
  setGlobalTemplate(@Body() dto: SetGlobalContractTemplateDto, @Req() req: RequestWithUser) {
    return this.service.setGlobalTemplate(dto, req.user?.id);
  }

  @Get('contract-templates')
  getGlobalContractTemplates(@Query('kind') kind: string) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.getGlobalContractTemplates(kind as ContractDocumentPackageKind);
  }

  @Put('contract-templates')
  @Roles('SUPER_ADMIN')
  setGlobalContractTemplates(
    @Body() dto: SetGlobalContractTemplatesDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.setGlobalContractTemplates(dto, req.user?.id);
  }

  @Get('estimate-presets')
  getGlobalEstimatePresets(@Query('kind') kind: string) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.getGlobalEstimatePresets(kind as ContractDocumentPackageKind);
  }

  @Get('estimate-presets/history')
  listGlobalEstimatePresetsHistory(@Query('kind') kind: string) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.listGlobalEstimatePresetsHistory(kind as ContractDocumentPackageKind);
  }

  @Put('estimate-presets')
  setGlobalEstimatePresets(@Body() dto: SetGlobalEstimatePresetsDto, @Req() req: RequestWithUser) {
    return this.service.setGlobalEstimatePresets(dto, req.user?.id);
  }

  @Get('estimate-presets/trash')
  findEstimatePresetsTrash(
    @Query('kind') kind: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.findEstimatePresetsTrash(kind as ContractDocumentPackageKind, {
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  @Post('estimate-presets/:presetId/restore')
  restoreEstimatePreset(@Param('presetId') presetId: string, @Query('kind') kind: string) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.restoreEstimatePresetFromTrash(
      kind as ContractDocumentPackageKind,
      presetId,
    );
  }

  @Delete('estimate-presets/:presetId')
  trashEstimatePreset(
    @Param('presetId') presetId: string,
    @Query('kind') kind: string,
    @Req() req: RequestWithUser,
  ) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.trashEstimatePreset(
      kind as ContractDocumentPackageKind,
      presetId,
      req.user?.id,
    );
  }

  @Get('executor-profiles')
  getGlobalExecutorProfiles(@Query('kind') kind: string) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.getGlobalExecutorProfiles(kind as ContractDocumentPackageKind);
  }

  @Put('executor-profiles')
  setGlobalExecutorProfiles(
    @Body() dto: SetGlobalExecutorProfilesDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.setGlobalExecutorProfiles(dto, req.user?.id);
  }

  @Get('signatory-profiles')
  getGlobalSignatoryProfiles(@Query('kind') kind: string) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.getGlobalSignatoryProfiles(kind as ContractDocumentPackageKind);
  }

  @Put('signatory-profiles')
  setGlobalSignatoryProfiles(
    @Body() dto: SetGlobalSignatoryProfilesDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.setGlobalSignatoryProfiles(dto, req.user?.id);
  }

  @Get('repair-settings')
  getRepairSettings() {
    return this.service.getRepairSettings();
  }

  @Put('repair-settings')
  @Roles('SUPER_ADMIN')
  setRepairSettings(@Body() dto: SetRepairContractSettingsDto, @Req() req: RequestWithUser) {
    return this.service.setRepairSettings(dto, req.user?.id);
  }

  @Post('repair-settings/apply-work-period-to-all')
  @Roles('SUPER_ADMIN')
  applyRepairWorkPeriodToAll(@Body() dto: ApplyRepairWorkPeriodToAllDto) {
    return this.service.applyRepairWorkPeriodToAllPackages(dto);
  }

  @Get(':id/versions')
  listVersions(@Param('id') id: string) {
    return this.service.listVersions(id);
  }

  @Get(':id/versions/:versionId')
  getVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.service.getVersion(id, versionId);
  }

  @Get(':id/payments')
  listPackagePayments(@Param('id') id: string) {
    return this.packagePayments.list(id);
  }

  @Post(':id/payments')
  createPackagePayment(
    @Param('id') id: string,
    @Body() dto: CreateContractDocumentPackagePaymentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.packagePayments.create(id, dto, req.user?.id);
  }

  @Patch(':id/payments/:paymentId')
  updatePackagePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdateContractDocumentPackagePaymentDto,
  ) {
    return this.packagePayments.update(id, paymentId, dto);
  }

  @Delete(':id/payments/:paymentId')
  removePackagePayment(@Param('id') id: string, @Param('paymentId') paymentId: string) {
    return this.packagePayments.remove(id, paymentId);
  }

  @Post(':id/upload-work-start-act-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(repairWorkStartActsDir)) {
            fs.mkdirSync(repairWorkStartActsDir, { recursive: true });
          }
          cb(null, repairWorkStartActsDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `work-start-act-${Date.now()}${path.extname(file.originalname) || '.jpg'}`);
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
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
  async uploadWorkStartActPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const pkg = await this.service.findOne(id);
    if (pkg.kind !== ContractDocumentPackageKind.REPAIR) {
      throw new BadRequestException('Доступно только для пакета «Ремонт»');
    }
    const filename = path.basename(file.path);
    return { imageUrl: `/uploads/contract-document-packages/work-start-acts/${filename}` };
  }

  @Post(':id/upload-contract-close-act-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(repairContractCloseActsDir)) {
            fs.mkdirSync(repairContractCloseActsDir, { recursive: true });
          }
          cb(null, repairContractCloseActsDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `contract-close-act-${Date.now()}${path.extname(file.originalname) || '.jpg'}`);
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
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
  async uploadContractCloseActPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const pkg = await this.service.findOne(id);
    if (pkg.kind !== ContractDocumentPackageKind.REPAIR) {
      throw new BadRequestException('Доступно только для пакета «Ремонт»');
    }
    const filename = path.basename(file.path);
    return { imageUrl: `/uploads/contract-document-packages/contract-close-acts/${filename}` };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDocumentPackageDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.update(id, dto, req.user?.id);
  }

  @Post(':id/restore')
  restoreFromTrash(@Param('id') id: string) {
    return this.service.restoreFromTrash(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.moveToTrash(id, req.user?.id);
  }
}
