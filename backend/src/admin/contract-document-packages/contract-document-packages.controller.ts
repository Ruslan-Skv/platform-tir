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
import { ContractDocumentPackageKind, ContractDocumentPackageStatus } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { ContractDocumentPaymentInvoicesService } from './contract-document-payment-invoices.service';
import { ContractDocumentPackagePaymentsService } from './contract-document-package-payments.service';
import { ContractDocumentPackagesService } from './contract-document-packages.service';
import { ContractDocumentNumberingService } from './numbering/contract-document-numbering.service';
import { CreateContractDocumentPaymentInvoiceDto } from './dto/create-contract-document-payment-invoice.dto';
import { PreviewContractNumberDto } from './dto/preview-contract-number.dto';
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
import {
  ApplyWorkPeriodToAllByKindDto,
  SetWorkPeriodSettingsByKindDto,
} from './dto/set-work-period-settings-by-kind.dto';
import { SetWindowsWorkOrderMarkupDto } from './dto/set-windows-work-order-markup.dto';
import { SetWorkOrderMarkupByKindDto } from './dto/set-work-order-markup-by-kind.dto';
import { SetWindowsContractSettingsDto } from './dto/set-windows-settings.dto';
import { SetCeilingsPriceListDto } from './dto/set-ceilings-price-list.dto';

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

const windowsSpecificationsDir = path.join(
  process.cwd(),
  'uploads',
  'contract-document-packages',
  'windows-specifications',
);

const WINDOWS_SPEC_BLOCKED_EXTENSIONS =
  /\.(exe|bat|cmd|com|msi|scr|dll|vbs|ps1|sh|jar|cpl|inf|reg|hta|msc|lnk|pif)$/i;

function sanitizeWindowsSpecificationStoredFilename(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase();
  const base =
    path
      .basename(originalname, ext)
      .replace(/[^\w\u0400-\u04FF.\-()+ ]/gu, '_')
      .replace(/_+/g, '_')
      .slice(0, 80) || 'file';
  return `windows-spec-${Date.now()}-${base}${ext}`;
}

@Controller('admin/contract-document-packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class ContractDocumentPackagesController {
  constructor(
    private readonly service: ContractDocumentPackagesService,
    private readonly packagePayments: ContractDocumentPackagePaymentsService,
    private readonly paymentInvoices: ContractDocumentPaymentInvoicesService,
    private readonly contractNumbering: ContractDocumentNumberingService,
  ) {}

  @Post()
  create(@Body() dto: CreateContractDocumentPackageDto, @Req() req: RequestWithUser) {
    return this.service.create(dto, req.user?.id);
  }

  @Get()
  findAll(
    @Query('kind') kind?: string,
    @Query('kinds') kindsRaw?: string,
    @Query('responsibleManagerId') responsibleManagerId?: string,
    @Query('statuses') statusesRaw?: string,
    @Query('search') search?: string,
    @Query('pipelineStatuses') pipelineStatusesRaw?: string,
    @Query('managerId') managerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('directionIds') directionIdsRaw?: string,
    @Query('sortBy') sortByRaw?: string,
    @Query('sortOrder') sortOrderRaw?: string,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('includeCounts') includeCountsRaw?: string,
    @Query('countsUserId') countsUserId?: string,
    @Query('countsMyDirectionIds') countsMyDirectionIdsRaw?: string,
    @Query('paginated') paginatedRaw?: string,
  ) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    const k = kind && allowed.has(kind) ? (kind as ContractDocumentPackageKind) : undefined;
    const kinds = (kindsRaw ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item): item is ContractDocumentPackageKind => allowed.has(item));
    const allowedStatuses = new Set<string>(Object.values(ContractDocumentPackageStatus));
    const statuses = (statusesRaw ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item): item is ContractDocumentPackageStatus => allowedStatuses.has(item));
    const allowedPipeline = new Set([
      'IN_PROJECT',
      'SIGNED',
      'WORK_IN_PROGRESS',
      'CLOSED',
      'REFUSED',
    ]);
    const pipelineStatuses = (pipelineStatusesRaw ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item): item is 'IN_PROJECT' | 'SIGNED' | 'WORK_IN_PROGRESS' | 'CLOSED' | 'REFUSED' =>
        allowedPipeline.has(item),
      );
    const directionIds = (directionIdsRaw ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const countsMyDirectionIds = (countsMyDirectionIdsRaw ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const allowedSort = new Set([
      'date',
      'contractNumber',
      'status',
      'customer',
      'manager',
      'updatedAt',
    ]);
    const sortBy =
      sortByRaw && allowedSort.has(sortByRaw)
        ? (sortByRaw as 'date' | 'contractNumber' | 'status' | 'customer' | 'manager' | 'updatedAt')
        : undefined;
    const sortOrder = sortOrderRaw === 'asc' || sortOrderRaw === 'desc' ? sortOrderRaw : undefined;
    const page = pageRaw ? parseInt(pageRaw, 10) : undefined;
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
    const includeCounts =
      includeCountsRaw === '1' || includeCountsRaw === 'true' || includeCountsRaw === 'yes';
    const paginated =
      paginatedRaw === '1' || paginatedRaw === 'true' || paginatedRaw === 'yes' || page != null;

    return this.service.findAll({
      kind: k,
      kinds,
      responsibleManagerId: responsibleManagerId?.trim() || undefined,
      statuses,
      search: search?.trim() || undefined,
      pipelineStatuses,
      managerId: managerId?.trim() || undefined,
      dateFrom: dateFrom?.trim() || undefined,
      dateTo: dateTo?.trim() || undefined,
      directionIds,
      sortBy,
      sortOrder,
      page: Number.isFinite(page) ? page : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
      includeCounts,
      countsUserId: countsUserId?.trim() || undefined,
      countsMyDirectionIds,
      paginated,
    });
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

  @Get('contract-templates/trash')
  findContractTemplatesTrash(
    @Query('kind') kind: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.findContractTemplatesTrash(kind as ContractDocumentPackageKind, {
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  @Post('contract-templates/:presetId/restore')
  @Roles('SUPER_ADMIN')
  restoreContractTemplate(
    @Param('presetId') presetId: string,
    @Query('kind') kind: string,
    @Req() req: RequestWithUser,
  ) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.restoreContractTemplateFromTrash(
      kind as ContractDocumentPackageKind,
      presetId,
      req.user?.id,
    );
  }

  @Delete('contract-templates/:presetId')
  @Roles('SUPER_ADMIN')
  trashContractTemplate(
    @Param('presetId') presetId: string,
    @Query('kind') kind: string,
    @Req() req: RequestWithUser,
  ) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.trashContractTemplate(
      kind as ContractDocumentPackageKind,
      presetId,
      req.user?.id,
    );
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

  @Get('ceilings-price-list')
  getCeilingsPriceList() {
    return this.service.getCeilingsPriceList();
  }

  @Put('ceilings-price-list')
  setCeilingsPriceList(@Body() dto: SetCeilingsPriceListDto, @Req() req: RequestWithUser) {
    return this.service.setCeilingsPriceList(dto, req.user?.id);
  }

  @Get('estimate-presets/trash')
  findEstimatePresetsTrash(
    @Query('kind') kind: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('mine') mine?: string,
    @Req() req?: RequestWithUser,
  ) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    const mineOnly = mine === '1' || mine === 'true';
    if (mineOnly && !req?.user?.id) {
      return {
        data: [],
        total: 0,
        page: page ? parseInt(page, 10) || 1 : 1,
        limit: limit ? parseInt(limit, 10) || 25 : 25,
        totalPages: 1,
      };
    }
    return this.service.findEstimatePresetsTrash(kind as ContractDocumentPackageKind, {
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
      createdById: mineOnly ? req?.user?.id : undefined,
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

  @Get('work-period-settings')
  getWorkPeriodSettings(@Query('kind') kind: string) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    return this.service.getWorkPeriodSettings(kind as ContractDocumentPackageKind);
  }

  @Put('work-period-settings')
  @Roles('SUPER_ADMIN')
  setWorkPeriodSettings(@Body() dto: SetWorkPeriodSettingsByKindDto, @Req() req: RequestWithUser) {
    return this.service.setWorkPeriodSettings(
      dto.kind,
      { defaultWorkPeriodDays: dto.defaultWorkPeriodDays },
      req.user?.id,
    );
  }

  @Post('work-period-settings/apply-to-all')
  @Roles('SUPER_ADMIN')
  applyWorkPeriodToAllByKind(@Body() dto: ApplyWorkPeriodToAllByKindDto) {
    return this.service.applyWorkPeriodToAllPackages(dto.kind, {
      workPeriodDays: dto.workPeriodDays,
    });
  }

  @Get('windows-settings')
  getWindowsSettings() {
    return this.service.getWindowsSettings();
  }

  @Put('windows-settings')
  @Roles('SUPER_ADMIN')
  setWindowsSettings(@Body() dto: SetWindowsContractSettingsDto, @Req() req: RequestWithUser) {
    return this.service.setWindowsSettings(dto, req.user?.id);
  }

  @Post('windows-settings/apply-work-period-to-all')
  @Roles('SUPER_ADMIN')
  applyWindowsWorkPeriodToAll(@Body() dto: ApplyRepairWorkPeriodToAllDto) {
    return this.service.applyWindowsWorkPeriodToAllPackages(dto);
  }

  @Get('work-order-markup-settings')
  getWorkOrderMarkupSettings(@Query('kind') kind: string) {
    const allowed = new Set<string>([
      ContractDocumentPackageKind.WINDOWS,
      ContractDocumentPackageKind.DOORS,
      ContractDocumentPackageKind.BLINDS,
      ContractDocumentPackageKind.CEILINGS,
    ]);
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите kind: WINDOWS, DOORS, BLINDS или CEILINGS');
    }
    return this.service.getWorkOrderMarkupSettings(kind as ContractDocumentPackageKind);
  }

  @Put('work-order-markup-settings')
  @Roles('SUPER_ADMIN')
  setWorkOrderMarkupSettings(
    @Body() dto: SetWorkOrderMarkupByKindDto,
    @Req() req: RequestWithUser,
  ) {
    const allowed = new Set<ContractDocumentPackageKind>([
      ContractDocumentPackageKind.WINDOWS,
      ContractDocumentPackageKind.DOORS,
      ContractDocumentPackageKind.BLINDS,
      ContractDocumentPackageKind.CEILINGS,
    ]);
    if (!allowed.has(dto.kind)) {
      throw new BadRequestException('Укажите kind: WINDOWS, DOORS, BLINDS или CEILINGS');
    }
    return this.service.setWorkOrderMarkupSettings(
      dto.kind,
      { windowsWorkOrderMarkupPercent: dto.windowsWorkOrderMarkupPercent },
      req.user?.id,
    );
  }

  /** @deprecated Используйте GET work-order-markup-settings?kind=WINDOWS. */
  @Get('windows-settings/work-order-markup')
  getWindowsWorkOrderMarkupSettings() {
    return this.service.getWindowsWorkOrderMarkupSettings();
  }

  /** @deprecated Используйте PUT work-order-markup-settings. */
  @Put('windows-settings/work-order-markup')
  @Roles('SUPER_ADMIN')
  setWindowsWorkOrderMarkupSettings(
    @Body() dto: SetWindowsWorkOrderMarkupDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.setWindowsWorkOrderMarkupSettings(dto, req.user?.id);
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

  @Get(':id/payment-invoices')
  listPackagePaymentInvoices(@Param('id') id: string) {
    return this.paymentInvoices.listForPackage(id);
  }

  @Post(':id/payment-invoices')
  createPackagePaymentInvoice(
    @Param('id') id: string,
    @Body() dto: CreateContractDocumentPaymentInvoiceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.paymentInvoices.create(id, dto, req.user?.id);
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

  @Post(':id/upload-windows-specification-file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(windowsSpecificationsDir)) {
            fs.mkdirSync(windowsSpecificationsDir, { recursive: true });
          }
          cb(null, windowsSpecificationsDir);
        },
        filename: (_req, file, cb) => {
          cb(null, sanitizeWindowsSpecificationStoredFilename(file.originalname));
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ext) {
          cb(
            new BadRequestException(
              'Укажите файл с расширением (например pdf, docx, xlsx, dwg, zip, jpg).',
            ),
            false,
          );
          return;
        }
        if (WINDOWS_SPEC_BLOCKED_EXTENSIONS.test(ext)) {
          cb(
            new BadRequestException(
              'Этот тип файла нельзя загружать. Используйте документы, изображения, архивы или файлы САПР.',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadWindowsSpecificationFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const pkg = await this.service.findOne(id);
    if (
      pkg.kind !== ContractDocumentPackageKind.WINDOWS &&
      pkg.kind !== ContractDocumentPackageKind.DOORS &&
      pkg.kind !== ContractDocumentPackageKind.BLINDS &&
      pkg.kind !== ContractDocumentPackageKind.CEILINGS
    ) {
      throw new BadRequestException(
        'Доступно только для товарных пакетов (Окна, Двери, Жалюзи, Натяжные потолки)',
      );
    }
    const filename = path.basename(file.path);
    return {
      fileUrl: `/uploads/contract-document-packages/windows-specifications/${filename}`,
      fileName: file.originalname,
      mimeType: file.mimetype || null,
      size: file.size ?? null,
    };
  }

  @Get('payment-invoices/next-number')
  peekPaymentInvoiceNumber() {
    return this.paymentInvoices.peekNextInvoiceNumber();
  }

  @Get('contract-number/preview')
  previewContractNumber(
    @Query('managerUserId') managerUserId: string,
    @Query('surveyorUserId') surveyorUserId: string,
    @Query('officeId') officeId: string,
    @Query('kind') kind: string,
    @Query('numberLetterOverride') numberLetterOverride?: string,
  ) {
    return this.contractNumbering.preview({
      managerUserId,
      surveyorUserId,
      officeId,
      kind: kind as ContractDocumentPackageKind,
      numberLetterOverride,
    });
  }

  @Post('contract-number/allocate')
  allocateContractNumber(@Body() dto: PreviewContractNumberDto) {
    return this.contractNumbering.allocate(dto);
  }

  @Get('payment-invoices')
  listAllPaymentInvoices(
    @Query('search') search?: string,
    @Query('packageId') packageId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentInvoices.listAll({
      search,
      packageId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
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
