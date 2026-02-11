import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateComplexObjectDto } from './dto/create-complex-object.dto';
import { UpdateComplexObjectDto } from './dto/update-complex-object.dto';

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

  async update(id: string, dto: UpdateComplexObjectDto) {
    await this.findOne(id);
    return this.prisma.complexObject.update({
      where: { id },
      data: dto,
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
