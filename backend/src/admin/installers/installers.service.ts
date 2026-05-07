import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInstallerDto } from './dto/create-installer.dto';
import { UpdateInstallerDto } from './dto/update-installer.dto';

@Injectable()
export class InstallersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateInstallerDto) {
    return this.prisma.installerMaster.create({
      data: {
        direction: dto.direction,
        fullName: dto.fullName.trim(),
        grade: dto.grade.trim(),
      },
    });
  }

  findAll() {
    return this.prisma.installerMaster.findMany({
      orderBy: [{ direction: 'asc' }, { fullName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const installer = await this.prisma.installerMaster.findUnique({ where: { id } });
    if (!installer) {
      throw new NotFoundException(`Installer with ID ${id} not found`);
    }
    return installer;
  }

  async update(id: string, dto: UpdateInstallerDto) {
    await this.findOne(id);
    return this.prisma.installerMaster.update({
      where: { id },
      data: {
        ...(dto.direction !== undefined ? { direction: dto.direction } : {}),
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.grade !== undefined ? { grade: dto.grade.trim() } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.installerMaster.delete({ where: { id } });
  }
}
