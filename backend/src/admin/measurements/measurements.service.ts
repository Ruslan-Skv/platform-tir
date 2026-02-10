import { Injectable, NotFoundException } from '@nestjs/common';
import { MeasurementStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';

const MEASUREMENT_SNAPSHOT_FIELDS = {
  managerId: true,
  receptionDate: true,
  executionDate: true,
  surveyorId: true,
  directionId: true,
  customerName: true,
  customerAddress: true,
  customerPhone: true,
  comments: true,
  status: true,
  customerId: true,
} as const;

@Injectable()
export class MeasurementsService {
  constructor(private prisma: PrismaService) {}

  create(createMeasurementDto: CreateMeasurementDto) {
    return this.prisma.measurement.create({
      data: {
        managerId: createMeasurementDto.managerId,
        receptionDate: new Date(createMeasurementDto.receptionDate),
        executionDate: createMeasurementDto.executionDate
          ? new Date(createMeasurementDto.executionDate)
          : null,
        surveyorId: createMeasurementDto.surveyorId ?? null,
        directionId: createMeasurementDto.directionId ?? null,
        customerName: createMeasurementDto.customerName,
        customerAddress: createMeasurementDto.customerAddress ?? null,
        customerPhone: createMeasurementDto.customerPhone,
        comments: createMeasurementDto.comments ?? null,
        status: (createMeasurementDto.status as MeasurementStatus) ?? 'NEW',
        customerId: createMeasurementDto.customerId ?? null,
      },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        surveyor: { select: { id: true, firstName: true, lastName: true } },
        direction: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findAll(params?: {
    status?: string;
    managerId?: string;
    surveyorId?: string;
    directionId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      managerId,
      surveyorId,
      directionId,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = params || {};

    const skip = (page - 1) * limit;
    const where: Prisma.MeasurementWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumMeasurementStatusFilter;
    }
    if (managerId) where.managerId = managerId;
    if (surveyorId) where.surveyorId = surveyorId;
    if (directionId) where.directionId = directionId;

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
        { customerAddress: { contains: search, mode: 'insensitive' } },
        { comments: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      where.receptionDate = {};
      if (dateFrom) where.receptionDate.gte = new Date(dateFrom);
      if (dateTo) where.receptionDate.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.measurement.findMany({
        where,
        include: {
          manager: { select: { id: true, firstName: true, lastName: true } },
          surveyor: { select: { id: true, firstName: true, lastName: true } },
          direction: { select: { id: true, name: true, slug: true } },
        },
        skip,
        take: limit,
        orderBy: { receptionDate: 'desc' },
      }),
      this.prisma.measurement.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const m = await this.prisma.measurement.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        surveyor: { select: { id: true, firstName: true, lastName: true } },
        direction: { select: { id: true, name: true, slug: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        contract: true,
      },
    });
    if (!m) {
      throw new NotFoundException(`Measurement with ID ${id} not found`);
    }
    return m;
  }

  async update(id: string, updateMeasurementDto: UpdateMeasurementDto, changedById?: string) {
    const current = await this.prisma.measurement.findUnique({
      where: { id },
      select: MEASUREMENT_SNAPSHOT_FIELDS,
    });
    if (!current) {
      throw new NotFoundException(`Measurement with ID ${id} not found`);
    }

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
    if (updateMeasurementDto.status)
      updateData.status = updateMeasurementDto.status as MeasurementStatus;
    if (updateMeasurementDto.customerId !== undefined)
      updateData.customerId = updateMeasurementDto.customerId ?? null;

    if (changedById) {
      const snapshot = {
        ...current,
        receptionDate: current.receptionDate.toISOString().slice(0, 10),
        executionDate: current.executionDate
          ? current.executionDate.toISOString().slice(0, 10)
          : null,
      };
      const changedFields = Object.keys(updateData) as string[];
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

    return this.prisma.measurement.update({
      where: { id },
      data: updateData,
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        surveyor: { select: { id: true, firstName: true, lastName: true } },
        direction: { select: { id: true, name: true, slug: true } },
      },
    });
  }

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
    const updateData: Prisma.MeasurementUncheckedUpdateInput = {
      managerId: snapshot.managerId as string,
      receptionDate: new Date(snapshot.receptionDate as string),
      executionDate: snapshot.executionDate ? new Date(snapshot.executionDate as string) : null,
      surveyorId: (snapshot.surveyorId as string) ?? null,
      directionId: (snapshot.directionId as string) ?? null,
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

    return this.prisma.measurement.update({
      where: { id: measurementId },
      data: updateData,
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        surveyor: { select: { id: true, firstName: true, lastName: true } },
        direction: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.measurement.delete({
      where: { id },
    });
  }
}
