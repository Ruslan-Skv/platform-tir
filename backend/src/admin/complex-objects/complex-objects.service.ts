import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateComplexObjectDto } from './dto/create-complex-object.dto';
import { UpdateComplexObjectDto } from './dto/update-complex-object.dto';

const COMPLEX_OBJECT_SNAPSHOT_FIELDS = {
  name: true,
  customerName: true,
  customerPhones: true,
  address: true,
  notes: true,
  hasElevator: true,
  floor: true,
  officeId: true,
  managerId: true,
} as const;

@Injectable()
export class ComplexObjectsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateComplexObjectDto) {
    return this.prisma.complexObject.create({
      data: {
        name: dto.name,
        customerName: dto.customerName ?? null,
        customerPhones: dto.customerPhones ?? [],
        address: dto.address ?? null,
        notes: dto.notes ?? null,
        hasElevator: dto.hasElevator ?? null,
        floor: dto.floor ?? null,
        officeId: dto.officeId ?? null,
        managerId: dto.managerId ?? null,
      },
      include: this.complexObjectInclude(),
    });
  }

  findAll() {
    return this.prisma.complexObject.findMany({
      orderBy: { createdAt: 'desc' },
      include: this.complexObjectInclude(),
    });
  }

  async findOne(id: string) {
    const obj = await this.prisma.complexObject.findUnique({
      where: { id },
      include: this.complexObjectInclude(),
    });
    if (!obj) {
      throw new NotFoundException(`ComplexObject with ID ${id} not found`);
    }
    return obj;
  }

  async update(id: string, dto: UpdateComplexObjectDto, changedById?: string) {
    const current = await this.prisma.complexObject.findUnique({
      where: { id },
      select: COMPLEX_OBJECT_SNAPSHOT_FIELDS,
    });
    if (!current) {
      throw new NotFoundException(`ComplexObject with ID ${id} not found`);
    }
    const data: Prisma.ComplexObjectUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.customerName !== undefined) data.customerName = dto.customerName ?? null;
    if (dto.customerPhones !== undefined) data.customerPhones = dto.customerPhones ?? [];
    if (dto.address !== undefined) data.address = dto.address ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;
    if (dto.hasElevator !== undefined) data.hasElevator = dto.hasElevator ?? null;
    if (dto.floor !== undefined) data.floor = dto.floor ?? null;
    if (dto.officeId !== undefined) data.officeId = dto.officeId ?? null;
    if (dto.managerId !== undefined) data.managerId = dto.managerId ?? null;

    if (changedById && Object.keys(data).length > 0) {
      await this.prisma.complexObjectHistory.create({
        data: {
          complexObjectId: id,
          snapshot: current as object,
          changedFields: Object.keys(data) as string[],
          action: 'UPDATE',
          changedById,
        },
      });
    }

    return this.prisma.complexObject.update({
      where: { id },
      data: Object.keys(data).length > 0 ? data : dto,
      include: this.complexObjectInclude(),
    });
  }

  async getHistory(complexObjectId: string) {
    await this.findOne(complexObjectId);
    const history = await this.prisma.complexObjectHistory.findMany({
      where: { complexObjectId },
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

  async rollback(complexObjectId: string, historyId: string, userId: string) {
    await this.findOne(complexObjectId);
    const historyEntry = await this.prisma.complexObjectHistory.findFirst({
      where: { id: historyId, complexObjectId },
    });
    if (!historyEntry) {
      throw new NotFoundException(
        `History entry ${historyId} not found for complex object ${complexObjectId}`,
      );
    }
    const snapshot = historyEntry.snapshot as Record<string, unknown>;
    await this.prisma.complexObjectHistory.create({
      data: {
        complexObjectId,
        snapshot: historyEntry.snapshot as object,
        changedFields: [],
        action: 'ROLLBACK',
        changedById: userId,
      },
    });
    return this.prisma.complexObject.update({
      where: { id: complexObjectId },
      data: {
        name: snapshot.name as string,
        customerName: (snapshot.customerName as string) ?? null,
        customerPhones: (snapshot.customerPhones as string[]) ?? [],
        address: (snapshot.address as string) ?? null,
        notes: (snapshot.notes as string) ?? null,
        hasElevator: (snapshot.hasElevator as boolean) ?? null,
        floor: (snapshot.floor as number) ?? null,
        officeId: (snapshot.officeId as string) ?? null,
        managerId: (snapshot.managerId as string) ?? null,
      },
      include: this.complexObjectInclude(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Сначала отвязываем все договоры
    await this.prisma.contract.updateMany({
      where: { complexObjectId: id },
      data: { complexObjectId: null },
    });
    return this.prisma.complexObject.delete({
      where: { id },
    });
  }

  // Получить все договоры комплексного объекта
  async getContracts(id: string) {
    await this.findOne(id);
    return this.prisma.contract.findMany({
      where: { complexObjectId: id },
      orderBy: { contractDate: 'asc' },
      include: {
        direction: { select: { id: true, name: true, slug: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
        office: { select: { id: true, name: true } },
      },
    });
  }

  private complexObjectInclude() {
    return {
      office: { select: { id: true, name: true, address: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
      contracts: {
        select: {
          id: true,
          contractNumber: true,
          status: true,
          totalAmount: true,
          direction: { select: { id: true, name: true } },
        },
        orderBy: { contractDate: 'asc' as const },
      },
    };
  }
}
