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
  'TRAINEE',
];

@Injectable()
export class AdminAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Список resourceId, к которым имеет доступ текущий пользователь.
   * SUPER_ADMIN — все. Остальные: дефолты роли + права по роли + права по пользователю, минус запреты.
   * Запрет (DENIED) по пользователю или по роли исключает ресурс и всех его потомков.
   */
  async getMyAccessibleResources(userId: string, userRole: UserRole): Promise<string[]> {
    if (userRole === 'SUPER_ADMIN') {
      return ADMIN_RESOURCES.map((r) => r.id);
    }
    const [userPerms, rolePerms, roleDefaults] = await Promise.all([
      this.prisma.adminResourcePermission.findMany({
        where: { userId },
        select: { resourceId: true, permission: true },
      }),
      this.prisma.adminResourceRolePermission.findMany({
        where: { role: userRole },
        select: { resourceId: true, permission: true },
      }),
      Promise.resolve(ROLE_DEFAULT_RESOURCES[userRole] ?? ['admin']),
    ]);
    const deniedIds = new Set<string>([
      ...userPerms.filter((p) => p.permission === 'DENIED').map((p) => p.resourceId),
      ...rolePerms.filter((p) => p.permission === 'DENIED').map((p) => p.resourceId),
    ]);
    /** Исключить id, если он или любой его предок (admin.content для admin.content.blog) в denied */
    const isDenied = (id: string) =>
      deniedIds.has(id) || [...deniedIds].some((d) => id.startsWith(d + '.'));
    const granted = new Set<string>([
      ...roleDefaults,
      ...rolePerms
        .filter((p) => p.permission === 'VIEW' || p.permission === 'EDIT')
        .map((p) => p.resourceId),
      ...userPerms
        .filter((p) => p.permission === 'VIEW' || p.permission === 'EDIT')
        .map((p) => p.resourceId),
    ]);
    const result = new Set<string>();
    for (const id of granted) {
      if (!isDenied(id)) result.add(id);
    }
    return Array.from(result);
  }

  getAdminRoles() {
    return ADMIN_ROLES.map((role) => ({
      id: role,
      label: role,
    }));
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
    const [userList, roleList] = await Promise.all([
      this.prisma.adminResourcePermission.findMany({
        where: { resourceId },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.adminResourceRolePermission.findMany({
        where: { resourceId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      users: userList.map((p) => ({
        type: 'user' as const,
        id: p.userId,
        email: p.user.email,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        role: p.user.role,
        permission: p.permission,
        createdAt: p.createdAt,
      })),
      roles: roleList.map((p) => ({
        type: 'role' as const,
        id: p.role,
        role: p.role,
        permission: p.permission,
        createdAt: p.createdAt,
      })),
    };
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

  async setRolePermission(
    resourceId: string,
    role: string,
    permission: AdminResourcePermissionLevel,
  ) {
    this.getResourceById(resourceId);
    if (!ADMIN_ROLES.includes(role as UserRole)) {
      throw new NotFoundException(`Роль ${role} не найдена`);
    }
    await this.prisma.adminResourceRolePermission.upsert({
      where: {
        resourceId_role: { resourceId, role },
      },
      create: { resourceId, role, permission },
      update: { permission },
    });
    return this.getPermissions(resourceId);
  }

  async revokeRolePermission(resourceId: string, role: string) {
    this.getResourceById(resourceId);
    await this.prisma.adminResourceRolePermission.deleteMany({
      where: { resourceId, role },
    });
    return this.getPermissions(resourceId);
  }
}
