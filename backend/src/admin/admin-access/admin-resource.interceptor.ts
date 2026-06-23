import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Observable } from 'rxjs';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import {
  matchAdminApiResourceRule,
  permissionLevelSatisfies,
} from '../../common/config/admin-api-resource-rules.config';
import { AdminResourcePermissionLevel } from '../../common/types/admin-resource-permission-level';
import { AdminAccessService } from './admin-access.service';

@Injectable()
export class AdminResourceInterceptor implements NestInterceptor {
  constructor(private readonly adminAccessService: AdminAccessService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<{
      user?: { id: string; role: string };
      method: string;
      path: string;
      url: string;
    }>();

    const user = request.user;
    if (!user?.id || user.role === 'SUPER_ADMIN') {
      return next.handle();
    }

    const requestPath = request.path ?? request.url?.split('?')[0] ?? '';
    const isAdminApiPath = requestPath.startsWith('/api/v1/admin/');
    const isAdminUser = ADMIN_ROLES.includes(user.role as UserRole);

    const matched = matchAdminApiResourceRule(request.method, requestPath);
    if (!matched) {
      return next.handle();
    }

    // Маршруты вне /admin/ (products, categories, …) — только для ролей админки
    if (!isAdminApiPath && !isAdminUser) {
      return next.handle();
    }

    const effective = await this.adminAccessService.getUserEffectivePermission(
      user.id,
      user.role as UserRole,
      matched.resourceId,
    );

    if (!permissionLevelSatisfies(effective, matched.level)) {
      const actionLabels: Record<string, string> = {
        [AdminResourcePermissionLevel.EDIT]: 'редактирования',
        [AdminResourcePermissionLevel.PARTICIPATE]: 'участия',
        [AdminResourcePermissionLevel.VIEW]: 'просмотра',
      };
      const action = actionLabels[matched.level] ?? 'доступа';
      throw new ForbiddenException(`Недостаточно прав для ${action} раздела`);
    }

    return next.handle();
  }
}
