import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PrismaService } from '../database/prisma.service';
import { assertSafeFetchUrl } from '../common/utils/safe-fetch-url.util';

@Injectable()
export class PriceScraperService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly fetchTimeoutMs = 20_000;

  private readonly parserTitles: Record<string, string> = {
    STROYKOM_INTERIOR: 'Стройком - Межкомнатные двери',
    STROYKOM_ENTRANCE: 'Стройком - Входные двери',
    MAXIDOORS_INTERIOR: 'MaxiDoors - Межкомнатные двери',
    MAXIDOORS_ENTRANCE: 'MaxiDoors - Входные двери',
    GENERIC: 'Универсальный парсер',
  };

  async getParserInfo(params: {
    url?: string;
    supplierId?: string;
    categoryId?: string;
  }): Promise<{ key: string; title: string }> {
    const key = await this.resolveParserKey(params);
    return { key, title: this.parserTitles[key] ?? key };
  }

  /**
   * Получает цену товара по ссылке поставщика
   * Пытается извлечь цену из HTML страницы используя различные селекторы
   */
  async getPriceFromUrl(
    url: string,
    options?: { supplierId?: string; categoryId?: string },
  ): Promise<{ price: number; parser: { key: string; title: string } }> {
    if (!url || !this.isValidUrl(url)) {
      throw new HttpException('Некорректная ссылка', HttpStatus.BAD_REQUEST);
    }

    try {
      const parserKey = await this.resolveParserKey({
        url,
        supplierId: options?.supplierId,
        categoryId: options?.categoryId,
      });

      const html = await this.fetchHtmlSafely(url);
      const $ = cheerio.load(html);

      // Доменно- / поставщико- / категорийно-специфичные парсеры
      if (parserKey === 'MAXIDOORS_INTERIOR') {
        const price = this.extractMaxiDoorsCanvasPrice($);
        if (price)
          return { price, parser: { key: parserKey, title: this.parserTitles[parserKey] } };
      }
      if (parserKey === 'MAXIDOORS_ENTRANCE') {
        const price = this.extractMaxiDoorsEntrancePrice($);
        if (price)
          return { price, parser: { key: parserKey, title: this.parserTitles[parserKey] } };
      }
      if (parserKey === 'STROYKOM_INTERIOR') {
        const price = this.extractStroykomInteriorPrice($);
        if (price)
          return { price, parser: { key: parserKey, title: this.parserTitles[parserKey] } };
      }
      if (parserKey === 'STROYKOM_ENTRANCE') {
        const price = this.extractStroykomEntrancePrice($);
        if (price)
          return { price, parser: { key: parserKey, title: this.parserTitles[parserKey] } };
      }

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
              return { price, parser: { key: parserKey, title: this.parserTitles[parserKey] } };
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
        if (price)
          return { price, parser: { key: parserKey, title: this.parserTitles[parserKey] } };
      }

      const metaItemPropPrice = $('meta[itemprop="price"]').attr('content');
      if (metaItemPropPrice) {
        const price = this.parsePrice(metaItemPropPrice);
        if (price)
          return { price, parser: { key: parserKey, title: this.parserTitles[parserKey] } };
      }

      // Пытаемся найти цену через селекторы
      for (const selector of priceSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          // Пробуем получить цену из атрибута data-price
          const dataPrice = element.attr('data-price') || element.attr('data-product-price');
          if (dataPrice) {
            const price = this.parsePrice(dataPrice);
            if (price)
              return { price, parser: { key: parserKey, title: this.parserTitles[parserKey] } };
          }

          // Пробуем получить цену из текста элемента
          const text = element.text().trim();
          if (text) {
            const price = this.parsePrice(text);
            if (price) {
              return { price, parser: { key: parserKey, title: this.parserTitles[parserKey] } };
            }
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
        /(\d{1,3}(?:\s?\d{3})*(?:[.,]\d{2})?)/g, // Общий паттерн (используем только если не нашли "сильных" совпадений)
      ];

      const foundStrongPrices: number[] = [];
      const foundWeakPrices: number[] = [];
      for (const pattern of pricePatterns) {
        const matches = bodyText.matchAll(pattern);
        for (const match of matches) {
          const priceStr = match[1] || match[0];
          const price = this.parsePrice(priceStr);
          if (price && price > 0 && price < 10000000) {
            // Разумные пределы для цены
            // Считаем "сильными" только те, которые явно помечены валютой (₽/руб/р./RUB).
            // Это защищает от ложных срабатываний на домены/телефоны/артикулы, например: "436830.ru" -> 436830.
            const fullMatch = match[0] ?? '';
            const isStrong = /₽|руб|RUB|р\./i.test(fullMatch);
            (isStrong ? foundStrongPrices : foundWeakPrices).push(price);
          }
        }
      }

      if (foundStrongPrices.length > 0) {
        // Возвращаем самую большую "сильную" цену (обычно это актуальная цена)
        return {
          price: Math.max(...foundStrongPrices),
          parser: { key: parserKey, title: this.parserTitles[parserKey] },
        };
      }

      if (foundWeakPrices.length > 0) {
        // Fallback: если валютных маркеров нет, берём самую большую из слабых совпадений
        return {
          price: Math.max(...foundWeakPrices),
          parser: { key: parserKey, title: this.parserTitles[parserKey] },
        };
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

  private async resolveParserKey(params: {
    url?: string;
    supplierId?: string;
    categoryId?: string;
  }): Promise<string> {
    const host = this.extractHost(params.url);
    const supplierKind = await this.resolveSupplierKind(params.supplierId, host);
    const categoryKind = params.categoryId
      ? await this.resolveDoorCategoryKind(params.categoryId)
      : 'UNKNOWN';

    if (supplierKind === 'STROYKOM') {
      return categoryKind === 'ENTRANCE' ? 'STROYKOM_ENTRANCE' : 'STROYKOM_INTERIOR';
    }
    if (supplierKind === 'MAXIDOORS') {
      return categoryKind === 'ENTRANCE' ? 'MAXIDOORS_ENTRANCE' : 'MAXIDOORS_INTERIOR';
    }
    return 'GENERIC';
  }

  private extractHost(url?: string): string | null {
    if (!url) return null;
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  private async resolveSupplierKind(
    supplierId?: string,
    host?: string | null,
  ): Promise<'STROYKOM' | 'MAXIDOORS' | 'UNKNOWN'> {
    const hostNorm = host ?? '';
    if (hostNorm.endsWith('436830.ru')) return 'STROYKOM'; // Явно закрепляем первый парсер за доменом
    if (hostNorm.endsWith('maxi-doors.ru')) return 'MAXIDOORS';

    if (!supplierId) return 'UNKNOWN';
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { legalName: true, commercialName: true, website: true },
    });
    if (!supplier) return 'UNKNOWN';

    const bag =
      `${supplier.legalName || ''} ${supplier.commercialName || ''} ${supplier.website || ''}`.toLowerCase();
    if (bag.includes('436830.ru') || bag.includes('стройком') || bag.includes('stroykom')) {
      return 'STROYKOM';
    }
    if (bag.includes('maxi-doors.ru') || bag.includes('максидорс') || bag.includes('maxidoors')) {
      return 'MAXIDOORS';
    }
    return 'UNKNOWN';
  }

  private async resolveDoorCategoryKind(
    categoryId: string,
  ): Promise<'ENTRANCE' | 'INTERIOR' | 'UNKNOWN'> {
    const chain: Array<{ name: string; slug: string; parentId: string | null }> = [];
    let currentId: string | null = categoryId;
    let guard = 0;
    while (currentId && guard < 12) {
      guard += 1;
      const cat: { id: string; name: string; slug: string; parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: currentId },
          select: { id: true, name: true, slug: true, parentId: true },
        });
      if (!cat) break;
      chain.push({ name: cat.name, slug: cat.slug, parentId: cat.parentId });
      currentId = cat.parentId;
    }

    // От листа к корню: иначе родитель «Входные двери» перехватывает «Двери межкомнатные».
    // На каждом уровне сначала межкомнатные (подстрока «межком»), затем входные.
    for (const c of chain) {
      const blob = `${c.name} ${c.slug}`.toLowerCase();
      if (/межком|mezhkom|interior/.test(blob)) return 'INTERIOR';
      if (/вход|vhod|entrance/.test(blob)) return 'ENTRANCE';
    }
    return 'UNKNOWN';
  }

  /**
   * MaxiDoors: нам нужна стоимость "Полотно" (не комплектующие).
   * На странице обычно есть блок "Стоимость:" с вариантами "Полотно" / "Комплект".
   * Внутри блока может быть 2 цены (скидка): берём минимальную как актуальную.
   */
  private extractMaxiDoorsCanvasPrice($: ReturnType<typeof cheerio.load>): number | null {
    const getStrongPricesFromText = (text: string): number[] => {
      const normalized = text.replace(/\s+/g, ' ').trim();
      const patterns = [
        /(\d[\d\s.,]*)\s*₽/gi,
        /(\d[\d\s.,]*)\s*руб/gi,
        /(\d[\d\s.,]*)\s*р\./gi,
        /(\d[\d\s.,]*)\s*RUB/gi,
      ];
      const out: number[] = [];
      for (const re of patterns) {
        for (const m of normalized.matchAll(re)) {
          const raw = m[1] ?? m[0];
          const parsed = this.parsePrice(raw);
          if (parsed && parsed > 0 && parsed < 10000000) out.push(parsed);
        }
      }
      return out;
    };

    const extractNearestToLabel = (text: string, label: string): number | null => {
      const normalized = text.replace(/\s+/g, ' ').trim();
      const labelIndex = normalized.toLowerCase().indexOf(label.toLowerCase());
      if (labelIndex < 0) return null;

      // На MaxiDoors цены обычно стоят ПЕРЕД словом "Полотно"
      const beforeWindow = normalized.slice(Math.max(0, labelIndex - 160), labelIndex);
      const afterWindow = normalized.slice(
        labelIndex,
        Math.min(normalized.length, labelIndex + 120),
      );

      const beforePrices = getStrongPricesFromText(beforeWindow);
      if (beforePrices.length > 0) {
        // Если есть 2 цены (старая + новая), берём минимальную (актуальную)
        return Math.min(...beforePrices);
      }

      const afterPrices = getStrongPricesFromText(afterWindow);
      if (afterPrices.length > 0) return Math.min(...afterPrices);

      return null;
    };

    // 1) Точный путь: из секции "Стоимость ... (до Состав/Характеристики/...)"
    const pageText = $('body').text().replace(/\s+/g, ' ').trim();
    const costSectionMatch = pageText.match(
      /Стоимость\s*:?\s*([\s\S]{0,1200}?)(?:Состав|Характеристики|Остаток на складе|Количество|Комплектующие)/i,
    );
    if (costSectionMatch?.[1]) {
      const fromCostSection = extractNearestToLabel(costSectionMatch[1], 'Полотно');
      if (fromCostSection) return fromCostSection;
    }

    // 2) DOM fallback: локальный контейнер рядом с "Стоимость"
    const costNodes = $('*:contains("Стоимость")').slice(0, 20).toArray();
    for (const node of costNodes) {
      const start = $(node);
      const candidates = [
        start,
        start.parent(),
        start.parent().parent(),
        start.parent().parent().parent(),
      ];
      for (const c of candidates) {
        if (!c || c.length === 0) continue;
        const text = c.text();
        if (!/Полотно/i.test(text)) continue;
        const val = extractNearestToLabel(text, 'Полотно');
        if (val) return val;
      }
    }

    return null;
  }

  private extractMaxiDoorsEntrancePrice($: ReturnType<typeof cheerio.load>): number | null {
    // Пока используем ту же стратегию, что и для межкомнатных.
    // При необходимости легко отделим в самостоятельный алгоритм.
    return this.extractMaxiDoorsCanvasPrice($);
  }

  private extractStroykomInteriorPrice($: ReturnType<typeof cheerio.load>): number | null {
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    const m = text.match(/Цена\s*:\s*([\d\s.,]+)\s*(?:руб|₽|RUB|р\.)/i);
    if (!m?.[1]) return null;
    return this.parsePrice(m[1]);
  }

  private extractStroykomEntrancePrice($: ReturnType<typeof cheerio.load>): number | null {
    // Отдельный парсер для категории входных дверей (доработаем точечно следующим шагом).
    return this.extractStroykomInteriorPrice($);
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
   * Безопасный fetch HTML с проверкой SSRF и редиректов.
   */
  private async fetchHtmlSafely(url: string, redirectCount = 0): Promise<string> {
    if (redirectCount > 3) {
      throw new HttpException('Слишком много перенаправлений', HttpStatus.BAD_REQUEST);
    }

    await assertSafeFetchUrl(url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: controller.signal,
        redirect: 'manual',
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new HttpException('Некорректное перенаправление', HttpStatus.BAD_GATEWAY);
        }
        const nextUrl = new URL(location, url).href;
        return this.fetchHtmlSafely(nextUrl, redirectCount + 1);
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpException('Товар не найден', HttpStatus.NOT_FOUND);
        }
        throw new HttpException(
          `Ошибка при получении страницы: ${response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return response.text();
    } finally {
      clearTimeout(timeoutId);
    }
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
