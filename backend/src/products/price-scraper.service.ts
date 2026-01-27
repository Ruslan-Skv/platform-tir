import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as cheerio from 'cheerio';

@Injectable()
export class PriceScraperService {
  /**
   * Получает цену товара по ссылке поставщика
   * Пытается извлечь цену из HTML страницы используя различные селекторы
   */
  async getPriceFromUrl(url: string): Promise<number> {
    if (!url || !this.isValidUrl(url)) {
      throw new HttpException('Некорректная ссылка', HttpStatus.BAD_REQUEST);
    }

    try {
      // Получаем HTML страницы используя fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpException('Страница не найдена', HttpStatus.NOT_FOUND);
        }
        throw new HttpException(
          `Ошибка при получении страницы: ${response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Список возможных селекторов для поиска цены
      // Популярные селекторы для цен на различных сайтах
      const priceSelectors = [
        // JSON-LD структурированные данные
        'script[type="application/ld+json"]',
        // Мета-теги
        'meta[property="product:price:amount"]',
        'meta[itemprop="price"]',
        // Атрибуты data-price
        '[data-price]',
        '[data-product-price]',
        '[data-cost]',
        // Классы с ценой
        '.price',
        '.product-price',
        '.price-value',
        '.cost',
        '.product-cost',
        '.current-price',
        '.price-current',
        '.price-now',
        '.price-final',
        // ID с ценой
        '#price',
        '#product-price',
        '#cost',
        // Span/div с ценой
        'span.price',
        'div.price',
        'span[class*="price"]',
        'div[class*="price"]',
        // Специфичные для популярных платформ
        '.product__price',
        '.product-price__current',
        '.price-box__price',
      ];

      // Пытаемся найти цену через JSON-LD (самый надежный способ)
      const jsonLdScripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < jsonLdScripts.length; i++) {
        try {
          const scriptContent = $(jsonLdScripts[i]).html();
          if (scriptContent) {
            const jsonData = JSON.parse(scriptContent);
            const price = this.extractPriceFromJsonLd(jsonData);
            if (price) {
              return price;
            }
          }
        } catch (e) {
          // Продолжаем поиск
        }
      }

      // Пытаемся найти цену через мета-теги
      const metaPrice = $('meta[property="product:price:amount"]').attr('content');
      if (metaPrice) {
        const price = this.parsePrice(metaPrice);
        if (price) return price;
      }

      const metaItemPropPrice = $('meta[itemprop="price"]').attr('content');
      if (metaItemPropPrice) {
        const price = this.parsePrice(metaItemPropPrice);
        if (price) return price;
      }

      // Пытаемся найти цену через селекторы
      for (const selector of priceSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          // Пробуем получить цену из атрибута data-price
          const dataPrice = element.attr('data-price') || element.attr('data-product-price');
          if (dataPrice) {
            const price = this.parsePrice(dataPrice);
            if (price) return price;
          }

          // Пробуем получить цену из текста элемента
          const text = element.text().trim();
          if (text) {
            const price = this.parsePrice(text);
            if (price) return price;
          }
        }
      }

      // Если ничего не нашли, пытаемся найти любые числа, похожие на цены
      const bodyText = $('body').text();
      const pricePatterns = [
        /(\d+[\s,.]?\d*[\s,.]?\d*)\s*₽/g, // Рубли
        /₽\s*(\d+[\s,.]?\d*[\s,.]?\d*)/g, // Рубли (обратный порядок)
        /(\d+[\s,.]?\d*[\s,.]?\d*)\s*руб/g, // Рубли (текст)
        /руб\s*(\d+[\s,.]?\d*[\s,.]?\d*)/g, // Рубли (текст, обратный)
        /(\d+[\s,.]?\d*[\s,.]?\d*)\s*RUB/g, // RUB
        /(\d+[\s,.]?\d*[\s,.]?\d*)\s*р\./g, // р.
        /(\d{1,3}(?:\s?\d{3})*(?:[.,]\d{2})?)/g, // Общий паттерн для цен
      ];

      const foundPrices: number[] = [];
      for (const pattern of pricePatterns) {
        const matches = bodyText.matchAll(pattern);
        for (const match of matches) {
          const priceStr = match[1] || match[0];
          const price = this.parsePrice(priceStr);
          if (price && price > 0 && price < 10000000) {
            // Разумные пределы для цены
            foundPrices.push(price);
          }
        }
      }

      if (foundPrices.length > 0) {
        // Возвращаем самую большую цену (обычно это актуальная цена)
        return Math.max(...foundPrices);
      }

      throw new HttpException(
        'Не удалось найти цену на странице. Возможно, структура страницы не поддерживается.',
        HttpStatus.NOT_FOUND,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new HttpException(
            'Превышено время ожидания ответа от сервера',
            HttpStatus.REQUEST_TIMEOUT,
          );
        }
        throw new HttpException(
          `Ошибка при парсинге цены: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Неизвестная ошибка при парсинге цены',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Извлекает цену из JSON-LD структурированных данных
   */
  private extractPriceFromJsonLd(data: unknown): number | null {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      // Пробуем найти цену в различных форматах JSON-LD
      if (obj.offers) {
        if (Array.isArray(obj.offers)) {
          for (const offer of obj.offers) {
            const offerObj = offer as Record<string, unknown>;
            if (offerObj.price) {
              const price = this.parsePrice(String(offerObj.price));
              if (price) return price;
            }
          }
        } else {
          const offersObj = obj.offers as Record<string, unknown>;
          if (offersObj.price) {
            const price = this.parsePrice(String(offersObj.price));
            if (price) return price;
          }
        }
      }

      if (obj.price) {
        const price = this.parsePrice(String(obj.price));
        if (price) return price;
      }

      // Рекурсивно ищем в дочерних объектах
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const result = this.extractPriceFromJsonLd(obj[key]);
          if (result) return result;
        }
      }
    }

    return null;
  }

  /**
   * Парсит строку с ценой в число
   */
  private parsePrice(priceStr: string): number | null {
    if (!priceStr) return null;

    // Удаляем все символы кроме цифр, точек, запятых и пробелов
    const cleaned = priceStr
      .replace(/[^\d.,\s]/g, '')
      .replace(/\s/g, '')
      .trim();

    if (!cleaned) return null;

    // Заменяем запятую на точку (для русской локали)
    const normalized = cleaned.replace(',', '.');

    // Удаляем все точки кроме последней (для тысяч)
    const parts = normalized.split('.');
    if (parts.length > 2) {
      // Если больше одной точки, оставляем только последнюю как десятичную
      const integerPart = parts.slice(0, -1).join('');
      const decimalPart = parts[parts.length - 1];
      const price = parseFloat(integerPart + '.' + decimalPart);
      return isNaN(price) ? null : price;
    }

    const price = parseFloat(normalized);
    return isNaN(price) ? null : price;
  }

  /**
   * Проверяет, является ли строка валидным URL
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
