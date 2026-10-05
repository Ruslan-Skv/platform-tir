import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import type { ContractDocumentSigningSessionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  type SigningSessionDocumentMeta,
  isUnsignedSigningAttachment,
} from '../signing-session-documents';
import { formatMsp } from './signing-pdf';
import { SigningStampService, type SignedArtifactsResult } from './signing-stamp.service';
import { buildSignUrl, signingSiteUrl, toSigningSessionAdminDto } from '../signing-session-dto';

/**
 * Финализация подписанной сессии ЭП: копии документов с отметкой Заказчика,
 * протокол, единый PDF-комплект и письмо клиенту со вложением.
 * Ошибка финализации не отменяет подпись — комплект можно (пере)сформировать
 * из админки (finalizeSession).
 */
@Injectable()
export class SigningCompletionService {
  private readonly logger = new Logger(SigningCompletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
    private readonly stamp: SigningStampService,
  ) {}

  /**
   * (Пере)генерация подписанных копий и единого комплекта (в т.ч. легаси-сессий).
   * skipEmail — переформирование по кнопке из админки: заказчику письмо не отправляется
   * (оно уже ушло при подписании; повторный клик менеджера не должен спамить клиента).
   */
  async finalizeSession(packageId: string, sessionId: string, opts?: { skipEmail?: boolean }) {
    const row = await this.prisma.contractDocumentSigningSession.findFirst({
      where: { id: sessionId, packageId },
    });
    if (!row) throw new NotFoundException('Сессия не найдена');
    if (row.status !== 'SIGNED') {
      throw new BadRequestException('Комплект формируется только для подписанных сессий');
    }
    await this.finalizeSignedArtifacts(sessionId, opts);
    const fresh = await this.prisma.contractDocumentSigningSession.findUnique({
      where: { id: sessionId },
    });
    if (!fresh) throw new NotFoundException('Сессия не найдена');
    return toSigningSessionAdminDto(fresh, buildSignUrl(signingSiteUrl(this.config), fresh.token));
  }

  /** Возвращает артефакты финализации (для отметок об актах в formData) либо null. */
  async finalizeSignedArtifacts(
    sessionId: string,
    opts?: { skipEmail?: boolean },
  ): Promise<SignedArtifactsResult | null> {
    const row = await this.prisma.contractDocumentSigningSession.findUnique({
      where: { id: sessionId },
      include: { package: { select: { title: true } } },
    });
    if (!row || !isSigned(row.status)) return null;

    const artifacts = await this.stamp.buildSignedArtifacts({
      sessionId: row.id,
      documents: (Array.isArray(row.documents)
        ? row.documents
        : []) as SigningSessionDocumentMeta[],
      packageTitle: row.package.title ?? 'Договор',
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerEmail: row.customerEmail,
      contractorLabel: row.contractorLabel,
      contractorSignatory: row.contractorSignatory,
      signedName: row.signedName,
      createdAt: row.createdAt,
      viewedAt: row.viewedAt,
      signedAt: row.signedAt,
      signedIp: row.signedIp,
      signedUserAgent: row.signedUserAgent,
      siteUrl: signingSiteUrl(this.config),
    });

    await this.prisma.contractDocumentSigningSession.update({
      where: { id: row.id },
      data: {
        documents: artifacts.documents,
        signedPackageUrl: artifacts.signedPackageUrl,
      },
    });

    if (row.customerEmail && !opts?.skipEmail) {
      await this.sendSignedPackageEmail({
        to: row.customerEmail,
        customerName: row.customerName,
        signedName: row.signedName,
        signedAt: row.signedAt ?? row.createdAt,
        packageTitle: row.package.title ?? 'Договор',
        packageBuffer: artifacts.packageBuffer,
        // В перечне подписанных — только документы с ЭП (справочные вложения не входят).
        documentLabels: artifacts.documents
          .filter((d) => !isUnsignedSigningAttachment(d))
          .map((d) => d.label),
      });
    }

    return artifacts;
  }

  /** Письмо «Документы подписаны» с копией подписанного комплекта во вложении. */
  private async sendSignedPackageEmail(input: {
    to: string;
    customerName: string | null;
    signedName: string | null;
    signedAt: Date;
    packageTitle: string;
    packageBuffer: Buffer;
    documentLabels: string[];
  }): Promise<boolean> {
    const from = this.config.get<string>('MAIL_FROM') || 'noreply@example.com';
    const name = input.customerName?.trim() || 'Здравствуйте';
    const docs = input.documentLabels.map((l) => `• ${l}`).join('\n');
    const when = formatMsp(input.signedAt);
    // Почтовые серверы режут вложения за ~20–25 МБ — очень крупные комплекты не вкладываем.
    const attachments =
      input.packageBuffer.length <= 14 * 1024 * 1024
        ? [
            {
              filename: 'Podpisannye_dokumenty.pdf',
              content: input.packageBuffer,
              contentType: 'application/pdf',
            },
          ]
        : [];
    const tail =
      'Копия подписанного комплекта с отметками о подписании и протоколом — во вложении. Подписанный комплект также хранится на сайте.';
    try {
      await this.mailer.sendMail({
        from: `"Договоры" <${from}>`,
        to: input.to,
        subject: `Документы подписаны — ${input.packageTitle}`,
        text: `${name}!\n\nДокументы подписаны простой электронной подписью${input.signedName ? ` (${input.signedName})` : ''}.\nДата и время подписания: ${when}\n\nПодписанные документы:\n${docs}\n\n${tail}`,
        html: `<p>${name}!</p><p>Документы подписаны простой электронной подписью${input.signedName ? ` (${input.signedName})` : ''}. Дата и время подписания: <strong>${when}</strong>.</p><p>Подписанные документы:</p><ul>${input.documentLabels.map((l) => `<li>${l}</li>`).join('')}</ul><p>${tail}</p>`,
        attachments,
      });
      return true;
    } catch (err) {
      this.logger.error(
        `Не удалось отправить письмо с подписанным комплектом (${input.to}): ${(err as Error).message}`,
      );
      return false;
    }
  }
}

function isSigned(status: ContractDocumentSigningSessionStatus): boolean {
  return status === 'SIGNED';
}
