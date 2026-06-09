import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Понятные подписи к полям БД для сообщений об уникальности */
const UNIQUE_FIELD_LABELS: Record<string, string> = {
  slug: 'URL товара (slug)',
  sku: 'артикул',
  email: 'email',
};

function formatUniqueConstraintMessage(target: unknown): string {
  const fields = Array.isArray(target)
    ? target.filter((f): f is string => typeof f === 'string')
    : [];
  if (fields.length === 0) {
    return 'Запись с такими данными уже существует. Измените поля и повторите попытку.';
  }
  const labels = fields.map((f) => UNIQUE_FIELD_LABELS[f] ?? f);
  if (labels.length === 1) {
    return `Поле «${labels[0]}» должно быть уникальным. Значение уже используется в каталоге — укажите другое.`;
  }
  return `Комбинация полей (${labels.join(', ')}) уже занята. Измените данные и повторите сохранение.`;
}

/**
 * Превращает PrismaClientKnownRequestError в HTTP-ответ с понятным текстом вместо 500 Internal Server Error.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    switch (exception.code) {
      case 'P2002':
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: formatUniqueConstraintMessage(exception.meta?.target),
          error: 'Conflict',
        });
      case 'P2003':
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message:
            'Неверная связь с другой записью (категория, поставщик и т.п.). Проверьте выбранные значения.',
          error: 'Bad Request',
        });
      case 'P2025':
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Запись не найдена или уже удалена.',
          error: 'Not Found',
        });
      case 'P2021':
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            'Таблица в базе данных не найдена. Возможно, не применены миграции Prisma (prisma migrate deploy).',
          error: 'Internal Server Error',
        });
      default:
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message:
            'Не удалось сохранить данные. Проверьте введённые значения и попробуйте снова. Если ошибка повторяется, обратитесь к администратору.',
          error: 'Bad Request',
        });
    }
  }
}
