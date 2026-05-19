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

const MEASUREMENT_RELATIONS_INCLUDE = {
  manager: { select: { id: true, firstName: true, lastName: true } },
  surveyor: { select: { id: true, firstName: true, lastName: true } },
  direction: { select: { id: true, name: true, slug: true } },
  additionalDirections: {
    orderBy: { sortOrder: 'asc' as const },
    include: { direction: { select: { id: true, name: true, slug: true } } },
  },
} as const;

type MeasurementWithRelations = Prisma.MeasurementGetPayload<{
  include: typeof MEASUREMENT_RELATIONS_INCLUDE;
}>;

function normalizeAdditionalDirectionIds(
  primaryDirectionId: string | null | undefined,
  ids?: string[],
): string[] {
  if (!ids?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const trimmed = id?.trim();
    if (!trimmed || trimmed === primaryDirectionId || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function additionalDirectionIdsFromLinks(links: { directionId: string }[]): string[] {
  return links.map((x) => x.directionId);
}

function formatMeasurementResponse(m: MeasurementWithRelations) {
  const additionalDirectionIds = additionalDirectionIdsFromLinks(m.additionalDirections);
  const additionalDirections = m.additionalDirections.map((x) => x.direction);
  return { ...m, additionalDirectionIds, additionalDirections };
}

function buildSnapshot(
  row: Prisma.MeasurementGetPayload<{
    select: typeof MEASUREMENT_SNAPSHOT_FIELDS;
  }> & { additionalDirections?: { directionId: string }[] },
) {
  return {
    ...row,
    receptionDate: row.receptionDate.toISOString().slice(0, 10),
    executionDate: row.executionDate ? row.executionDate.toISOString().slice(0, 10) : null,
    additionalDirectionIds: additionalDirectionIdsFromLinks(row.additionalDirections ?? []),
  };
}
const REPAIR_MEASUREMENT_DATA_MARKER = '[REPAIR_MEASUREMENT_DATA_V1]';

type ParsedMeasurementData = {
  rooms: Array<{
    id?: string;
    name?: string;
    ceilingHeight?: string;
    wallThickness?: string;
    slopeThickness?: string;
    floorArea?: string;
    wallSegments?: string[];
    doors?: Array<{ width?: string; height?: string }>;
    windows?: Array<{ width?: string; height?: string }>;
    selectedWorkItemIds?: string[];
    workItemQuantities?: Record<string, string>;
    notes?: string;
  }>;
};

function parseMeasurementDataFromComments(
  value: string | null | undefined,
): ParsedMeasurementData | null {
  if (!value) return null;
  const idx = value.indexOf(REPAIR_MEASUREMENT_DATA_MARKER);
  if (idx < 0) return null;
  const raw = value.slice(idx + REPAIR_MEASUREMENT_DATA_MARKER.length).trim();
  try {
    const parsed = JSON.parse(raw) as ParsedMeasurementData;
    if (!parsed || !Array.isArray(parsed.rooms)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function hasRoomGeometry(room: NonNullable<ParsedMeasurementData>['rooms'][number]): boolean {
  if ((room.ceilingHeight ?? '').trim() !== '') return true;
  if ((room.wallThickness ?? '').trim() !== '') return true;
  if ((room.slopeThickness ?? '').trim() !== '') return true;
  if ((room.floorArea ?? '').trim() !== '') return true;
  if ((room.wallSegments ?? []).some((x) => (x ?? '').trim() !== '')) return true;
  if (
    (room.doors ?? []).some((d) => (d.width ?? '').trim() !== '' || (d.height ?? '').trim() !== '')
  )
    return true;
  if (
    (room.windows ?? []).some(
      (w) => (w.width ?? '').trim() !== '' || (w.height ?? '').trim() !== '',
    )
  )
    return true;
  return false;
}

function hasRoomWorks(room: NonNullable<ParsedMeasurementData>['rooms'][number]): boolean {
  return (room.selectedWorkItemIds?.length ?? 0) > 0;
}

function hasRoomWorkQuantities(room: NonNullable<ParsedMeasurementData>['rooms'][number]): boolean {
  return Object.values(room.workItemQuantities ?? {}).some((x) => (x ?? '').trim() !== '');
}

function buildMeasurementKeyMoments(
  previousComments: string | null,
  nextComments: string | null,
): string[] {
  const prev = parseMeasurementDataFromComments(previousComments);
  const next = parseMeasurementDataFromComments(nextComments);
  if (!next) return [];
  const moments: string[] = [];

  const prevRooms = prev?.rooms ?? [];
  const nextRooms = next.rooms ?? [];
  if (nextRooms.length !== prevRooms.length) moments.push('measurementRoomsUpdated');

  let geometryChanged = false;
  let worksChanged = false;
  let quantitiesChanged = false;

  for (let i = 0; i < Math.max(prevRooms.length, nextRooms.length); i++) {
    const a = prevRooms[i];
    const b = nextRooms[i];
    if (!b) continue;
    if (!a) {
      if (hasRoomGeometry(b)) geometryChanged = true;
      if (hasRoomWorks(b)) worksChanged = true;
      if (hasRoomWorkQuantities(b)) quantitiesChanged = true;
      continue;
    }

    const prevGeometry = JSON.stringify({
      ceilingHeight: a.ceilingHeight ?? '',
      wallThickness: a.wallThickness ?? '',
      slopeThickness: a.slopeThickness ?? '',
      floorArea: a.floorArea ?? '',
      wallSegments: a.wallSegments ?? [],
      doors: a.doors ?? [],
      windows: a.windows ?? [],
    });
    const nextGeometry = JSON.stringify({
      ceilingHeight: b.ceilingHeight ?? '',
      wallThickness: b.wallThickness ?? '',
      slopeThickness: b.slopeThickness ?? '',
      floorArea: b.floorArea ?? '',
      wallSegments: b.wallSegments ?? [],
      doors: b.doors ?? [],
      windows: b.windows ?? [],
    });
    if (prevGeometry !== nextGeometry) geometryChanged = true;

    const prevWorks = JSON.stringify([...(a.selectedWorkItemIds ?? [])].sort());
    const nextWorks = JSON.stringify([...(b.selectedWorkItemIds ?? [])].sort());
    if (prevWorks !== nextWorks) worksChanged = true;

    const prevQty = JSON.stringify(a.workItemQuantities ?? {});
    const nextQty = JSON.stringify(b.workItemQuantities ?? {});
    if (prevQty !== nextQty) quantitiesChanged = true;
  }

  if (geometryChanged) moments.push('measurementGeometryUpdated');
  if (worksChanged) moments.push('measurementWorksUpdated');
  if (quantitiesChanged) moments.push('measurementWorkQuantitiesUpdated');
  return moments;
}

@Injectable()
export class MeasurementsService {
  constructor(private prisma: PrismaService) {}

  private async syncAdditionalDirections(
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
    /** Замеры, к которым не привязан договор (воронка после замера). */
    withoutContract?: boolean;
    /** Только замеры с привязкой к карточке CRM. */
    hasCustomerId?: boolean;
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
      withoutContract,
      hasCustomerId,
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
    if (withoutContract) {
      where.contract = { is: null };
    }
    if (hasCustomerId) {
      where.customerId = { not: null };
    }

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

    const [rows, total] = await Promise.all([
      this.prisma.measurement.findMany({
        where,
        include: MEASUREMENT_RELATIONS_INCLUDE,
        skip,
        take: limit,
        orderBy: { receptionDate: 'desc' },
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
    if (updateMeasurementDto.status)
      updateData.status = updateMeasurementDto.status as MeasurementStatus;
    if (updateMeasurementDto.customerId !== undefined)
      updateData.customerId = updateMeasurementDto.customerId ?? null;

    if (changedById) {
      const snapshot = buildSnapshot(current);
      const changedFields = Object.keys(updateData) as string[];
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

    await this.syncAdditionalDirections(measurementId, rollbackDirectionId, rollbackAdditionalIds);

    const refetched = await this.prisma.measurement.findUnique({
      where: { id: measurementId },
      include: MEASUREMENT_RELATIONS_INCLUDE,
    });
    return formatMeasurementResponse(refetched ?? updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.measurement.delete({
      where: { id },
    });
  }
}
