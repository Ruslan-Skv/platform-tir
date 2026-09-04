import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import {
  assertNoDuplicateNumbersInForm,
  extractContractNumbersFromFormData,
  normalizeContractNumberKey,
} from './contract-document-number-unique';

@Injectable()
export class ContractDocumentNumberAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Синхронизирует глобальный реестр уникальных номеров с formData пакета.
   * Бросает BadRequestException, если номер уже занят другим договором.
   */
  async syncNumberAssignmentsForPackage(packageId: string, formData: unknown): Promise<void> {
    const numbers = extractContractNumbersFromFormData(formData);
    assertNoDuplicateNumbersInForm(numbers);

    const desired = new Map<string, string>();
    for (const display of numbers) {
      desired.set(normalizeContractNumberKey(display), display);
    }

    const existing = await this.prisma.contractDocumentNumberAssignment.findMany({
      where: { packageId },
      select: { id: true, numberKey: true, displayNumber: true, packageId: true },
    });

    for (const [numberKey, displayNumber] of desired) {
      const conflict = await this.prisma.contractDocumentNumberAssignment.findUnique({
        where: { numberKey },
        select: { id: true, numberKey: true, displayNumber: true, packageId: true },
      });
      if (conflict && conflict.packageId !== packageId) {
        throw new BadRequestException(
          `Номер договора «${displayNumber}» уже используется в другом пакете. Укажите другой номер.`,
        );
      }
      if (!conflict) {
        await this.prisma.contractDocumentNumberAssignment.create({
          data: { numberKey, displayNumber, packageId },
        });
      } else if (conflict.displayNumber !== displayNumber) {
        await this.prisma.contractDocumentNumberAssignment.update({
          where: { id: conflict.id },
          data: { displayNumber },
        });
      }
    }

    const toRemove = existing
      .map((row) => row.numberKey)
      .filter((key) => typeof key === 'string' && !desired.has(key));
    if (toRemove.length > 0) {
      await this.prisma.contractDocumentNumberAssignment.deleteMany({
        where: { packageId, numberKey: { in: toRemove } },
      });
    }
  }

  async releaseNumberAssignmentsForPackage(packageId: string): Promise<void> {
    await this.prisma.contractDocumentNumberAssignment.deleteMany({ where: { packageId } });
  }

  async isNumberAssignedToOtherPackage(
    number: string,
    excludePackageId?: string | null,
  ): Promise<boolean> {
    const numberKey = normalizeContractNumberKey(number);
    if (!numberKey) return false;
    const row = await this.prisma.contractDocumentNumberAssignment.findUnique({
      where: { numberKey },
      select: { packageId: true },
    });
    if (!row) return false;
    if (excludePackageId && row.packageId === excludePackageId) return false;
    return true;
  }
}
