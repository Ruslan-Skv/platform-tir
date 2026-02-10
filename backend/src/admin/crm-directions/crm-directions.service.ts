import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const CRM_USER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
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
}
