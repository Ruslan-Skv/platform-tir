import { Injectable, NotFoundException } from '@nestjs/common';
import { MeasurementStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MeasurementsCrudService } from './measurements-crud.service';
import { MEASUREMENT_RELATIONS_INCLUDE, formatMeasurementResponse } from './measurements-shared';

@Injectable()
export class MeasurementsHistoryService {
  constructor(
    private prisma: PrismaService,
    private crud: MeasurementsCrudService,
  ) {}

  async getHistory(measurementId: string) {
    const measurement = await this.prisma.measurement.findUnique({
      where: { id: measurementId },
    });
    if (!measurement) {
      throw new NotFoundException(`Measurement with ID ${measurementId} not found`);
    }

    const history = await this.prisma.measurementHistory.findMany({
      where: { measurementId },
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

  async rollback(measurementId: string, historyId: string, userId: string) {
    const measurement = await this.prisma.measurement.findUnique({
      where: { id: measurementId },
    });
    if (!measurement) {
      throw new NotFoundException(`Measurement with ID ${measurementId} not found`);
    }

    const historyEntry = await this.prisma.measurementHistory.findFirst({
      where: { id: historyId, measurementId },
    });
    if (!historyEntry) {
      throw new NotFoundException(
        `History entry ${historyId} not found for measurement ${measurementId}`,
      );
    }

    const snapshot = historyEntry.snapshot as Record<string, unknown>;
    const rollbackAdditionalIds = Array.isArray(snapshot.additionalDirectionIds)
      ? (snapshot.additionalDirectionIds as string[])
      : [];
    const rollbackDirectionId = (snapshot.directionId as string) ?? null;

    const updateData: Prisma.MeasurementUncheckedUpdateInput = {
      managerId: snapshot.managerId as string,
      receptionDate: new Date(snapshot.receptionDate as string),
      executionDate: snapshot.executionDate ? new Date(snapshot.executionDate as string) : null,
      surveyorId: (snapshot.surveyorId as string) ?? null,
      directionId: rollbackDirectionId,
      customerName: snapshot.customerName as string,
      customerAddress: (snapshot.customerAddress as string) ?? null,
      customerPhone: snapshot.customerPhone as string,
      comments: (snapshot.comments as string) ?? null,
      status: snapshot.status as MeasurementStatus,
      customerId: (snapshot.customerId as string) ?? null,
    };

    await this.prisma.measurementHistory.create({
      data: {
        measurementId,
        snapshot: historyEntry.snapshot as object,
        changedFields: [],
        action: 'ROLLBACK',
        changedById: userId,
      },
    });

    const updated = await this.prisma.measurement.update({
      where: { id: measurementId },
      data: updateData,
      include: MEASUREMENT_RELATIONS_INCLUDE,
    });

    await this.crud.syncAdditionalDirections(
      measurementId,
      rollbackDirectionId,
      rollbackAdditionalIds,
    );

    const refetched = await this.prisma.measurement.findUnique({
      where: { id: measurementId },
      include: MEASUREMENT_RELATIONS_INCLUDE,
    });
    return formatMeasurementResponse(refetched ?? updated);
  }
}
