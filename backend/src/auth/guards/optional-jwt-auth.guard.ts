import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Опциональная JWT-авторизация: не выбрасывает ошибку при отсутствии токена,
 * но устанавливает req.user при валидном токене.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser | false): TUser | undefined {
    if (err) {
      throw err;
    }
    return (user as TUser) ?? undefined;
  }
}
