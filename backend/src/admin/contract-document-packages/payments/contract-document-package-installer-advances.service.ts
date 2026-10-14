import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { CreateContractDocumentPackageInstallerAdvanceDto } from '../dto/payments/create-contract-document-package-installer-advance.dto';
import { UpdateContractDocumentPackageInstallerAdvanceDto } from '../dto/payments/update-contract-document-package-installer-advance.dto';

/** До 10 мастеров на договор по 15–20 авансов каждому — с запасом. */
const MAX_ADVANCES_PER_PACKAGE = 300;

const ADVANCE_INCLUDE = {
  installer: {
    select: { id: true, fullName: true, grade: true },
  },
  createdBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} as const satisfies Prisma.ContractDocumentPackageInstallerAdvanceInclude;

@Injectable()
export class ContractDocumentPackageInstallerAdvancesService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(
    a: Prisma.ContractDocumentPackageInstallerAdvanceGetPayload<{
      include: typeof ADVANCE_INCLUDE;
    }>,
  ) {
    return {
      id: a.id,
      packageId: a.packageId,
      installerId: a.installerId,
      /** Живое имя из справочника, иначе снимок на момент выдачи. */
      installerName: a.installer?.fullName ?? a.installerName,
      installerGrade: a.installer?.grade ?? null,
      paidAt: a.paidAt.toISOString().slice(0, 10),
      amount: a.amount.toString(),
      note: a.note,
      createdById: a.createdById,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      createdBy: a.createdBy
        ? {
            id: a.createdBy.id,
            email: a.createdBy.email,
            firstName: a.createdBy.firstName,
            lastName: a.createdBy.lastName,
          }
        : null,
    };
  }

  private async assertPackageExists(packageId: string) {
    const row = await this.prisma.contractDocumentPackage.findUnique({
      where: { id: packageId },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Пакет документов не найден');
    }
  }

  /** Мастер должен быть из справочника; ФИО сохраняем снимком на случай удаления мастера. */
  private async resolveInstaller(installerId: string): Promise<{ id: string; fullName: string }> {
    const installer = await this.prisma.installerMaster.findUnique({
      where: { id: installerId },
      select: { id: true, fullName: true },
    });
    if (!installer) {
      throw new BadRequestException('Мастер не найден в справочнике');
    }
    return installer;
  }

  async list(packageId: string) {
    await this.assertPackageExists(packageId);
    const rows = await this.prisma.contractDocumentPackageInstallerAdvance.findMany({
      where: { packageId },
      include: ADVANCE_INCLUDE,
      orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(
    packageId: string,
    dto: CreateContractDocumentPackageInstallerAdvanceDto,
    createdById?: string,
  ) {
    await this.assertPackageExists(packageId);
    const count = await this.prisma.contractDocumentPackageInstallerAdvance.count({
      where: { packageId },
    });
    if (count >= MAX_ADVANCES_PER_PACKAGE) {
      throw new BadRequestException(
        `По одному договору допускается не более ${MAX_ADVANCES_PER_PACKAGE} записей авансов`,
      );
    }
    const installer = await this.resolveInstaller(dto.installerId.trim());
    const created = await this.prisma.contractDocumentPackageInstallerAdvance.create({
      data: {
        packageId,
        installerId: installer.id,
        installerName: installer.fullName,
        paidAt: new Date(dto.paidAt),
        amount: dto.amount,
        note: dto.note?.trim() ? dto.note.trim() : null,
        createdById: createdById ?? null,
      },
      include: ADVANCE_INCLUDE,
    });
    return this.serialize(created);
  }

  async update(
    packageId: string,
    advanceId: string,
    dto: UpdateContractDocumentPackageInstallerAdvanceDto,
  ) {
    await this.assertPackageExists(packageId);
    const existing = await this.prisma.contractDocumentPackageInstallerAdvance.findFirst({
      where: { id: advanceId, packageId },
    });
    if (!existing) {
      throw new NotFoundException('Запись аванса не найдена');
    }
    const installer =
      dto.installerId !== undefined ? await this.resolveInstaller(dto.installerId.trim()) : null;
    const updated = await this.prisma.contractDocumentPackageInstallerAdvance.update({
      where: { id: advanceId },
      data: {
        ...(installer ? { installerId: installer.id, installerName: installer.fullName } : {}),
        ...(dto.paidAt !== undefined ? { paidAt: new Date(dto.paidAt) } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() ? dto.note.trim() : null } : {}),
      },
      include: ADVANCE_INCLUDE,
    });
    return this.serialize(updated);
  }

  async remove(packageId: string, advanceId: string) {
    await this.assertPackageExists(packageId);
    const existing = await this.prisma.contractDocumentPackageInstallerAdvance.findFirst({
      where: { id: advanceId, packageId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Запись аванса не найдена');
    }
    await this.prisma.contractDocumentPackageInstallerAdvance.delete({ where: { id: advanceId } });
    return { ok: true };
  }
}
