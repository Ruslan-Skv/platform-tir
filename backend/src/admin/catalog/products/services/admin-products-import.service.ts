import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../../../database/prisma.service';

type ParsedBitrixProduct = {
  name: string;
  slug: string;
  sku: string;
  price: number;
  description: string;
  images: string[];
  attributes: Record<string, unknown>;
  isFeatured: boolean;
};

function stripHtmlTags(s: string): string {
  let result = '';
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt === -1) {
      result += s.slice(i);
      break;
    }
    result += s.slice(i, lt) + ' ';
    const gt = s.indexOf('>', lt + 1);
    i = gt === -1 ? s.length : gt + 1;
  }
  return result;
}

function extractTableCellContents(row: string): string[] {
  const cells: string[] = [];
  let pos = 0;
  const lowerRow = row.toLowerCase();
  while (pos < row.length) {
    const tdOpen = lowerRow.indexOf('<td', pos);
    if (tdOpen === -1) break;
    const gt = row.indexOf('>', tdOpen + 3);
    if (gt === -1) break;
    const tdClose = lowerRow.indexOf('</td>', gt + 1);
    if (tdClose === -1) break;
    const content = row.slice(gt + 1, tdClose);
    cells.push(
      stripHtmlTags(content)
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim(),
    );
    pos = tdClose + 5;
  }
  return cells;
}

function parseHtmlTable(html: string, skuPrefix: string): ParsedBitrixProduct[] {
  const products: ParsedBitrixProduct[] = [];
  const rows = html.split('</tr>');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.includes('<td>') && !row.includes('<td ')) continue;

    const cells = extractTableCellContents(row);

    if (cells.length < 10) continue;
    if (cells[0] === 'Название' || cells[0] === 'ID' || cells[0] === '') continue;

    const name = cells[0];
    const isActive = cells[1] === 'Да' || cells[1] === 'да' || cells[1] === 'Y' || cells[1] === '1';

    if (!name || !isActive) continue;

    let price = 0;
    let priceIdx = -1;
    for (let j = 2; j < cells.length; j++) {
      const num = parseInt(cells[j].replace(/[^\d]/g, ''), 10);
      if (num >= 1000) {
        price = num;
        priceIdx = j;
        break;
      }
    }

    if (price === 0) continue;

    const slug = name
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);

    const externalId = cells[4] || String(i);
    const sku = `${skuPrefix}-${externalId.replace(/[^\d]/g, '') || i}`;

    const images: string[] = [];
    for (const cell of cells) {
      if (
        cell.includes('http') &&
        (cell.includes('.jpg') ||
          cell.includes('.png') ||
          cell.includes('.jpeg') ||
          cell.includes('.webp'))
      ) {
        const urls = cell.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp|gif)/gi);
        if (urls) {
          images.push(...urls);
        }
      }
    }

    let description = '';
    for (const cell of cells) {
      if (cell.length > 100 && !cell.includes('http')) {
        description = cell;
        break;
      }
    }

    const attributes: Record<string, string> = {};
    const attributeNames = ['sizes', 'manufacturer', 'color', 'coating', 'thickness', 'material'];
    let attrIdx = 0;
    for (let j = priceIdx + 1; j < cells.length && attrIdx < attributeNames.length; j++) {
      if (cells[j] && cells[j].length > 0 && cells[j].length < 200 && !cells[j].includes('http')) {
        attributes[attributeNames[attrIdx]] = cells[j];
        attrIdx++;
      }
    }

    const isFeatured = cells.some((c) => c === 'Да' && cells.indexOf(c) > priceIdx);

    products.push({
      name,
      slug,
      sku,
      price,
      description,
      images: [...new Set(images)].slice(0, 10),
      attributes,
      isFeatured,
    });
  }

  return products;
}

@Injectable()
export class AdminProductsImportService {
  constructor(private prisma: PrismaService) {}

  async importFromFile(
    fileBuffer: Buffer,
    _filename: string,
    categoryId: string,
    skuPrefix?: string,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException('Категория не найдена');
    }

    const html = fileBuffer.toString('utf-8');
    const products = parseHtmlTable(html, skuPrefix || 'IMPORT');

    if (products.length === 0) {
      throw new BadRequestException('Не удалось найти товары в файле. Проверьте формат файла.');
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as { name: string; error: string }[],
      totalFound: products.length,
    };

    for (const product of products) {
      try {
        const existing = await this.prisma.product.findFirst({
          where: {
            OR: [{ sku: product.sku }, { slug: product.slug }],
          },
        });

        if (existing) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: {
              name: product.name,
              description: product.description,
              price: new Prisma.Decimal(product.price),
              images: product.images,
              attributes: product.attributes as Prisma.InputJsonValue,
              isActive: true,
              isFeatured: product.isFeatured,
            },
          });
          results.updated++;
        } else {
          await this.prisma.product.create({
            data: {
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              description: product.description,
              price: new Prisma.Decimal(product.price),
              stock: 10,
              categoryId,
              images: product.images,
              attributes: product.attributes as Prisma.InputJsonValue,
              isActive: true,
              isFeatured: product.isFeatured,
            },
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          name: product.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  async previewImportFile(filePath: string) {
    const importDir = path.join(process.cwd(), 'import-bitriks');
    const files: string[] = [];

    try {
      const dirContents = fs.readdirSync(importDir);
      for (const file of dirContents) {
        if (
          file.endsWith('.xls') ||
          file.endsWith('.xlsx') ||
          file.endsWith('.html') ||
          file.endsWith('.htm')
        ) {
          files.push(file);
        }
      }
    } catch {
      // Directory doesn't exist
    }

    if (filePath) {
      if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\')) {
        throw new BadRequestException('Invalid file path');
      }
      const importDirResolved = path.resolve(importDir);
      const fullPathResolved = path.resolve(importDir, filePath);
      if (
        !fullPathResolved.startsWith(importDirResolved + path.sep) &&
        fullPathResolved !== importDirResolved
      ) {
        throw new BadRequestException('Invalid file path');
      }
      if (fs.existsSync(fullPathResolved)) {
        const content = fs.readFileSync(fullPathResolved, 'utf-8');
        const products = parseHtmlTable(content, 'PREVIEW');
        return {
          files,
          preview: {
            file: path.basename(filePath),
            totalProducts: products.length,
            samples: products.slice(0, 5).map((p) => ({
              name: p.name,
              price: p.price,
              sku: p.sku,
              imagesCount: p.images.length,
            })),
          },
        };
      }
    }

    return { files, preview: null };
  }
}
