import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import {
  getRoleEffectiveAccessForResourceWithInheritance,
  getUserEffectiveAccessForResource,
} from './access-effective.util';
import {
  buildKnowledgeCategoryResourceId,
  buildKnowledgeCategoryTestsResourceId,
  isKnowledgeCategoryResourceId,
  isKnowledgeCategoryTestsResourceId,
  KNOWLEDGE_CATEGORY_TESTS_RESOURCE_PREFIX,
  KNOWLEDGE_RESOURCE_ID,
  KNOWLEDGE_TESTS_RESOURCE_ID,
  parseKnowledgeCategoryResourceId,
  parseKnowledgeCategoryTestsResourceId,
} from './knowledge-resources.util';
import {
  isKnowledgeCategoryExplicitlyDenied,
  isKnowledgeSubResourceExplicitlyDenied,
} from './knowledge-trainee-category-access.util';
import { ADMIN_RESOURCES } from './resources.config';
import { AdminResourcePermissionLevel } from './dto/set-permission.dto';

export type MyResourcePermissionItem = {
  id: string;
  permission: 'VIEW' | 'PARTICIPATE' | 'EDIT';
};

export { ADMIN_ROLES };

type PermissionContext = {
  userPerms: Array<{ resourceId: string; permission: string }>;
  rolePermsForUser: Array<{ resourceId: string; permission: string }>;
  allRolePermsForRole: Array<{ resourceId: string; permission: AdminResourcePermissionLevel }>;
};

@Injectable()
export class AdminAccessService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadPermissionContext(
    userId: string,
    userRole: UserRole,
  ): Promise<PermissionContext> {
    const [userPerms, rolePermsForUser] = await Promise.all([
      this.prisma.adminResourcePermission.findMany({
        where: { userId },
        select: { resourceId: true, permission: true },
      }),
      this.prisma.adminResourceRolePermission.findMany({
        where: { role: userRole },
        select: { resourceId: true, permission: true },
      }),
    ]);

    return {
      userPerms,
      rolePermsForUser,
      allRolePermsForRole: rolePermsForUser.map((p) => ({
        resourceId: p.resourceId,
        permission: p.permission as AdminResourcePermissionLevel,
      })),
    };
  }

  private computeDirectEffectivePermission(
    resourceId: string,
    userRole: UserRole,
    ctx: PermissionContext,
  ): 'VIEW' | 'PARTICIPATE' | 'EDIT' | 'DENIED' | 'NONE' {
    const userExplicit = ctx.userPerms.find((p) => p.resourceId === resourceId)?.permission as
      | AdminResourcePermissionLevel
      | undefined;
    const roleExplicit = ctx.rolePermsForUser.find((p) => p.resourceId === resourceId)
      ?.permission as AdminResourcePermissionLevel | undefined;

    return getUserEffectiveAccessForResource(
      resourceId,
      userRole,
      userExplicit,
      roleExplicit,
      ctx.allRolePermsForRole,
    );
  }

  private isKnowledgeCategoryExplicitlyDenied(
    categoryResourceId: string,
    ctx: PermissionContext,
  ): boolean {
    return isKnowledgeCategoryExplicitlyDenied(
      categoryResourceId,
      ctx.userPerms,
      ctx.rolePermsForUser,
    );
  }

  private computeKnowledgeCategoryEffectivePermission(
    categoryResourceId: string,
    userRole: UserRole,
    ctx: PermissionContext,
  ): 'VIEW' | 'PARTICIPATE' | 'EDIT' | 'DENIED' | 'NONE' {
    return this.computeKnowledgeSubResourceEffectivePermission(categoryResourceId, userRole, ctx);
  }

  private computeKnowledgeCategoryTestsEffectivePermission(
    categoryTestsResourceId: string,
    userRole: UserRole,
    ctx: PermissionContext,
  ): 'VIEW' | 'PARTICIPATE' | 'EDIT' | 'DENIED' | 'NONE' {
    const direct = this.computeDirectEffectivePermission(categoryTestsResourceId, userRole, ctx);
    if (direct === 'DENIED') return 'DENIED';
    if (direct === 'VIEW' || direct === 'PARTICIPATE' || direct === 'EDIT') return direct;

    const testsBlock = this.computeKnowledgeTestsBlockEffectivePermission(userRole, ctx);
    if (testsBlock === 'DENIED') return 'DENIED';
    if (testsBlock === 'VIEW' || testsBlock === 'PARTICIPATE' || testsBlock === 'EDIT') {
      return testsBlock;
    }

    const parent = this.computeDirectEffectivePermission(KNOWLEDGE_RESOURCE_ID, userRole, ctx);
    if (parent === 'DENIED') return 'DENIED';
    if (parent === 'VIEW' || parent === 'PARTICIPATE' || parent === 'EDIT') return parent;
    return 'NONE';
  }

  private computeKnowledgeTestsBlockEffectivePermission(
    userRole: UserRole,
    ctx: PermissionContext,
  ): 'VIEW' | 'PARTICIPATE' | 'EDIT' | 'DENIED' | 'NONE' {
    const direct = this.computeDirectEffectivePermission(
      KNOWLEDGE_TESTS_RESOURCE_ID,
      userRole,
      ctx,
    );
    if (direct === 'DENIED') return 'DENIED';
    if (direct === 'VIEW' || direct === 'PARTICIPATE' || direct === 'EDIT') return direct;

    const parent = this.computeDirectEffectivePermission(KNOWLEDGE_RESOURCE_ID, userRole, ctx);
    if (parent === 'DENIED') return 'DENIED';
    if (parent === 'VIEW' || parent === 'PARTICIPATE' || parent === 'EDIT') return parent;
    return 'NONE';
  }

  private computeKnowledgeSubResourceEffectivePermission(
    resourceId: string,
    userRole: UserRole,
    ctx: PermissionContext,
  ): 'VIEW' | 'PARTICIPATE' | 'EDIT' | 'DENIED' | 'NONE' {
    const direct = this.computeDirectEffectivePermission(resourceId, userRole, ctx);
    if (direct === 'DENIED') return 'DENIED';
    if (direct === 'VIEW' || direct === 'PARTICIPATE' || direct === 'EDIT') return direct;

    const parent = this.computeDirectEffectivePermission(KNOWLEDGE_RESOURCE_ID, userRole, ctx);
    if (parent === 'DENIED') return 'DENIED';
    if (parent === 'VIEW' || parent === 'PARTICIPATE' || parent === 'EDIT') return parent;
    return 'NONE';
  }

  /**
   * Итоговый уровень доступа пользователя к ресурсу (VIEW / PARTICIPATE / EDIT / DENIED / NONE).
   */
  async getUserEffectivePermission(
    userId: string,
    userRole: UserRole,
    resourceId: string,
    ctx?: PermissionContext,
  ): Promise<'VIEW' | 'PARTICIPATE' | 'EDIT' | 'DENIED' | 'NONE'> {
    if (userRole === 'SUPER_ADMIN') {
      return 'EDIT';
    }

    const context = ctx ?? (await this.loadPermissionContext(userId, userRole));

    if (isKnowledgeCategoryResourceId(resourceId)) {
      return this.computeKnowledgeCategoryEffectivePermission(resourceId, userRole, context);
    }

    if (isKnowledgeCategoryTestsResourceId(resourceId)) {
      return this.computeKnowledgeCategoryTestsEffectivePermission(resourceId, userRole, context);
    }

    if (resourceId === KNOWLEDGE_TESTS_RESOURCE_ID) {
      return this.computeKnowledgeTestsBlockEffectivePermission(userRole, context);
    }

    return this.computeDirectEffectivePermission(resourceId, userRole, context);
  }

  async listAccessibleKnowledgeCategoryIds(userId: string, userRole: UserRole): Promise<string[]> {
    const categories = await this.prisma.knowledgeCategory.findMany({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { order: 'asc' },
    });

    if (userRole === 'SUPER_ADMIN') {
      return categories.map((category) => category.id);
    }

    const ctx = await this.loadPermissionContext(userId, userRole);

    // Стажёр видит все категории раздела, кроме явно закрытых на самой категории.
    // Не учитываем унаследованный DENIED от родителя admin.knowledge — иначе при
    // пользовательском доступе к разделу и ролевом DENIED на родителе список пустой.
    if (userRole === 'TRAINEE') {
      const parent = await this.getUserEffectivePermission(
        userId,
        userRole,
        KNOWLEDGE_RESOURCE_ID,
        ctx,
      );
      if (parent === 'DENIED' || parent === 'NONE') {
        return [];
      }

      return categories
        .filter(
          (category) =>
            !this.isKnowledgeCategoryExplicitlyDenied(
              buildKnowledgeCategoryResourceId(category.id),
              ctx,
            ),
        )
        .map((category) => category.id);
    }

    const accessible: string[] = [];

    for (const category of categories) {
      const effective = this.computeKnowledgeCategoryEffectivePermission(
        buildKnowledgeCategoryResourceId(category.id),
        userRole,
        ctx,
      );
      if (effective === 'VIEW' || effective === 'PARTICIPATE' || effective === 'EDIT') {
        accessible.push(category.id);
      }
    }

    return accessible;
  }

  async listAccessibleKnowledgeCategoryTestsIds(
    userId: string,
    userRole: UserRole,
  ): Promise<string[]> {
    const categories = await this.prisma.knowledgeCategory.findMany({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { order: 'asc' },
    });

    if (userRole === 'SUPER_ADMIN') {
      return categories.map((category) => category.id);
    }

    const ctx = await this.loadPermissionContext(userId, userRole);

    const testsBlock = this.computeKnowledgeTestsBlockEffectivePermission(userRole, ctx);
    if (testsBlock !== 'VIEW' && testsBlock !== 'PARTICIPATE' && testsBlock !== 'EDIT') {
      return [];
    }

    if (userRole === 'TRAINEE') {
      const parent = await this.getUserEffectivePermission(
        userId,
        userRole,
        KNOWLEDGE_RESOURCE_ID,
        ctx,
      );
      if (parent === 'DENIED' || parent === 'NONE') {
        return [];
      }

      if (
        isKnowledgeSubResourceExplicitlyDenied(
          KNOWLEDGE_TESTS_RESOURCE_ID,
          KNOWLEDGE_TESTS_RESOURCE_ID,
          ctx.userPerms,
          ctx.rolePermsForUser,
        )
      ) {
        return [];
      }

      return categories
        .filter(
          (category) =>
            !isKnowledgeSubResourceExplicitlyDenied(
              buildKnowledgeCategoryTestsResourceId(category.id),
              KNOWLEDGE_CATEGORY_TESTS_RESOURCE_PREFIX,
              ctx.userPerms,
              ctx.rolePermsForUser,
            ),
        )
        .map((category) => category.id);
    }

    const accessible: string[] = [];

    for (const category of categories) {
      const effective = this.computeKnowledgeCategoryTestsEffectivePermission(
        buildKnowledgeCategoryTestsResourceId(category.id),
        userRole,
        ctx,
      );
      if (effective === 'VIEW' || effective === 'PARTICIPATE' || effective === 'EDIT') {
        accessible.push(category.id);
      }
    }

    return accessible;
  }

  /**
   * Ресурсы админки с итоговым уровнем доступа (VIEW, PARTICIPATE и EDIT).
   */
  async getMyResourcePermissions(
    userId: string,
    userRole: UserRole,
  ): Promise<MyResourcePermissionItem[]> {
    if (userRole === 'SUPER_ADMIN') {
      return ADMIN_RESOURCES.map((r) => ({ id: r.id, permission: 'EDIT' as const }));
    }

    const ctx = await this.loadPermissionContext(userId, userRole);
    const result: MyResourcePermissionItem[] = [];

    for (const resource of ADMIN_RESOURCES) {
      const effective =
        resource.id === KNOWLEDGE_TESTS_RESOURCE_ID
          ? this.computeKnowledgeTestsBlockEffectivePermission(userRole, ctx)
          : this.computeDirectEffectivePermission(resource.id, userRole, ctx);
      if (effective === 'VIEW' || effective === 'PARTICIPATE' || effective === 'EDIT') {
        result.push({ id: resource.id, permission: effective });
      }
    }

    const categories = await this.prisma.knowledgeCategory.findMany({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { order: 'asc' },
    });

    for (const category of categories) {
      const resourceId = buildKnowledgeCategoryResourceId(category.id);
      if (result.some((item) => item.id === resourceId)) continue;

      const effective = this.computeKnowledgeCategoryEffectivePermission(resourceId, userRole, ctx);
      if (effective === 'VIEW' || effective === 'PARTICIPATE' || effective === 'EDIT') {
        result.push({ id: resourceId, permission: effective });
      }
    }

    for (const category of categories) {
      const resourceId = buildKnowledgeCategoryTestsResourceId(category.id);
      if (result.some((item) => item.id === resourceId)) continue;

      const effective = this.computeKnowledgeCategoryTestsEffectivePermission(
        resourceId,
        userRole,
        ctx,
      );
      if (effective === 'VIEW' || effective === 'PARTICIPATE' || effective === 'EDIT') {
        result.push({ id: resourceId, permission: effective });
      }
    }

    if (!result.some((item) => item.id === KNOWLEDGE_TESTS_RESOURCE_ID)) {
      const testsEffective = this.computeKnowledgeTestsBlockEffectivePermission(userRole, ctx);
      if (
        testsEffective === 'VIEW' ||
        testsEffective === 'PARTICIPATE' ||
        testsEffective === 'EDIT'
      ) {
        result.push({ id: KNOWLEDGE_TESTS_RESOURCE_ID, permission: testsEffective });
      }
    }

    return result;
  }

  /**
   * Список resourceId, к которым имеет доступ текущий пользователь (просмотр или редактирование).
   */
  async getMyAccessibleResources(userId: string, userRole: UserRole): Promise<string[]> {
    const permissions = await this.getMyResourcePermissions(userId, userRole);
    return permissions.map((p) => p.id);
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

  private async resolveResource(resourceId: string) {
    const known = ADMIN_RESOURCES.find((r) => r.id === resourceId);
    if (known) return known;

    if (resourceId === KNOWLEDGE_TESTS_RESOURCE_ID) {
      return {
        id: resourceId,
        label: 'Территория знаний — итоговые тесты',
        path: '/admin/knowledge/tests',
      };
    }

    const categoryId =
      parseKnowledgeCategoryResourceId(resourceId) ??
      parseKnowledgeCategoryTestsResourceId(resourceId);
    if (!categoryId) {
      throw new NotFoundException(`Ресурс ${resourceId} не найден`);
    }

    const category = await this.prisma.knowledgeCategory.findFirst({
      where: { id: categoryId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!category) {
      throw new NotFoundException(`Ресурс ${resourceId} не найден`);
    }

    const isTestsResource = isKnowledgeCategoryTestsResourceId(resourceId);

    return {
      id: resourceId,
      label: isTestsResource
        ? `Территория знаний — тесты: ${category.name}`
        : `Территория знаний — ${category.name}`,
      path: isTestsResource
        ? `/admin/knowledge/tests?category=${category.id}`
        : `/admin/knowledge?category=${category.id}`,
    };
  }

  async getPermissions(resourceId: string) {
    await this.resolveResource(resourceId);
    const [userList, roleList, allRolePerms] = await Promise.all([
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
      this.prisma.adminResourceRolePermission.findMany({
        select: { role: true, resourceId: true, permission: true },
      }),
    ]);

    const explicitByRole = new Map(
      roleList.map((p) => [p.role, p.permission as AdminResourcePermissionLevel]),
    );
    const rolePermsByRole = new Map<
      UserRole,
      Array<{ resourceId: string; permission: AdminResourcePermissionLevel }>
    >();
    for (const role of ADMIN_ROLES) {
      rolePermsByRole.set(role, []);
    }
    for (const p of allRolePerms) {
      const role = p.role as UserRole;
      if (!rolePermsByRole.has(role)) continue;
      rolePermsByRole.get(role)!.push({
        resourceId: p.resourceId,
        permission: p.permission as AdminResourcePermissionLevel,
      });
    }

    const roleOverview = ADMIN_ROLES.map((role) =>
      getRoleEffectiveAccessForResourceWithInheritance(
        resourceId,
        role,
        explicitByRole.get(role),
        rolePermsByRole.get(role) ?? [],
      ),
    );

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
      roleOverview,
    };
  }

  async setPermission(
    resourceId: string,
    userId: string,
    permission: AdminResourcePermissionLevel,
  ) {
    await this.resolveResource(resourceId);
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
    await this.resolveResource(resourceId);
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
    await this.resolveResource(resourceId);
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
    await this.resolveResource(resourceId);
    await this.prisma.adminResourceRolePermission.deleteMany({
      where: { resourceId, role },
    });
    return this.getPermissions(resourceId);
  }
}
