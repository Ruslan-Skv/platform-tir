import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  PROJECT_TRASH_INCLUDE,
  REPAIR_SCHEDULE_TRASH_RETENTION_DAYS,
  REPAIR_SCHEDULE_TRASH_RETENTION_MS,
  repairScheduleTrashPermanentDeleteAtIso,
  withDerived,
} from './repair-schedule.shared';

@Injectable()
export class RepairSchedulesTrashService {
  constructor(private readonly prisma: PrismaService) {}

  private async purgeExpiredTrash(): Promise<void> {
    const cutoff = new Date(Date.now() - REPAIR_SCHEDULE_TRASH_RETENTION_MS);
    await this.prisma.repairScheduleProject.deleteMany({
      where: { deletedAt: { lt: cutoff } },
    });
  }

  async trashCount() {
    await this.purgeExpiredTrash();
    return this.prisma.repairScheduleProject.count({
      where: { deletedAt: { not: null } },
    });
  }

  async findTrash(params: { search?: string; page?: number; limit?: number }) {
    await this.purgeExpiredTrash();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const search = params.search?.trim();
    const where: Prisma.RepairScheduleProjectWhereInput = {
      deletedAt: { not: null },
      ...(search
        ? {
            OR: [
              { contractNumber: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { customerAddress: { contains: search, mode: 'insensitive' } },
              { installerName: { contains: search, mode: 'insensitive' } },
              { workScope: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.repairScheduleProject.findMany({
        where,
        include: PROJECT_TRASH_INCLUDE,
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.repairScheduleProject.count({ where }),
    ]);
    return {
      data: items.map((row) => ({
        ...withDerived(row),
        permanentDeleteAt: row.deletedAt
          ? repairScheduleTrashPermanentDeleteAtIso(row.deletedAt)
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      trashRetentionDays: REPAIR_SCHEDULE_TRASH_RETENTION_DAYS,
    };
  }

  async restore(id: string) {
    const project = await this.prisma.repairScheduleProject.findUnique({
      where: { id },
      include: PROJECT_TRASH_INCLUDE,
    });
    if (!project) {
      throw new NotFoundException(`Repair schedule project ${id} not found`);
    }
    if (!project.deletedAt) throw new BadRequestException('Договор не в корзине');
    if (project.packageId) {
      // У пакета мог появиться новый проект, пока этот лежал в корзине, —
      // восстановление не должно плодить второй действующий проект договора.
      const active = await this.prisma.repairScheduleProject.findFirst({
        where: { packageId: project.packageId, deletedAt: null, id: { not: id } },
        select: { id: true },
      });
      if (active) {
        throw new BadRequestException(
          'У этого договора уже есть действующий проект план-графика — сначала уберите его в корзину',
        );
      }
    }
    const restored = await this.prisma.repairScheduleProject.update({
      where: { id },
      data: { deletedAt: null, deletedById: null },
      include: PROJECT_TRASH_INCLUDE,
    });
    return withDerived(restored);
  }
}
