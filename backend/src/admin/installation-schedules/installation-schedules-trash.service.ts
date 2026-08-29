import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ENTRY_INCLUDE,
  INSTALLATION_SCHEDULE_TRASH_RETENTION_DAYS,
  TRASH_RETENTION_MS,
  permanentDeleteAtIso,
} from './installation-schedule.shared';

@Injectable()
export class InstallationSchedulesTrashService {
  constructor(private readonly prisma: PrismaService) {}

  private async purgeExpiredTrash(): Promise<void> {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_MS);
    await this.prisma.installationScheduleEntry.deleteMany({
      where: { deletedAt: { lt: cutoff } },
    });
  }

  async trashCount() {
    await this.purgeExpiredTrash();
    return this.prisma.installationScheduleEntry.count({
      where: { deletedAt: { not: null } },
    });
  }

  async findTrash(params: { search?: string; page?: number; limit?: number }) {
    await this.purgeExpiredTrash();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const search = params.search?.trim();
    const where: Prisma.InstallationScheduleEntryWhereInput = {
      deletedAt: { not: null },
      ...(search
        ? {
            OR: [
              { installerName: { contains: search, mode: 'insensitive' } },
              { contractNumber: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { workOrderLabel: { contains: search, mode: 'insensitive' } },
              { orderInfo: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.installationScheduleEntry.findMany({
        where,
        include: ENTRY_INCLUDE,
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.installationScheduleEntry.count({ where }),
    ]);
    return {
      data: items.map((row) => ({
        ...row,
        permanentDeleteAt: row.deletedAt ? permanentDeleteAtIso(row.deletedAt) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      trashRetentionDays: INSTALLATION_SCHEDULE_TRASH_RETENTION_DAYS,
    };
  }

  async restore(id: string) {
    const entry = await this.prisma.installationScheduleEntry.findUnique({
      where: { id },
      include: ENTRY_INCLUDE,
    });
    if (!entry) {
      throw new NotFoundException(`Installation schedule ${id} not found`);
    }
    if (!entry.deletedAt) throw new BadRequestException('Запись не в корзине');
    return this.prisma.installationScheduleEntry.update({
      where: { id },
      data: { deletedAt: null, deletedById: null },
      include: ENTRY_INCLUDE,
    });
  }
}
