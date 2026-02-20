import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Пометка эндпоинта как публичного (без JWT). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
