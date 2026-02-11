import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';

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

  async update(id: string, updateOfficeDto: UpdateOfficeDto) {
    await this.findOne(id);
    return this.prisma.office.update({
      where: { id },
      data: updateOfficeDto,
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
