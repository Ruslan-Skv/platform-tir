import { Injectable, NotFoundException } from '@nestjs/common';
import { ContractStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { contractInclude } from './contracts-shared';

@Injectable()
export class ContractsHistoryService {
  constructor(private prisma: PrismaService) {}

  async getHistory(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }
    const history = await this.prisma.contractHistory.findMany({
      where: { contractId },
      include: {
        changedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { changedAt: 'desc' },
    });
    return history.map((h) => ({
      id: h.id,
      action: h.action,
      changedAt: h.changedAt,
      changedBy: h.changedBy,
      changedFields: h.changedFields,
      snapshot: h.snapshot,
    }));
  }

  async rollback(contractId: string, historyId: string, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }
    const historyEntry = await this.prisma.contractHistory.findFirst({
      where: { id: historyId, contractId },
    });
    if (!historyEntry) {
      throw new NotFoundException(
        `History entry ${historyId} not found for contract ${contractId}`,
      );
    }
    const snapshot = historyEntry.snapshot as Record<string, unknown>;
    const updateData: Prisma.ContractUncheckedUpdateInput = {
      contractNumber: snapshot.contractNumber as string,
      contractDate: new Date(snapshot.contractDate as string),
      status: snapshot.status as ContractStatus,
      directionId: (snapshot.directionId as string) ?? null,
      managerId: (snapshot.managerId as string) ?? null,
      deliveryId: (snapshot.deliveryId as string) ?? null,
      surveyorId: (snapshot.surveyorId as string) ?? null,
      validityStart: snapshot.validityStart ? new Date(snapshot.validityStart as string) : null,
      validityEnd: snapshot.validityEnd ? new Date(snapshot.validityEnd as string) : null,
      contractDurationDays: (snapshot.contractDurationDays as number) ?? null,
      contractDurationType: (snapshot.contractDurationType as string) ?? null,
      installationDate: snapshot.installationDate
        ? new Date(snapshot.installationDate as string)
        : null,
      installationDurationDays: (snapshot.installationDurationDays as number) ?? null,
      deliveryDate: snapshot.deliveryDate ? new Date(snapshot.deliveryDate as string) : null,
      customerName: snapshot.customerName as string,
      customerAddress: (snapshot.customerAddress as string) ?? null,
      customerPhone: (snapshot.customerPhone as string) ?? null,
      customerId: (snapshot.customerId as string) ?? null,
      discount: new Prisma.Decimal(Number(snapshot.discount ?? 0)),
      totalAmount: new Prisma.Decimal(Number(snapshot.totalAmount ?? 0)),
      advanceAmount: new Prisma.Decimal(Number(snapshot.advanceAmount ?? 0)),
      notes: (snapshot.notes as string) ?? null,
      source: (snapshot.source as string) ?? null,
      preferredExecutorId: (snapshot.preferredExecutorId as string) ?? null,
      measurementId: (snapshot.measurementId as string) ?? null,
      actWorkStartDate: snapshot.actWorkStartDate
        ? new Date(snapshot.actWorkStartDate as string)
        : null,
      actWorkEndDate: snapshot.actWorkEndDate ? new Date(snapshot.actWorkEndDate as string) : null,
      goodsTransferDate: snapshot.goodsTransferDate
        ? new Date(snapshot.goodsTransferDate as string)
        : null,
      installers: (snapshot.installers as string[]) ?? [],
      actWorkStartImages: (snapshot.actWorkStartImages as string[]) ?? [],
      actWorkEndImages: (snapshot.actWorkEndImages as string[]) ?? [],
    };
    await this.prisma.contractHistory.create({
      data: {
        contractId,
        snapshot: historyEntry.snapshot as object,
        changedFields: [],
        action: 'ROLLBACK',
        changedById: userId,
      },
    });
    return this.prisma.contract.update({
      where: { id: contractId },
      data: updateData,
      include: contractInclude(),
    });
  }
}
