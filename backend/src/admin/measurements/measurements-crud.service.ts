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

  /** Замеры, где текущий пользователь назначен замерщиком. */
  findMy(
    userId: string,
    params?: {
      status?: string;
      directionId?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      includeCounts?: boolean;
      page?: number;
      limit?: number;
      sortBy?: 'receptionDate' | 'executionDate' | 'status';
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const id = userId.trim();
    if (!id) {
      return Promise.resolve({
        data: [],
        total: 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 0,
      });
    }
    return this.findAll({
      ...params,
      surveyorId: id,
      scope: 'all',
      includeCounts: params?.includeCounts ?? true,
      countsUserId: id,
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
    withoutContract?: boolean;
    hasCustomerId?: boolean;
    /** Область списка: мои / мои направления / все. */
    scope?: 'mine' | 'my_directions' | 'all';
    /** Для scope=mine — текущий пользователь (managerId или surveyorId). */
    scopeUserId?: string;
    /** Для scope=my_directions — направления пользователя. */
    myDirectionIds?: string[];
    includeCounts?: boolean;
    /** Для counts.scope.mine. */
    countsUserId?: string;
    /** Для counts.scope.my_directions. */
    countsMyDirectionIds?: string[];
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
      scope = 'all',
      scopeUserId,
      myDirectionIds,
      includeCounts = false,
      countsUserId,
      countsMyDirectionIds,
      page = 1,
      limit = 20,
      sortBy = 'receptionDate',
      sortOrder = 'desc',
    } = params || {};

    const skip = (page - 1) * limit;
    const where = this.buildListWhere({
      status,
      managerId: scope === 'mine' ? undefined : managerId,
      surveyorId,
      directionId,
      search,
      dateFrom,
      dateTo,
      withoutContract,
      hasCustomerId,
      scope,
      scopeUserId,
      myDirectionIds,
    });

    const orderBy: Prisma.MeasurementOrderByWithRelationInput =
      sortBy === 'executionDate'
        ? { executionDate: sortOrder }
        : sortBy === 'status'
          ? { status: sortOrder }
          : { receptionDate: sortOrder };

    const [rows, total, counts] = await Promise.all([
      this.prisma.measurement.findMany({
        where,
        include: MEASUREMENT_RELATIONS_INCLUDE,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.measurement.count({ where }),
      includeCounts
        ? this.buildListCounts({
            status,
            managerId: scope === 'mine' ? undefined : managerId,
            surveyorId,
            directionId,
            search,
            dateFrom,
            dateTo,
            withoutContract,
            hasCustomerId,
            scope,
            scopeUserId,
            myDirectionIds,
            countsUserId,
            countsMyDirectionIds,
          })
        : Promise.resolve(undefined),
    ]);

    return {
      data: rows.map(formatMeasurementResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      ...(counts ? { counts } : {}),
    };
  }

  private buildListWhere(opts: {
    status?: string;
    managerId?: string;
    surveyorId?: string;
    directionId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    withoutContract?: boolean;
    hasCustomerId?: boolean;
    scope?: 'mine' | 'my_directions' | 'all';
    scopeUserId?: string;
    myDirectionIds?: string[];
  }): Prisma.MeasurementWhereInput {
    const where: Prisma.MeasurementWhereInput = {};
    const andParts: Prisma.MeasurementWhereInput[] = [];

    if (opts.status) {
      where.status = opts.status as Prisma.EnumMeasurementStatusFilter;
    }
    if (opts.managerId) where.managerId = opts.managerId;
    if (opts.surveyorId) where.surveyorId = opts.surveyorId;
    if (opts.withoutContract) {
      where.contract = { is: null };
    }
    if (opts.hasCustomerId) {
      where.customerId = { not: null };
    }

    if (opts.search) {
      andParts.push({
        OR: [
          { customerName: { contains: opts.search, mode: 'insensitive' } },
          { customerPhone: { contains: opts.search } },
          { customerAddress: { contains: opts.search, mode: 'insensitive' } },
          { comments: { contains: opts.search, mode: 'insensitive' } },
        ],
      });
    }

    if (opts.directionId) {
      andParts.push({
        OR: [
          { directionId: opts.directionId },
          { additionalDirections: { some: { directionId: opts.directionId } } },
        ],
      });
    }

    const scope = opts.scope ?? 'all';
    if (scope === 'mine') {
      const userId = opts.scopeUserId?.trim() || '';
      if (!userId) {
        andParts.push({ id: { in: [] } });
      } else {
        andParts.push({
          OR: [{ managerId: userId }, { surveyorId: userId }],
        });
      }
    } else if (scope === 'my_directions') {
      const ids = [...new Set((opts.myDirectionIds ?? []).map((id) => id.trim()).filter(Boolean))];
      if (ids.length === 0) {
        andParts.push({ id: { in: [] } });
      } else {
        andParts.push({
          OR: [
            { directionId: { in: ids } },
            { additionalDirections: { some: { directionId: { in: ids } } } },
          ],
        });
      }
    }

    if (andParts.length > 0) {
      where.AND = andParts;
    }

    if (opts.dateFrom || opts.dateTo) {
      where.receptionDate = {};
      if (opts.dateFrom) where.receptionDate.gte = new Date(opts.dateFrom);
      if (opts.dateTo) where.receptionDate.lte = new Date(opts.dateTo);
    }

    return where;
  }

  private async buildListCounts(opts: {
    status?: string;
    managerId?: string;
    surveyorId?: string;
    directionId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    withoutContract?: boolean;
    hasCustomerId?: boolean;
    scope?: 'mine' | 'my_directions' | 'all';
    scopeUserId?: string;
    myDirectionIds?: string[];
    countsUserId?: string;
    countsMyDirectionIds?: string[];
  }): Promise<{
    scope: { mine: number; my_directions: number; all: number };
    status: Record<string, number>;
  }> {
    const base = {
      managerId: opts.managerId,
      surveyorId: opts.surveyorId,
      directionId: opts.directionId,
      search: opts.search,
      dateFrom: opts.dateFrom,
      dateTo: opts.dateTo,
      withoutContract: opts.withoutContract,
      hasCustomerId: opts.hasCustomerId,
    };

    const countWith = (override: {
      status?: string;
      scope?: 'mine' | 'my_directions' | 'all';
      scopeUserId?: string;
      myDirectionIds?: string[];
      managerId?: string;
    }) =>
      this.prisma.measurement.count({
        where: this.buildListWhere({
          ...base,
          status: override.status,
          managerId: override.managerId !== undefined ? override.managerId : base.managerId,
          scope: override.scope ?? 'all',
          scopeUserId: override.scopeUserId,
          myDirectionIds: override.myDirectionIds,
        }),
      });

    const countsUserId = opts.countsUserId?.trim() || '';
    const myDirs = [
      ...new Set((opts.countsMyDirectionIds ?? []).map((id) => id.trim()).filter(Boolean)),
    ];

    const statusValues = ['NEW', 'COMPLETED', 'CANCELLED', 'CONVERTED'] as const;
    const currentScope = opts.scope ?? 'all';
    const scopeStatus = opts.status; // область учитывает выбранный статус
    const [scopeMine, scopeMyDirections, scopeAll, statusAllInScope, ...statusCounts] =
      await Promise.all([
        countsUserId
          ? countWith({
              status: scopeStatus,
              scope: 'mine',
              scopeUserId: countsUserId,
              managerId: undefined,
            })
          : Promise.resolve(0),
        myDirs.length
          ? countWith({
              status: scopeStatus,
              scope: 'my_directions',
              myDirectionIds: myDirs,
              managerId: undefined,
            })
          : Promise.resolve(0),
        countWith({ status: scopeStatus, scope: 'all', managerId: undefined }),
        countWith({
          scope: currentScope,
          scopeUserId: opts.scopeUserId,
          myDirectionIds: opts.myDirectionIds,
          managerId: currentScope === 'mine' ? undefined : opts.managerId,
        }),
        ...statusValues.map((st) =>
          countWith({
            status: st,
            scope: currentScope,
            scopeUserId: opts.scopeUserId,
            myDirectionIds: opts.myDirectionIds,
            managerId: currentScope === 'mine' ? undefined : opts.managerId,
          }),
        ),
      ]);

    const status: Record<string, number> = { '': statusAllInScope };
    statusValues.forEach((st, i) => {
      status[st] = statusCounts[i] ?? 0;
    });

    return {
      scope: {
        mine: scopeMine,
        my_directions: scopeMyDirections,
        all: scopeAll,
      },
      status,
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
