import { Injectable } from '@nestjs/common';
import { ContractDocumentPackageStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ContractDocumentNumberingService } from '../contract-document-numbering/contract-document-numbering.service';
import { ContractConcludedNotifyService } from '../contract-concluded-notify/contract-concluded-notify.service';

/**
 * Маркер `_remoteSigning` в formData пакета + закрепление номера, снимок версии
 * и уведомление «Договор подписан» при заключении договора по подписанию клиентом.
 */
@Injectable()
export class SigningPackageMarkerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contractNumbering: ContractDocumentNumberingService,
    private readonly contractConcludedNotify: ContractConcludedNotifyService,
  ) {}

  async patch(
    packageId: string,
    marker: Record<string, unknown>,
    opts?: {
      conclude?: boolean;
      signedName?: string;
      /** Дополнительные поля formData (например, отметки о подписании актов по ЭП). */
      extraFormFields?: Record<string, unknown>;
      /** Записать снимок версии пакета (без смены статуса — для подписания актов). */
      recordVersion?: boolean;
    },
  ) {
    const pkg = await this.prisma.contractDocumentPackage.findUnique({ where: { id: packageId } });
    if (!pkg) return;
    let formData =
      pkg.formData && typeof pkg.formData === 'object' && !Array.isArray(pkg.formData)
        ? { ...(pkg.formData as Record<string, unknown>) }
        : {};
    formData._remoteSigning = marker;
    if (opts?.extraFormFields) {
      Object.assign(formData, opts.extraFormFields);
    }
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

    if (opts?.conclude || opts?.recordVersion) {
      await this.appendSigningVersion(packageId, formData, pkg.status, opts.signedName);
    }

    // Пакет стал «Договор подписан» по подписанию клиентом — уведомляем всех
    // сотрудников с включённым событием этого направления.
    if (opts?.conclude && pkg.status === ContractDocumentPackageStatus.IN_PROGRESS) {
      this.contractConcludedNotify.onConcluded(
        {
          id: packageId,
          kind: pkg.kind,
          title: pkg.title,
          formData,
          responsibleManagerId: pkg.responsibleManagerId,
          createdById: pkg.createdById,
        },
        null,
      );
    }
  }

  /** Убирает маркер `_remoteSigning` из formData (например, при ручном подписании договора). */
  async clearRemoteSigningMarker(packageId: string): Promise<void> {
    const pkg = await this.prisma.contractDocumentPackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.formData || typeof pkg.formData !== 'object' || Array.isArray(pkg.formData)) {
      return;
    }
    const formData = { ...(pkg.formData as Record<string, unknown>) };
    if (!('_remoteSigning' in formData)) return;
    delete formData._remoteSigning;
    await this.prisma.contractDocumentPackage.update({
      where: { id: packageId },
      data: { formData: formData as Prisma.InputJsonValue },
    });
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
        savedById: null,
      },
    });
    void previousStatus;
    void signedName;
  }
}
