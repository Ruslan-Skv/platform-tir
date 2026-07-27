import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const CRM_USER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
] as const;
import { CreateCrmDirectionDto } from './dto/create-crm-direction.dto';
import { UpdateCrmDirectionDto } from './dto/update-crm-direction.dto';

@Injectable()
export class CrmDirectionsService {
  constructor(private prisma: PrismaService) {}

  create(createCrmDirectionDto: CreateCrmDirectionDto) {
    return this.prisma.crmDirection.create({
      data: createCrmDirectionDto,
    });
  }

  findAll() {
    return this.prisma.crmDirection.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const dir = await this.prisma.crmDirection.findUnique({
      where: { id },
    });
    if (!dir) {
      throw new NotFoundException(`Direction with ID ${id} not found`);
    }
    return dir;
  }

  async update(id: string, updateCrmDirectionDto: UpdateCrmDirectionDto) {
    await this.findOne(id);
    return this.prisma.crmDirection.update({
      where: { id },
      data: updateCrmDirectionDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.crmDirection.delete({
      where: { id },
    });
  }

  getCrmUsers() {
    return this.prisma.user.findMany({
      where: { role: { in: [...CRM_USER_ROLES] }, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
  }

  async getUserDirectionIds(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const rows = await this.prisma.userCrmDirection.findMany({
      where: { userId },
      select: { directionId: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => r.directionId);
  }

  async setUserDirectionIds(userId: string, directionIds: string[]): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const uniqueIds = [...new Set(directionIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length > 0) {
      const found = await this.prisma.crmDirection.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true },
      });
      if (found.length !== uniqueIds.length) {
        throw new NotFoundException('Одно или несколько направлений не найдены');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userCrmDirection.deleteMany({ where: { userId } });
      if (uniqueIds.length > 0) {
        await tx.userCrmDirection.createMany({
          data: uniqueIds.map((directionId) => ({ userId, directionId })),
        });
      }
    });

    return this.getUserDirectionIds(userId);
  }
}
