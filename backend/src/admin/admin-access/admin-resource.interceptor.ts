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
import { isPublicLegacyCatalogReadRequest } from '../../common/utils/public-catalog-read-path.util';
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
      query?: Record<string, unknown>;
    }>();

    const user = request.user;
    if (!user?.id || user.role === 'SUPER_ADMIN') {
      return next.handle();
    }

    const requestPath = request.path ?? request.url?.split('?')[0] ?? '';
    const isAdminApiPath = requestPath.startsWith('/api/v1/admin/');
    const isAdminUser = ADMIN_ROLES.includes(user.role as UserRole);

    // Личный кабинет на публичке (в т.ч. стажёры с ролью TRAINEE в админке).
    if (requestPath.startsWith('/api/v1/users/me/')) {
      return next.handle();
    }

    // Чат поддержки для клиента; панель поддержки — ?asSupport=true (проверяется ниже).
    const asSupport =
      typeof request.query?.asSupport === 'string' ? request.query.asSupport === 'true' : false;
    if (requestPath.startsWith('/api/v1/support/') && !asSupport) {
      return next.handle();
    }

    const matched = matchAdminApiResourceRule(request.method, requestPath);
    if (!matched) {
      return next.handle();
    }

    // Legacy /products, /categories — публичное чтение (в т.ч. стажёр/админ на публичке).
    if (!isAdminApiPath && isPublicLegacyCatalogReadRequest(request.method, requestPath)) {
      return next.handle();
    }

    // Мутации и прочие legacy-маршруты с resourceId — только для админки с правами.
    if (!isAdminApiPath && !isAdminUser) {
      throw new ForbiddenException('Недостаточно прав для доступа к разделу');
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
