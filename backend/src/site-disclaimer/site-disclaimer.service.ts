import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateSiteDisclaimerDto } from './dto/update-site-disclaimer.dto';

export interface SiteDisclaimerData {
  content: string;
  isPublished: boolean;
  isConfigured: boolean;
}

const DEFAULT_CONTENT =
  'Информация на сайте предоставлена для ознакомления и не является публичной офертой. Магазин оставляет за собой право вносить конструктивные изменения в продукцию. Для получения точной информации о конструктивных особенностях дверей обращайтесь к продавцам-консультантам. Цветовые оттенки продукции могут незначительно отличаться в зависимости от цветопередачи вашего монитора и могут не полностью соответствовать образцам в салонах';

function mapBlock(block: { content: string; isPublished: boolean }): SiteDisclaimerData {
  const content = block.content.trim();
  return {
    content,
    isPublished: block.isPublished,
    isConfigured: Boolean(content),
  };
}

@Injectable()
export class SiteDisclaimerService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic(): Promise<SiteDisclaimerData | null> {
    const block = await this.prisma.siteDisclaimerBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block || !block.isPublished) {
      return null;
    }
    const mapped = mapBlock(block);
    if (!mapped.isConfigured) {
      return null;
    }
    return mapped;
  }

  async getAdmin(): Promise<SiteDisclaimerData> {
    const block = await this.prisma.siteDisclaimerBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return {
        content: DEFAULT_CONTENT,
        isPublished: true,
        isConfigured: true,
      };
    }
    return mapBlock(block);
  }

  async update(dto: UpdateSiteDisclaimerDto) {
    const block = await this.prisma.siteDisclaimerBlock.upsert({
      where: { id: 'main' },
      update: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      create: {
        id: 'main',
        content: dto.content ?? DEFAULT_CONTENT,
        isPublished: dto.isPublished ?? true,
      },
    });
    return mapBlock(block);
  }
}
