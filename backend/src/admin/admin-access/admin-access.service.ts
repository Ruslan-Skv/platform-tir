import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ADMIN_RESOURCES } from './resources.config';
import { AdminResourcePermissionLevel } from './dto/set-permission.dto';

const ADMIN_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'PARTNER',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
];

@Injectable()
export class AdminAccessService {
  constructor(private readonly prisma: PrismaService) {}

  getAdminUsers() {
    return this.prisma.user.findMany({
      where: { role: { in: ADMIN_ROLES } },
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

  getResources() {
    return ADMIN_RESOURCES;
  }

  getResourceById(resourceId: string) {
    const resource = ADMIN_RESOURCES.find((r) => r.id === resourceId);
    if (!resource) throw new NotFoundException(`Ресурс ${resourceId} не найден`);
    return resource;
  }

  async getPermissions(resourceId: string) {
    this.getResourceById(resourceId);
    const list = await this.prisma.adminResourcePermission.findMany({
      where: { resourceId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return list.map((p) => ({
      userId: p.userId,
      email: p.user.email,
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      permission: p.permission,
      createdAt: p.createdAt,
    }));
  }

  async setPermission(
    resourceId: string,
    userId: string,
    permission: AdminResourcePermissionLevel,
  ) {
    this.getResourceById(resourceId);
    await this.prisma.adminResourcePermission.upsert({
      where: {
        resourceId_userId: { resourceId, userId },
      },
      create: { resourceId, userId, permission },
      update: { permission },
    });
    return this.getPermissions(resourceId);
  }

  async revokePermission(resourceId: string, userId: string) {
    this.getResourceById(resourceId);
    await this.prisma.adminResourcePermission.deleteMany({
      where: { resourceId, userId },
    });
    return this.getPermissions(resourceId);
  }
}
