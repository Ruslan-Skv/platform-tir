import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';

const OFFICE_SNAPSHOT_FIELDS = {
  name: true,
  prefix: true,
  address: true,
  phone: true,
  isActive: true,
  sortOrder: true,
} as const;

@Injectable()
export class OfficesService {
  constructor(private prisma: PrismaService) {}

  create(createOfficeDto: CreateOfficeDto) {
    return this.prisma.office.create({
      data: {
        name: createOfficeDto.name,
        prefix: createOfficeDto.prefix ?? null,
        address: createOfficeDto.address ?? null,
        phone: createOfficeDto.phone ?? null,
        isActive: createOfficeDto.isActive ?? true,
        sortOrder: createOfficeDto.sortOrder ?? 0,
      },
    });
  }

  findAll(includeInactive = false) {
    return this.prisma.office.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const office = await this.prisma.office.findUnique({
      where: { id },
    });
    if (!office) {
      throw new NotFoundException(`Office with ID ${id} not found`);
    }
    return office;
  }

  async update(id: string, updateOfficeDto: UpdateOfficeDto, changedById?: string) {
    const current = await this.prisma.office.findUnique({
      where: { id },
      select: OFFICE_SNAPSHOT_FIELDS,
    });
    if (!current) {
      throw new NotFoundException(`Office with ID ${id} not found`);
    }
    const data: Prisma.OfficeUncheckedUpdateInput = {};
    if (updateOfficeDto.name !== undefined) data.name = updateOfficeDto.name;
    if (updateOfficeDto.prefix !== undefined) data.prefix = updateOfficeDto.prefix ?? null;
    if (updateOfficeDto.address !== undefined) data.address = updateOfficeDto.address ?? null;
    if (updateOfficeDto.phone !== undefined) data.phone = updateOfficeDto.phone ?? null;
    if (updateOfficeDto.isActive !== undefined) data.isActive = updateOfficeDto.isActive ?? true;
    if (updateOfficeDto.sortOrder !== undefined) data.sortOrder = updateOfficeDto.sortOrder ?? 0;

    if (changedById && Object.keys(data).length > 0) {
      await this.prisma.officeHistory.create({
        data: {
          officeId: id,
          snapshot: current as object,
          changedFields: Object.keys(data) as string[],
          action: 'UPDATE',
          changedById,
        },
      });
    }

    return this.prisma.office.update({
      where: { id },
      data: Object.keys(data).length > 0 ? data : updateOfficeDto,
    });
  }

  async getHistory(officeId: string) {
    await this.findOne(officeId);
    const history = await this.prisma.officeHistory.findMany({
      where: { officeId },
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

  async rollback(officeId: string, historyId: string, userId: string) {
    await this.findOne(officeId);
    const historyEntry = await this.prisma.officeHistory.findFirst({
      where: { id: historyId, officeId },
    });
    if (!historyEntry) {
      throw new NotFoundException(`History entry ${historyId} not found for office ${officeId}`);
    }
    const snapshot = historyEntry.snapshot as Record<string, unknown>;
    await this.prisma.officeHistory.create({
      data: {
        officeId,
        snapshot: historyEntry.snapshot as object,
        changedFields: [],
        action: 'ROLLBACK',
        changedById: userId,
      },
    });
    return this.prisma.office.update({
      where: { id: officeId },
      data: {
        name: snapshot.name as string,
        prefix: (snapshot.prefix as string) ?? null,
        address: (snapshot.address as string) ?? null,
        phone: (snapshot.phone as string) ?? null,
        isActive: (snapshot.isActive as boolean) ?? true,
        sortOrder: (snapshot.sortOrder as number) ?? 0,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Проверяем, есть ли договоры с этим офисом
    const contractsCount = await this.prisma.contract.count({
      where: { officeId: id },
    });
    if (contractsCount > 0) {
      // Не удаляем, а деактивируем
      return this.prisma.office.update({
        where: { id },
        data: { isActive: false },
      });
    }
    return this.prisma.office.delete({
      where: { id },
    });
  }
}
