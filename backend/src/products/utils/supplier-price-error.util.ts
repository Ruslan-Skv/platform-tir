import { HttpException } from '@nestjs/common';

export type SupplierPriceErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'PRICE_NOT_FOUND'
  | 'TIMEOUT'
  | 'INVALID_URL'
  | 'FETCH_ERROR'
  | 'UNKNOWN';

export interface SupplierPriceErrorInfo {
  message: string;
  errorCode: SupplierPriceErrorCode;
}

function extractHttpExceptionMessage(err: HttpException): string {
  const response = err.getResponse();
  if (typeof response === 'string') return response;
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const message = (response as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return err.message;
}

export function formatSupplierPriceError(err: unknown): SupplierPriceErrorInfo {
  if (err instanceof HttpException) {
    const message = extractHttpExceptionMessage(err);
    const status = err.getStatus();

    if (status === 404 || message === 'Страница не найдена' || message === 'Товар не найден') {
      return { message: 'Товар не найден', errorCode: 'PRODUCT_NOT_FOUND' };
    }
    if (message.startsWith('Не удалось найти цену на странице')) {
      return { message: 'Цена не найдена на странице поставщика', errorCode: 'PRICE_NOT_FOUND' };
    }
    if (message === 'Превышено время ожидания ответа от сервера') {
      return { message, errorCode: 'TIMEOUT' };
    }
    if (message === 'Некорректная ссылка') {
      return { message, errorCode: 'INVALID_URL' };
    }
    if (message.startsWith('Ошибка при получении страницы')) {
      return { message, errorCode: 'FETCH_ERROR' };
    }

    return { message, errorCode: 'UNKNOWN' };
  }

  if (err instanceof Error) {
    return { message: err.message, errorCode: 'UNKNOWN' };
  }

  return { message: String(err), errorCode: 'UNKNOWN' };
}
