import { Injectable, NotFoundException } from '@nestjs/common';
import { ContractDocumentPackageStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  buildOdpzhScheduleRow,
  type OdpzhScheduleRow,
} from '../odpzh-schedules/odpzh-schedules.service';
import { ODPZH_SCHEDULE_KINDS } from '../odpzh-schedules/odpzh-schedule.shared';
import {
  asFormDataRecord,
  selectedInstallerIds,
} from '../installation-schedules/installation-schedule.shared';
import { explainPackageListPipelineStatus } from './list-pipeline/package-list-pipeline-status';

/** Формат файла диагностической выгрузки пакета (для различения версий при разборе). */
export const PACKAGE_DIAGNOSTIC_FORMAT = 'tir-contract-package-diagnostic';
export const PACKAGE_DIAGNOSTIC_VERSION = 1;

export type ContractDocumentPackageDiagnosticExport = {
  format: typeof PACKAGE_DIAGNOSTIC_FORMAT;
  version: number;
  exportedAt: string;
  packageId: string;
  /** Ключевые поля пакета из БД (статус конвейера пакета, удаление и связи). */
  package: {
    id: string;
    kind: string;
    title: string | null;
    status: string;
    documentObjectId: string | null;
    createdById: string | null;
    responsibleManagerId: string | null;
    deletedAt: Date | null;
    deletedById: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  /** formData пакета целиком, как хранится в БД. */
  formData: Record<string, unknown>;
  /** Журнал оплат пакета (все проводки, включая возвраты и оплаты по Д/с). */
  payments: Array<Record<string, unknown>>;
  /** Все записи графика монтажей, включая удалённые (deletedAt). */
  installationSchedules: Array<Record<string, unknown>>;
  /** Расчёт статуса списка договоров (бэкенд) со всеми промежуточными значениями. */
  listPipeline: ReturnType<typeof explainPackageListPipelineStatus>;
  /** Как этот пакет видит план-график ОДПЖ (строка + признак попадания в график). */
  odpzhSchedule: {
    appliesToKind: boolean;
    includedInSchedule: boolean;
    exclusionReason: string | null;
    row: OdpzhScheduleRow | null;
  };
};

/**
 * Диагностическая выгрузка пакета договора: сырые данные (formData, оплаты, монтажи)
 * плюс промежуточные расчёты статусов конвейера и план-графика ОДПЖ. Для расследования
 * расхождений статусов между разделами (реестр / хаб договора / план-график ОДПЖ).
 */
@Injectable()
export class ContractDocumentPackageDiagnosticExportService {
  constructor(private readonly prisma: PrismaService) {}

  async export(packageId: string): Promise<ContractDocumentPackageDiagnosticExport> {
    const pkg = await this.prisma.contractDocumentPackage.findUnique({
      where: { id: packageId },
      select: {
        id: true,
        kind: true,
        title: true,
        status: true,
        documentObjectId: true,
        createdById: true,
        responsibleManagerId: true,
        deletedAt: true,
        deletedById: true,
        createdAt: true,
        updatedAt: true,
        formData: true,
        payments: {
          orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            paymentDate: true,
            amount: true,
            paymentForm: true,
            paymentType: true,
            addendumNumber: true,
            basis: true,
            notes: true,
            recordedById: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        installationSchedules: {
          orderBy: { date: 'asc' },
          select: {
            id: true,
            date: true,
            dateEnd: true,
            timeFrom: true,
            timeTo: true,
            timeText: true,
            direction: true,
            orderInfo: true,
            note: true,
            installerId: true,
            installerName: true,
            installerIds: true,
            contractNumber: true,
            workOrderKey: true,
            workOrderLabel: true,
            status: true,
            completionNote: true,
            completedAt: true,
            completedById: true,
            createdById: true,
            deletedAt: true,
            deletedById: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!pkg) {
      throw new NotFoundException('Договор не найден');
    }

    const paymentsForPipeline = pkg.payments.map((p) => ({
      amount: p.amount.toString(),
      paymentType: p.paymentType,
      addendumNumber: p.addendumNumber,
      paymentDate: p.paymentDate,
    }));
    const listPipeline = explainPackageListPipelineStatus({
      kind: pkg.kind,
      status: pkg.status,
      formData: pkg.formData,
      payments: paymentsForPipeline,
    });

    const appliesToKind = (ODPZH_SCHEDULE_KINDS as readonly string[]).includes(pkg.kind);
    let odpzhSchedule: ContractDocumentPackageDiagnosticExport['odpzhSchedule'] = {
      appliesToKind,
      includedInSchedule: false,
      exclusionReason: !appliesToKind ? 'KIND_NOT_IN_ODPZH_SCHEDULE' : null,
      row: null,
    };
    if (appliesToKind) {
      // Имена монтажников — как их собирает план-график ОДПЖ.
      const installerIds = new Set<string>();
      for (const entry of pkg.installationSchedules) {
        if (entry.deletedAt) continue;
        for (const id of entry.installerIds) installerIds.add(id);
      }
      for (const id of selectedInstallerIds(asFormDataRecord(pkg.formData))) {
        installerIds.add(id);
      }
      const installerNamesById = new Map<string, string>();
      if (installerIds.size > 0) {
        const masters = await this.prisma.installerMaster.findMany({
          where: { id: { in: [...installerIds] } },
          select: { id: true, fullName: true },
        });
        for (const master of masters) installerNamesById.set(master.id, master.fullName);
      }

      let exclusionReason: string | null = null;
      if (pkg.status !== ContractDocumentPackageStatus.CONTRACT_CONCLUDED) {
        exclusionReason = `PACKAGE_STATUS_${pkg.status}`;
      } else if (pkg.deletedAt) {
        exclusionReason = 'PACKAGE_DELETED';
      }

      odpzhSchedule = {
        appliesToKind,
        includedInSchedule: exclusionReason === null,
        exclusionReason,
        row: buildOdpzhScheduleRow(
          {
            id: pkg.id,
            kind: pkg.kind,
            status: pkg.status,
            formData: pkg.formData,
            createdAt: pkg.createdAt,
            updatedAt: pkg.updatedAt,
            payments: pkg.payments,
            // План-график видит только неудалённые записи монтажей.
            installationSchedules: pkg.installationSchedules
              .filter((e) => !e.deletedAt)
              .map((e) => ({
                id: e.id,
                date: e.date,
                dateEnd: e.dateEnd,
                direction: e.direction,
                status: e.status,
                installerName: e.installerName,
                installerIds: e.installerIds,
                workOrderKey: e.workOrderKey,
                completedAt: e.completedAt,
              })),
          },
          installerNamesById,
        ),
      };
    }

    return {
      format: PACKAGE_DIAGNOSTIC_FORMAT,
      version: PACKAGE_DIAGNOSTIC_VERSION,
      exportedAt: new Date().toISOString(),
      packageId: pkg.id,
      package: {
        id: pkg.id,
        kind: pkg.kind,
        title: pkg.title,
        status: pkg.status,
        documentObjectId: pkg.documentObjectId,
        createdById: pkg.createdById,
        responsibleManagerId: pkg.responsibleManagerId,
        deletedAt: pkg.deletedAt,
        deletedById: pkg.deletedById,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
      },
      formData: asFormDataRecord(pkg.formData) ?? {},
      payments: pkg.payments.map((p) => ({ ...p, amount: p.amount.toString() })),
      installationSchedules: pkg.installationSchedules.map((e) => ({ ...e })),
      listPipeline,
      odpzhSchedule,
    };
  }
}
