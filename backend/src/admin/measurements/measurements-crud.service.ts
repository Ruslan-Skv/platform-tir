import { Injectable, NotFoundException } from '@nestjs/common';
import { MeasurementStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';
import {
  MEASUREMENT_RELATIONS_INCLUDE,
  MEASUREMENT_SNAPSHOT_FIELDS,
  additionalDirectionIdsFromLinks,
  buildMeasurementKeyMoments,
  buildSnapshot,
  formatMeasurementResponse,
  normalizeAdditionalDirectionIds,
} from './measurements-shared';

@Injectable()
export class MeasurementsCrudService {
  constructor(private prisma: PrismaService) {}

  async syncAdditionalDirections(
    measurementId: string,
    primaryDirectionId: string | null,
    ids: string[],
  ) {
    const normalized = normalizeAdditionalDirectionIds(primaryDirectionId, ids);
    await this.prisma.measurementAdditionalDirection.deleteMany({ where: { measurementId } });
    if (normalized.length === 0) return;
    await this.prisma.measurementAdditionalDirection.createMany({
      data: normalized.map((directionId, sortOrder) => ({
        measurementId,
        directionId,
        sortOrder,
      })),
    });
  }

  async create(createMeasurementDto: CreateMeasurementDto, createdById?: string) {
    const primaryDirectionId = createMeasurementDto.directionId ?? null;
    const additionalIds = normalizeAdditionalDirectionIds(
      primaryDirectionId,
      createMeasurementDto.additionalDirectionIds,
    );

    const created = await this.prisma.measurement.create({
      data: {
        managerId: createMeasurementDto.managerId,
        receptionDate: new Date(createMeasurementDto.receptionDate),
        executionDate: createMeasurementDto.executionDate
          ? new Date(createMeasurementDto.executionDate)
          : null,
        surveyorId: createMeasurementDto.surveyorId ?? null,
        directionId: primaryDirectionId,
        customerName: createMeasurementDto.customerName,
        customerAddress: createMeasurementDto.customerAddress ?? null,
        customerPhone: createMeasurementDto.customerPhone,
        comments: createMeasurementDto.comments ?? null,
        status: (createMeasurementDto.status as MeasurementStatus) ?? 'NEW',
        customerId: createMeasurementDto.customerId ?? null,
        ...(additionalIds.length > 0 && {
          additionalDirections: {
            create: additionalIds.map((directionId, sortOrder) => ({
              directionId,
              sortOrder,
            })),
          },
        }),
      },
      include: MEASUREMENT_RELATIONS_INCLUDE,
    });

    if (createdById) {
      await this.prisma.measurementHistory.create({
        data: {
          measurementId: created.id,
          snapshot: buildSnapshot(created) as object,
          changedFields: ['measurementCreated'],
          action: 'CREATE',
          changedById: createdById,
        },
      });
    }
    return formatMeasurementResponse(created);
  }

  async findAll(params?: {
    status?: string;
    managerId?: string;
    surveyorId?: string;
    directionId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    withoutContract?: boolean;
    hasCustomerId?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'receptionDate' | 'executionDate' | 'status';
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      status,
      managerId,
      surveyorId,
      directionId,
      search,
      dateFrom,
      dateTo,
      withoutContract,
      hasCustomerId,
      page = 1,
      limit = 20,
      sortBy = 'receptionDate',
      sortOrder = 'desc',
    } = params || {};

    const skip = (page - 1) * limit;
    const where: Prisma.MeasurementWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumMeasurementStatusFilter;
    }
    if (managerId) where.managerId = managerId;
    if (surveyorId) where.surveyorId = surveyorId;
    if (withoutContract) {
      where.contract = { is: null };
    }
    if (hasCustomerId) {
      where.customerId = { not: null };
    }

    const andParts: Prisma.MeasurementWhereInput[] = [];

    if (search) {
      andParts.push({
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search } },
          { customerAddress: { contains: search, mode: 'insensitive' } },
          { comments: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (directionId) {
      andParts.push({
        OR: [{ directionId }, { additionalDirections: { some: { directionId } } }],
      });
    }

    if (andParts.length > 0) {
      where.AND = andParts;
    }

    if (dateFrom || dateTo) {
      where.receptionDate = {};
      if (dateFrom) where.receptionDate.gte = new Date(dateFrom);
      if (dateTo) where.receptionDate.lte = new Date(dateTo);
    }

    const orderBy: Prisma.MeasurementOrderByWithRelationInput =
      sortBy === 'executionDate'
        ? { executionDate: sortOrder }
        : sortBy === 'status'
          ? { status: sortOrder }
          : { receptionDate: sortOrder };

    const [rows, total] = await Promise.all([
      this.prisma.measurement.findMany({
        where,
        include: MEASUREMENT_RELATIONS_INCLUDE,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.measurement.count({ where }),
    ]);

    return {
      data: rows.map(formatMeasurementResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const m = await this.prisma.measurement.findUnique({
      where: { id },
      include: {
        ...MEASUREMENT_RELATIONS_INCLUDE,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        contract: true,
      },
    });
    if (!m) {
      throw new NotFoundException(`Measurement with ID ${id} not found`);
    }
    return formatMeasurementResponse(m);
  }

  async update(id: string, updateMeasurementDto: UpdateMeasurementDto, changedById?: string) {
    const current = await this.prisma.measurement.findUnique({
      where: { id },
      select: {
        ...MEASUREMENT_SNAPSHOT_FIELDS,
        additionalDirections: { select: { directionId: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!current) {
      throw new NotFoundException(`Measurement with ID ${id} not found`);
    }

    const prevAdditionalIds = additionalDirectionIdsFromLinks(current.additionalDirections);
    const nextPrimaryDirectionId =
      updateMeasurementDto.directionId !== undefined
        ? (updateMeasurementDto.directionId ?? null)
        : current.directionId;
    const shouldSyncAdditional = updateMeasurementDto.additionalDirectionIds !== undefined;
    const nextAdditionalIds = shouldSyncAdditional
      ? normalizeAdditionalDirectionIds(
          nextPrimaryDirectionId,
          updateMeasurementDto.additionalDirectionIds,
        )
      : normalizeAdditionalDirectionIds(nextPrimaryDirectionId, prevAdditionalIds);

    const updateData: Prisma.MeasurementUncheckedUpdateInput = {};
    if (updateMeasurementDto.managerId !== undefined)
      updateData.managerId = updateMeasurementDto.managerId;
    if (updateMeasurementDto.receptionDate)
      updateData.receptionDate = new Date(updateMeasurementDto.receptionDate);
    if (updateMeasurementDto.executionDate !== undefined)
      updateData.executionDate = updateMeasurementDto.executionDate
        ? new Date(updateMeasurementDto.executionDate)
        : null;
    if (updateMeasurementDto.surveyorId !== undefined)
      updateData.surveyorId = updateMeasurementDto.surveyorId ?? null;
    if (updateMeasurementDto.directionId !== undefined)
      updateData.directionId = updateMeasurementDto.directionId ?? null;
    if (updateMeasurementDto.customerName)
      updateData.customerName = updateMeasurementDto.customerName;
    if (updateMeasurementDto.customerAddress !== undefined)
      updateData.customerAddress = updateMeasurementDto.customerAddress ?? null;
    if (updateMeasurementDto.customerPhone)
      updateData.customerPhone = updateMeasurementDto.customerPhone;
    if (updateMeasurementDto.comments !== undefined)
      updateData.comments = updateMeasurementDto.comments ?? null;
    if (updateMeasurementDto.status !== undefined) {
      updateData.status = updateMeasurementDto.status as MeasurementStatus;
    }
    if (updateMeasurementDto.customerId !== undefined)
      updateData.customerId = updateMeasurementDto.customerId ?? null;

    if (changedById) {
      const snapshot = buildSnapshot(current);
      const changedFields = Object.keys(updateData) as string[];
      if (updateMeasurementDto.status && updateMeasurementDto.status !== current.status) {
        const statusIdx = changedFields.indexOf('status');
        if (statusIdx >= 0) changedFields.splice(statusIdx, 1);
        changedFields.push(`statusChanged:${current.status}->${updateMeasurementDto.status}`);
      }
      if (
        shouldSyncAdditional &&
        JSON.stringify(prevAdditionalIds) !== JSON.stringify(nextAdditionalIds)
      ) {
        changedFields.push('additionalDirectionIds');
      }
      if (Object.prototype.hasOwnProperty.call(updateData, 'comments')) {
        const keyMoments = buildMeasurementKeyMoments(
          current.comments,
          updateData.comments as string | null,
        );
        for (const moment of keyMoments) {
          if (!changedFields.includes(moment)) changedFields.push(moment);
        }
      }
      if (changedFields.length > 0) {
        await this.prisma.measurementHistory.create({
          data: {
            measurementId: id,
            snapshot: snapshot as object,
            changedFields,
            action: 'UPDATE',
            changedById,
          },
        });
      }
    }

    const updated = await this.prisma.measurement.update({
      where: { id },
      data: updateData,
      include: MEASUREMENT_RELATIONS_INCLUDE,
    });

    const additionalChanged =
      JSON.stringify(prevAdditionalIds) !== JSON.stringify(nextAdditionalIds);
    const needsAdditionalSync =
      additionalChanged && (shouldSyncAdditional || updateMeasurementDto.directionId !== undefined);
    if (needsAdditionalSync) {
      await this.syncAdditionalDirections(id, updated.directionId, nextAdditionalIds);
      const refetched = await this.prisma.measurement.findUnique({
        where: { id },
        include: MEASUREMENT_RELATIONS_INCLUDE,
      });
      if (refetched) return formatMeasurementResponse(refetched);
    }

    return formatMeasurementResponse(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.measurement.delete({
      where: { id },
    });
  }
}
