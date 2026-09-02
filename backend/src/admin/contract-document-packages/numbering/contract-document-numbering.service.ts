import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractDocumentPackageKind, type Prisma } from '@prisma/client';

import { PACKAGE_KIND_DIRECTION_SLUG } from '../../../common/config/package-direction-registry.config';
import { PrismaService } from '../../../database/prisma.service';

export { PACKAGE_KIND_DIRECTION_SLUG };

export type ContractNumberPreviewInput = {
  managerUserId: string;
  surveyorUserId: string;
  officeId: string;
  kind: ContractDocumentPackageKind;
};

export type ContractNumberParts = {
  managerUserId: string;
  directionId: string;
  directionName: string;
  officePrefix: string;
  managerCode: string;
  surveyorCode: string;
  directionLetter: string;
  officeName: string;
  managerName: string;
  surveyorName: string;
};

export type ContractNumberPreviewResult = {
  ok: boolean;
  recommendedNumber: string | null;
  nextSequence: number | null;
  error: string | null;
  officePrefix: string | null;
  managerCode: string | null;
  surveyorCode: string | null;
  directionLetter: string | null;
  directionId: string | null;
  directionName: string | null;
  officeName: string | null;
  managerName: string | null;
  surveyorName: string | null;
};

function formatUserName(u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [u.lastName, u.firstName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

function composeContractNumber(parts: {
  officePrefix: string;
  managerCode: string;
  surveyorCode: string;
  directionLetter: string;
  sequence: number;
}): string {
  return `${parts.officePrefix}/${parts.managerCode}/${parts.surveyorCode}${parts.directionLetter}-${parts.sequence}`;
}

@Injectable()
export class ContractDocumentNumberingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Preview: всегда 200 с ok/error — не засоряет консоль при незаполненных кодах. */
  async preview(input: ContractNumberPreviewInput): Promise<ContractNumberPreviewResult> {
    const resolved = await this.resolveParts(input, { soft: true });
    if ('error' in resolved) {
      return {
        ok: false,
        recommendedNumber: null,
        nextSequence: null,
        error: resolved.error,
        officePrefix: resolved.officePrefix,
        managerCode: resolved.managerCode,
        surveyorCode: resolved.surveyorCode,
        directionLetter: resolved.directionLetter,
        directionId: resolved.directionId,
        directionName: resolved.directionName,
        officeName: resolved.officeName,
        managerName: resolved.managerName,
        surveyorName: resolved.surveyorName,
      };
    }

    const nextSequence =
      (await this.peekCounterValue(resolved.managerUserId, resolved.directionId)) + 1;
    return {
      ok: true,
      recommendedNumber: composeContractNumber({
        officePrefix: resolved.officePrefix,
        managerCode: resolved.managerCode,
        surveyorCode: resolved.surveyorCode,
        directionLetter: resolved.directionLetter,
        sequence: nextSequence,
      }),
      nextSequence,
      error: null,
      officePrefix: resolved.officePrefix,
      managerCode: resolved.managerCode,
      surveyorCode: resolved.surveyorCode,
      directionLetter: resolved.directionLetter,
      directionId: resolved.directionId,
      directionName: resolved.directionName,
      officeName: resolved.officeName,
      managerName: resolved.managerName,
      surveyorName: resolved.surveyorName,
    };
  }

  async allocate(input: ContractNumberPreviewInput): Promise<ContractNumberPreviewResult> {
    const resolved = await this.resolveParts(input, { soft: false });
    if ('error' in resolved) {
      throw new BadRequestException(resolved.error);
    }
    const sequence = await this.allocateSequence(resolved.managerUserId, resolved.directionId);
    return {
      ok: true,
      recommendedNumber: composeContractNumber({
        officePrefix: resolved.officePrefix,
        managerCode: resolved.managerCode,
        surveyorCode: resolved.surveyorCode,
        directionLetter: resolved.directionLetter,
        sequence,
      }),
      nextSequence: sequence,
      error: null,
      officePrefix: resolved.officePrefix,
      managerCode: resolved.managerCode,
      surveyorCode: resolved.surveyorCode,
      directionLetter: resolved.directionLetter,
      directionId: resolved.directionId,
      directionName: resolved.directionName,
      officeName: resolved.officeName,
      managerName: resolved.managerName,
      surveyorName: resolved.surveyorName,
    };
  }

  private async resolveParts(
    input: ContractNumberPreviewInput,
    opts: { soft: boolean },
  ): Promise<
    | ContractNumberParts
    | {
        error: string;
        officePrefix: string | null;
        managerCode: string | null;
        surveyorCode: string | null;
        directionLetter: string | null;
        directionId: string | null;
        directionName: string | null;
        officeName: string | null;
        managerName: string | null;
        surveyorName: string | null;
      }
  > {
    const managerUserId = input.managerUserId?.trim();
    const surveyorUserId = input.surveyorUserId?.trim();
    const officeId = input.officeId?.trim();
    if (!managerUserId) throw new BadRequestException('Укажите менеджера');
    if (!surveyorUserId) throw new BadRequestException('Укажите замерщика');
    if (!officeId) throw new BadRequestException('Укажите офис заключения');
    if (!input.kind) throw new BadRequestException('Укажите направление договора');

    const slug = PACKAGE_KIND_DIRECTION_SLUG[input.kind];
    if (!slug) throw new BadRequestException('Неизвестное направление пакета');

    const [manager, surveyor, office, direction] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: managerUserId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: surveyorUserId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
        },
      }),
      this.prisma.office.findUnique({
        where: { id: officeId },
        select: { id: true, name: true, prefix: true, isActive: true },
      }),
      this.prisma.crmDirection.findUnique({
        where: { slug },
        select: { id: true, name: true, numberLetter: true, isActive: true },
      }),
    ]);

    if (!manager) throw new NotFoundException('Менеджер не найден');
    if (!surveyor) throw new NotFoundException('Замерщик не найден');
    if (!office) throw new NotFoundException('Офис не найден');
    if (!direction) throw new NotFoundException(`Направление CRM «${slug}» не найдено`);

    const officePrefix = office.prefix?.trim() ?? '';
    const managerCode = manager.employeeCode?.trim() ?? '';
    const surveyorCode = surveyor.employeeCode?.trim() ?? '';
    const directionLetter = direction.numberLetter?.trim() ?? '';
    const managerName = formatUserName(manager);
    const surveyorName = formatUserName(surveyor);

    const issues: string[] = [];
    if (!officePrefix) {
      issues.push(`У офиса «${office.name}» не задан префикс для нумерации договоров`);
    }
    if (!managerCode) {
      issues.push(`У менеджера ${managerName} не задан код сотрудника для нумерации`);
    }
    if (!surveyorCode) {
      issues.push(`У замерщика ${surveyorName} не задан код сотрудника для нумерации`);
    }
    if (!directionLetter) {
      issues.push(`У направления «${direction.name}» не задана буква в номере договора`);
    }

    if (issues.length > 0) {
      const error = issues.join('. ');
      if (!opts.soft) {
        throw new BadRequestException(error);
      }
      return {
        error,
        officePrefix: officePrefix || null,
        managerCode: managerCode || null,
        surveyorCode: surveyorCode || null,
        directionLetter: directionLetter || null,
        directionId: direction.id,
        directionName: direction.name,
        officeName: office.name,
        managerName,
        surveyorName,
      };
    }

    return {
      managerUserId: manager.id,
      directionId: direction.id,
      directionName: direction.name,
      officePrefix,
      managerCode,
      surveyorCode,
      directionLetter,
      officeName: office.name,
      managerName,
      surveyorName,
    };
  }

  private async peekCounterValue(managerUserId: string, directionId: string): Promise<number> {
    const row = await this.prisma.contractDocumentNumberCounter.findUnique({
      where: {
        managerUserId_directionId: { managerUserId, directionId },
      },
      select: { value: true },
    });
    return row?.value ?? 0;
  }

  private async allocateSequence(managerUserId: string, directionId: string): Promise<number> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.contractDocumentNumberCounter.findUnique({
        where: {
          managerUserId_directionId: { managerUserId, directionId },
        },
      });
      if (existing) {
        const updated = await tx.contractDocumentNumberCounter.update({
          where: { id: existing.id },
          data: { value: { increment: 1 } },
        });
        return updated.value;
      }
      const created = await tx.contractDocumentNumberCounter.create({
        data: { managerUserId, directionId, value: 1 },
      });
      return created.value;
    });
  }
}
