import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import {
  ContractDocumentPackageStatus,
  ContractDocumentSigningSessionStatus,
  Prisma,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '../database/prisma.service';
import { ContractDocumentNumberingService } from '../contract-document-numbering/contract-document-numbering.service';

export type SigningSessionDocumentMeta = {
  tabId: string;
  label: string;
  fileUrl: string;
  fileName: string;
};

const MAX_OTP_ATTEMPTS = 8;
const OTP_TTL_MINUTES = 60 * 24 * 7; // same window as session default; refreshed on create
const DEFAULT_SESSION_DAYS = 7;

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

function randomOtpCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

@Injectable()
export class ContractDocumentSigningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
    private readonly contractNumbering: ContractDocumentNumberingService,
  ) {}

  private siteUrl(): string {
    return (this.config.get<string>('SITE_URL') || 'http://localhost:3000').replace(/\/$/, '');
  }

  buildSignUrl(token: string): string {
    return `${this.siteUrl()}/sign/${token}`;
  }

  private ensureUploadDir(): string {
    const dir = path.join(process.cwd(), 'uploads', 'contract-document-packages', 'signing');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  /** Сохраняет загруженные PDF и возвращает метаданные документов. */
  persistUploadedDocuments(
    packageId: string,
    metas: Array<{ tabId: string; label: string }>,
    files: Express.Multer.File[],
  ): SigningSessionDocumentMeta[] {
    if (!metas.length) {
      throw new BadRequestException('Выберите хотя бы один документ');
    }
    if (files.length !== metas.length) {
      throw new BadRequestException('Число файлов должно совпадать с числом документов');
    }
    const dir = this.ensureUploadDir();
    const out: SigningSessionDocumentMeta[] = [];
    for (let i = 0; i < metas.length; i++) {
      const meta = metas[i]!;
      const file = files[i]!;
      if (!file.mimetype?.includes('pdf') && !file.originalname.toLowerCase().endsWith('.pdf')) {
        throw new BadRequestException(`Файл «${file.originalname}» должен быть PDF`);
      }
      const safeTab = (meta.tabId || 'doc').replace(/[^\w-]+/g, '_').slice(0, 40);
      const filename = `${packageId}_${Date.now()}_${i}_${safeTab}.pdf`;
      const fullPath = path.join(dir, filename);
      fs.writeFileSync(fullPath, file.buffer);
      out.push({
        tabId: meta.tabId,
        label: meta.label || meta.tabId,
        fileUrl: `/uploads/contract-document-packages/signing/${filename}`,
        fileName: file.originalname || `${safeTab}.pdf`,
      });
    }
    return out;
  }

  private async patchPackageRemoteSigningMarker(
    packageId: string,
    marker: Record<string, unknown>,
    opts?: { conclude?: boolean; signedName?: string },
  ) {
    const pkg = await this.prisma.contractDocumentPackage.findUnique({ where: { id: packageId } });
    if (!pkg) return;
    let formData =
      pkg.formData && typeof pkg.formData === 'object' && !Array.isArray(pkg.formData)
        ? { ...(pkg.formData as Record<string, unknown>) }
        : {};
    formData._remoteSigning = marker;
    if (opts?.conclude) {
      formData.contractConcludedAt =
        typeof formData.contractConcludedAt === 'string' && formData.contractConcludedAt.trim()
          ? formData.contractConcludedAt
          : new Date().toISOString();
      if (pkg.status === ContractDocumentPackageStatus.IN_PROGRESS) {
        try {
          formData = await this.contractNumbering.finalizeFormDataNumbersOnConclude(
            pkg.kind,
            formData,
            packageId,
          );
          await this.contractNumbering.syncNumberAssignmentsForPackage(packageId, formData);
        } catch {
          /* номер останется черновым; статус всё равно фиксируем */
        }
      }
    }

    const data: Prisma.ContractDocumentPackageUpdateInput = {
      formData: formData as Prisma.InputJsonValue,
    };
    if (opts?.conclude && pkg.status === ContractDocumentPackageStatus.IN_PROGRESS) {
      data.status = ContractDocumentPackageStatus.CONTRACT_CONCLUDED;
    }

    await this.prisma.contractDocumentPackage.update({
      where: { id: packageId },
      data,
    });

    if (opts?.conclude) {
      await this.appendSigningVersion(packageId, formData, pkg.status, opts.signedName);
    }
  }

  private async appendSigningVersion(
    packageId: string,
    formData: Record<string, unknown>,
    previousStatus: ContractDocumentPackageStatus,
    signedName?: string,
  ) {
    const latest = await this.prisma.contractDocumentPackageVersion.findFirst({
      where: { packageId },
      orderBy: { versionNumber: 'desc' },
    });
    const nextNumber = (latest?.versionNumber ?? 0) + 1;
    const pkg = await this.prisma.contractDocumentPackage.findUnique({ where: { id: packageId } });
    if (!pkg) return;
    await this.prisma.contractDocumentPackageVersion.create({
      data: {
        packageId,
        versionNumber: nextNumber,
        title: pkg.title,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData: formData as Prisma.InputJsonValue,
        crmContractId: pkg.crmContractId,
        savedById: null,
      },
    });
    void previousStatus;
    void signedName;
  }

  async createSession(input: {
    packageId: string;
    createdById: string | null;
    documents: SigningSessionDocumentMeta[];
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    managerNote?: string | null;
    expiresInDays?: number;
    sendEmail?: boolean;
  }) {
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: input.packageId, deletedAt: null },
    });
    if (!pkg) throw new NotFoundException('Пакет документов не найден');

    // Cancel previous active sessions for this package and release their number holds
    const previousActive = await this.prisma.contractDocumentSigningSession.findMany({
      where: {
        packageId: input.packageId,
        status: {
          in: [
            ContractDocumentSigningSessionStatus.PENDING,
            ContractDocumentSigningSessionStatus.VIEWED,
          ],
        },
      },
      select: { id: true },
    });
    if (previousActive.length > 0) {
      await this.prisma.contractDocumentSigningSession.updateMany({
        where: { id: { in: previousActive.map((s) => s.id) } },
        data: { status: ContractDocumentSigningSessionStatus.CANCELLED },
      });
      for (const s of previousActive) {
        await this.contractNumbering.releaseHoldsForSession(s.id);
      }
    }

    const token = randomToken();
    const otpCode = randomOtpCode();
    const days =
      Number.isFinite(input.expiresInDays) && (input.expiresInDays as number) > 0
        ? Math.min(30, Math.floor(input.expiresInDays as number))
        : DEFAULT_SESSION_DAYS;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const session = await this.prisma.contractDocumentSigningSession.create({
      data: {
        packageId: input.packageId,
        token,
        status: ContractDocumentSigningSessionStatus.PENDING,
        customerName: input.customerName?.trim() || null,
        customerPhone: input.customerPhone?.trim() || null,
        customerEmail: input.customerEmail?.trim() || null,
        documents: input.documents as unknown as Prisma.InputJsonValue,
        managerNote: input.managerNote?.trim() || null,
        otpCodeHash: sha256Hex(otpCode),
        otpExpiresAt,
        expiresAt,
        createdById: input.createdById,
      },
    });

    try {
      await this.contractNumbering.softReserveNumbersForSigning({
        packageId: input.packageId,
        sessionId: session.id,
        kind: pkg.kind,
        formData: pkg.formData,
        expiresAt,
      });
    } catch {
      /* без кодов нумерации сессия всё равно создаётся */
    }

    const signUrl = this.buildSignUrl(token);
    await this.patchPackageRemoteSigningMarker(input.packageId, {
      sessionId: session.id,
      status: session.status,
      sentAt: session.createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      signedAt: null,
      documentCount: input.documents.length,
    });

    let emailSent = false;
    if (input.sendEmail && session.customerEmail) {
      emailSent = await this.sendSigningEmail({
        to: session.customerEmail,
        customerName: session.customerName,
        signUrl,
        otpCode,
        expiresAt,
        documentLabels: input.documents.map((d) => d.label),
      });
    }

    return {
      id: session.id,
      token,
      signUrl,
      otpCode,
      status: session.status,
      expiresAt: session.expiresAt.toISOString(),
      customerEmail: session.customerEmail,
      customerPhone: session.customerPhone,
      customerName: session.customerName,
      documents: input.documents,
      emailSent,
    };
  }

  private async sendSigningEmail(input: {
    to: string;
    customerName: string | null;
    signUrl: string;
    otpCode: string;
    expiresAt: Date;
    documentLabels: string[];
  }): Promise<boolean> {
    const from = this.config.get<string>('MAIL_FROM') || 'noreply@example.com';
    const name = input.customerName?.trim() || 'Здравствуйте';
    const docs = input.documentLabels.map((l) => `• ${l}`).join('\n');
    const exp = input.expiresAt.toLocaleString('ru-RU');
    try {
      await this.mailer.sendMail({
        from: `"Договоры" <${from}>`,
        to: input.to,
        subject: 'Документы на ознакомление и подписание',
        text: `${name}!\n\nВам направлены документы для ознакомления и подписания:\n${docs}\n\nСсылка: ${input.signUrl}\nКод подтверждения: ${input.otpCode}\nСрок действия: до ${exp}\n\nОткройте ссылку, просмотрите документы и введите код для подписания.`,
        html: `<p>${name}!</p><p>Вам направлены документы для ознакомления и подписания:</p><ul>${input.documentLabels.map((l) => `<li>${l}</li>`).join('')}</ul><p><a href="${input.signUrl}">Открыть документы</a></p><p>Код подтверждения: <strong>${input.otpCode}</strong></p><p>Срок действия: до ${exp}</p>`,
      });
      return true;
    } catch (err) {
      console.error('ContractDocumentSigningService.sendSigningEmail error:', err);
      return false;
    }
  }

  async listForPackage(packageId: string) {
    const rows = await this.prisma.contractDocumentSigningSession.findMany({
      where: { packageId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map((row) => this.toAdminDto(row));
  }

  private toAdminDto(row: {
    id: string;
    token: string;
    status: ContractDocumentSigningSessionStatus;
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    documents: Prisma.JsonValue;
    managerNote: string | null;
    expiresAt: Date;
    viewedAt: Date | null;
    signedAt: Date | null;
    rejectedAt: Date | null;
    rejectionReason: string | null;
    signedName: string | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      status: row.status,
      signUrl: this.buildSignUrl(row.token),
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerEmail: row.customerEmail,
      documents: row.documents,
      managerNote: row.managerNote,
      expiresAt: row.expiresAt.toISOString(),
      viewedAt: row.viewedAt?.toISOString() ?? null,
      signedAt: row.signedAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      rejectionReason: row.rejectionReason,
      signedName: row.signedName,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async cancelSession(packageId: string, sessionId: string) {
    const row = await this.prisma.contractDocumentSigningSession.findFirst({
      where: { id: sessionId, packageId },
    });
    if (!row) throw new NotFoundException('Сессия не найдена');
    if (
      row.status !== ContractDocumentSigningSessionStatus.PENDING &&
      row.status !== ContractDocumentSigningSessionStatus.VIEWED
    ) {
      throw new BadRequestException('Нельзя отменить завершённую сессию');
    }
    const updated = await this.prisma.contractDocumentSigningSession.update({
      where: { id: sessionId },
      data: { status: ContractDocumentSigningSessionStatus.CANCELLED },
    });
    await this.contractNumbering.releaseHoldsForSession(sessionId);
    await this.patchPackageRemoteSigningMarker(packageId, {
      sessionId: updated.id,
      status: updated.status,
      sentAt: updated.createdAt.toISOString(),
      expiresAt: updated.expiresAt.toISOString(),
      signedAt: null,
      documentCount: Array.isArray(updated.documents) ? updated.documents.length : 0,
    });
    return this.toAdminDto(updated);
  }

  private async getByTokenOrThrow(token: string) {
    const row = await this.prisma.contractDocumentSigningSession.findUnique({
      where: { token },
      include: {
        package: { select: { id: true, kind: true, title: true, status: true, deletedAt: true } },
      },
    });
    if (!row || row.package.deletedAt) throw new NotFoundException('Ссылка недействительна');
    if (row.status === ContractDocumentSigningSessionStatus.CANCELLED) {
      throw new ForbiddenException('Ссылка отозвана');
    }
    if (
      row.status !== ContractDocumentSigningSessionStatus.SIGNED &&
      row.status !== ContractDocumentSigningSessionStatus.REJECTED &&
      row.expiresAt.getTime() < Date.now()
    ) {
      if (row.status !== ContractDocumentSigningSessionStatus.EXPIRED) {
        await this.prisma.contractDocumentSigningSession.update({
          where: { id: row.id },
          data: { status: ContractDocumentSigningSessionStatus.EXPIRED },
        });
        await this.contractNumbering.releaseHoldsForSession(row.id);
      }
      throw new ForbiddenException('Срок действия ссылки истёк');
    }
    return row;
  }

  async getPublicSession(token: string) {
    const row = await this.getByTokenOrThrow(token);
    const documents = (
      Array.isArray(row.documents) ? row.documents : []
    ) as SigningSessionDocumentMeta[];
    return {
      status: row.status,
      customerName: row.customerName,
      contractTitle: row.package.title,
      packageKind: row.package.kind,
      managerNote: row.managerNote,
      expiresAt: row.expiresAt.toISOString(),
      viewedAt: row.viewedAt?.toISOString() ?? null,
      signedAt: row.signedAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      signedName: row.signedName,
      documents: documents.map((d) => ({
        tabId: d.tabId,
        label: d.label,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
      })),
      canSign:
        row.status === ContractDocumentSigningSessionStatus.PENDING ||
        row.status === ContractDocumentSigningSessionStatus.VIEWED,
    };
  }

  async markViewed(token: string) {
    const row = await this.getByTokenOrThrow(token);
    if (row.status === ContractDocumentSigningSessionStatus.PENDING) {
      const updated = await this.prisma.contractDocumentSigningSession.update({
        where: { id: row.id },
        data: {
          status: ContractDocumentSigningSessionStatus.VIEWED,
          viewedAt: new Date(),
        },
      });
      await this.patchPackageRemoteSigningMarker(row.packageId, {
        sessionId: updated.id,
        status: updated.status,
        sentAt: updated.createdAt.toISOString(),
        expiresAt: updated.expiresAt.toISOString(),
        viewedAt: updated.viewedAt?.toISOString() ?? null,
        signedAt: null,
        documentCount: Array.isArray(updated.documents) ? updated.documents.length : 0,
      });
    }
    return this.getPublicSession(token);
  }

  async sign(
    token: string,
    input: { otpCode: string; signedName: string; consent: boolean },
    meta: { ip?: string; userAgent?: string },
  ) {
    if (!input.consent) {
      throw new BadRequestException('Необходимо согласие с условиями подписания');
    }
    const signedName = input.signedName?.trim();
    if (!signedName || signedName.length < 2) {
      throw new BadRequestException('Укажите ФИО подписанта');
    }
    const otpCode = String(input.otpCode || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(otpCode)) {
      throw new BadRequestException('Введите 6-значный код подтверждения');
    }

    const row = await this.getByTokenOrThrow(token);
    if (
      row.status !== ContractDocumentSigningSessionStatus.PENDING &&
      row.status !== ContractDocumentSigningSessionStatus.VIEWED
    ) {
      throw new BadRequestException('Документы уже подписаны или отклонены');
    }
    if (row.otpAttempts >= MAX_OTP_ATTEMPTS) {
      throw new ForbiddenException('Превышено число попыток ввода кода');
    }
    if (row.otpExpiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Срок действия кода истёк — запросите новую ссылку у менеджера');
    }

    const ok = sha256Hex(otpCode) === row.otpCodeHash;
    if (!ok) {
      await this.prisma.contractDocumentSigningSession.update({
        where: { id: row.id },
        data: { otpAttempts: { increment: 1 } },
      });
      throw new BadRequestException('Неверный код подтверждения');
    }

    const updated = await this.prisma.contractDocumentSigningSession.update({
      where: { id: row.id },
      data: {
        status: ContractDocumentSigningSessionStatus.SIGNED,
        signedAt: new Date(),
        viewedAt: row.viewedAt ?? new Date(),
        signedName,
        signedIp: meta.ip?.slice(0, 64) || null,
        signedUserAgent: meta.userAgent?.slice(0, 500) || null,
      },
    });

    await this.patchPackageRemoteSigningMarker(
      row.packageId,
      {
        sessionId: updated.id,
        status: updated.status,
        sentAt: updated.createdAt.toISOString(),
        expiresAt: updated.expiresAt.toISOString(),
        viewedAt: updated.viewedAt?.toISOString() ?? null,
        signedAt: updated.signedAt?.toISOString() ?? null,
        signedName,
        documentCount: Array.isArray(updated.documents) ? updated.documents.length : 0,
      },
      { conclude: true, signedName },
    );

    return this.getPublicSession(token);
  }

  async reject(token: string, reason?: string) {
    const row = await this.getByTokenOrThrow(token);
    if (
      row.status !== ContractDocumentSigningSessionStatus.PENDING &&
      row.status !== ContractDocumentSigningSessionStatus.VIEWED
    ) {
      throw new BadRequestException('Сессия уже завершена');
    }
    const updated = await this.prisma.contractDocumentSigningSession.update({
      where: { id: row.id },
      data: {
        status: ContractDocumentSigningSessionStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason?.trim() || null,
        viewedAt: row.viewedAt ?? new Date(),
      },
    });
    await this.contractNumbering.releaseHoldsForSession(row.id);
    await this.patchPackageRemoteSigningMarker(row.packageId, {
      sessionId: updated.id,
      status: updated.status,
      sentAt: updated.createdAt.toISOString(),
      expiresAt: updated.expiresAt.toISOString(),
      viewedAt: updated.viewedAt?.toISOString() ?? null,
      signedAt: null,
      rejectedAt: updated.rejectedAt?.toISOString() ?? null,
      rejectionReason: updated.rejectionReason,
      documentCount: Array.isArray(updated.documents) ? updated.documents.length : 0,
    });
    return this.getPublicSession(token);
  }
}
