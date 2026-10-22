import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ContractDocumentPackageKind, ContractDocumentPackageStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { ContractDocumentSigningService } from '../../../contract-document-signing/contract-document-signing.service';
import { ContractDocumentNumberingService } from '../../../contract-document-numbering/contract-document-numbering.service';
import { RepairScheduleFromPackageService } from '../../repair-schedules/repair-schedule-from-package.service';
import { SalaryContractsSyncService } from '../../salary/services/salary-contracts-sync.service';
import { contractDocumentPackageInclude } from '../contract-package.include';
import { revertContractConclusionForm } from '../form/contract-conclusion-revert';
import { ContractDocumentPackageCrudService } from '../contract-document-package-crud.service';

@Injectable()
export class ContractDocumentPackageSigningRevertService {
  private readonly logger = new Logger(ContractDocumentPackageSigningRevertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crud: ContractDocumentPackageCrudService,
    private readonly contractNumbering: ContractDocumentNumberingService,
    private readonly signingSessions: ContractDocumentSigningService,
    private readonly repairScheduleFromPackage: RepairScheduleFromPackageService,
    private readonly salarySync: SalaryContractsSyncService,
  ) {}

  /**
   * Супер-админ: отмена подписания договора вне 5-секундного окна хаба
   * (кнопка «Отменить подписание» в списке договоров). FormData строится из
   * хранимой — данные клиента не используются, поэтому защита устаревшей
   * формы (preserveRemoteSigningStateOnUpdate) здесь не применяется.
   */
  async revertSigning(id: string, actorUserId?: string | null) {
    const row = await this.crud.findOne(id);
    if (row.status !== ContractDocumentPackageStatus.CONTRACT_CONCLUDED) {
      throw new BadRequestException('Отменить подписание можно только у подписанного договора');
    }
    // Возврат в работу отзывает и активные сессии ЭП (маркер _remoteSigning
    // чистится внутри) — иначе пакет висел бы «На согласовании» уже в работе.
    // Выполняется до записи отката, чтобы маркер не попал в снимок версии.
    try {
      await this.signingSessions.cancelActiveSessionsOnManualConclusion(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Отзыв сессий ЭП при отмене подписания пакета ${id} не выполнен: ${message}`,
      );
    }
    const fresh = await this.crud.findOne(id);
    const formDataToSave = revertContractConclusionForm(fresh.formData) as Prisma.InputJsonValue;
    await this.contractNumbering.syncNumberAssignmentsForPackage(id, formDataToSave);
    const updated = await this.prisma.contractDocumentPackage.update({
      where: { id },
      data: {
        formData: formDataToSave,
        status: ContractDocumentPackageStatus.IN_PROGRESS,
      },
      include: contractDocumentPackageInclude,
    });
    await this.crud.appendPackageVersion(
      id,
      {
        title: updated.title,
        formData: updated.formData as Prisma.InputJsonValue,
        status: updated.status,
      },
      actorUserId ?? null,
    );
    // Статус договора в списке изменился — двигаем проект план-графика (как в update()).
    if (updated.kind === ContractDocumentPackageKind.REPAIR) {
      try {
        await this.repairScheduleFromPackage.refreshProjectsSnapshotFromPackage(updated.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Обновление снимка план-графика ремонта для пакета ${updated.id} не удалось: ${message}`,
        );
      }
      try {
        await this.repairScheduleFromPackage.syncProjectStatusFromPackage(
          updated.id,
          actorUserId ?? null,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Синхронизация статуса план-графика ремонта для пакета ${updated.id} не удалась: ${message}`,
        );
      }
    }
    // Событийная синхронизация договора в расчёт з/п (ошибки логируются внутри).
    void this.salarySync.syncPackageSafe(id);
    return this.crud.findOne(id);
  }
}
