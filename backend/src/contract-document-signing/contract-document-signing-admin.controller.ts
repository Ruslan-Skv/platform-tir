import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestWithUser } from '../common/types/request-with-user.types';
import { ContractDocumentSigningService } from './contract-document-signing.service';

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

type CreateBody = {
  documentsMeta?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  managerNote?: string;
  expiresInDays?: string;
  sendEmail?: string;
};

@Controller('admin/contract-document-packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class ContractDocumentSigningAdminController {
  constructor(private readonly signing: ContractDocumentSigningService) {}

  @Get(':packageId/signing-sessions')
  list(@Param('packageId') packageId: string) {
    return this.signing.listForPackage(packageId);
  }

  @Post(':packageId/signing-sessions')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async create(
    @Param('packageId') packageId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: CreateBody,
    @Req() req: RequestWithUser,
  ) {
    let metas: Array<{ tabId: string; label: string; isExternalFile?: boolean }> = [];
    try {
      const raw = body.documentsMeta ? JSON.parse(body.documentsMeta) : [];
      if (!Array.isArray(raw)) throw new Error('not array');
      metas = raw.map((row: { tabId?: string; label?: string; isExternalFile?: boolean }) => ({
        tabId: String(row.tabId || '').trim(),
        label: String(row.label || '').trim() || String(row.tabId || 'Документ'),
        isExternalFile: row.isExternalFile === true,
      }));
    } catch {
      throw new BadRequestException('Некорректный documentsMeta (ожидается JSON-массив)');
    }
    if (!metas.length || metas.some((m) => !m.tabId)) {
      throw new BadRequestException('Укажите документы для отправки');
    }
    // До записи файлов на диск: договор «Ремонт» без сметы нельзя отправить на подписание.
    await this.signing.assertCanCreateSigningSession(packageId);
    const docs = this.signing.persistUploadedDocuments(packageId, metas, files || []);
    const expiresInDays = body.expiresInDays ? Number(body.expiresInDays) : undefined;
    const sendEmail = body.sendEmail === '1' || body.sendEmail === 'true';
    return this.signing.createSession({
      packageId,
      createdById: req.user?.id ?? null,
      documents: docs,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      managerNote: body.managerNote,
      expiresInDays,
      sendEmail,
    });
  }

  @Post(':packageId/signing-sessions/:sessionId/cancel')
  cancel(@Param('packageId') packageId: string, @Param('sessionId') sessionId: string) {
    return this.signing.cancelSession(packageId, sessionId);
  }
}
