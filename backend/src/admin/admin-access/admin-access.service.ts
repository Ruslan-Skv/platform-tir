import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ADMIN_RESOURCES } from './resources.config';
import { ROLE_DEFAULT_RESOURCES } from './role-default-resources.config';
import { AdminResourcePermissionLevel } from './dto/set-permission.dto';

export const ADMIN_ROLES: UserRole[] = [
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

  /**
   * Список resourceId, к которым имеет доступ текущий пользователь.
   * SUPER_ADMIN — все. Остальные: доступ по роли + явные выдачи, минус явные запреты.
   */
  async getMyAccessibleResources(userId: string, userRole: UserRole): Promise<string[]> {
    if (userRole === 'SUPER_ADMIN') {
      return ADMIN_RESOURCES.map((r) => r.id);
    }
    const [explicitPerms, roleDefaults] = await Promise.all([
      this.prisma.adminResourcePermission.findMany({
        where: { userId },
        select: { resourceId: true, permission: true },
      }),
      Promise.resolve(ROLE_DEFAULT_RESOURCES[userRole] ?? ['admin']),
    ]);
    const denied = new Set(
      explicitPerms.filter((p) => p.permission === 'DENIED').map((p) => p.resourceId),
    );
    const granted = new Set(
      explicitPerms
        .filter((p) => p.permission === 'VIEW' || p.permission === 'EDIT')
        .map((p) => p.resourceId),
    );
    const fromRole = new Set(roleDefaults);
    const result = new Set<string>();
    for (const id of [...granted, ...fromRole]) {
      if (!denied.has(id)) result.add(id);
    }
    return Array.from(result);
  }

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
