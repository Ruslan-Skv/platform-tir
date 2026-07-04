import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateMissionPageDto } from './dto/update-mission-page.dto';

export interface MissionPageData {
  pageTitle: string;
  introText: string | null;
  footerLinkName: string | null;
  content: string;
  isPublished: boolean;
}

const DEFAULT_INTRO =
  'Создавать надёжные интерьерные решения «под ключ» — от отделки до мебели — на принципах честности, открытости и ответственности, чтобы людям было спокойно и удобно в собственном доме.';

const DEFAULT_CONTENT =
  'Мы создаём комфортные интерьерные решения для дома и бизнеса в Мурманске и области. Наша миссия — помогать клиентам выбирать качественные материалы и услуги, сопровождать их на каждом этапе и делать результат понятным, надёжным и долговечным.';

@Injectable()
export class MissionService {
  constructor(private readonly prisma: PrismaService) {}

  private async getFooterLinkName(): Promise<string | null> {
    const links = await this.prisma.footerSectionLink.findMany({
      where: { href: '/mission' },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const name = links.at(-1)?.name.trim();
    return name || null;
  }

  private async syncFooterLinkName(name: string | null | undefined): Promise<void> {
    if (name === undefined || name === null) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const existing = await this.prisma.footerSectionLink.findMany({
      where: { href: '/mission' },
    });

    if (existing.length > 0) {
      await this.prisma.footerSectionLink.updateMany({
        where: { href: '/mission' },
        data: { name: trimmed },
      });
      return;
    }

    const aboutSection = await this.prisma.footerSection.findFirst({
      where: { title: 'О нас' },
      orderBy: { sortOrder: 'asc' },
    });
    if (!aboutSection) {
      return;
    }

    const sortOrder = await this.prisma.footerSectionLink.count({
      where: { sectionId: aboutSection.id },
    });

    await this.prisma.footerSectionLink.create({
      data: {
        sectionId: aboutSection.id,
        name: trimmed,
        href: '/mission',
        sortOrder,
      },
    });
  }

  async getPublic(): Promise<MissionPageData | null> {
    const block = await this.prisma.missionPageBlock.findUnique({ where: { id: 'main' } });
    if (!block || !block.isPublished) {
      return null;
    }

    const content = block.content.trim();
    if (!content) {
      return null;
    }

    return {
      pageTitle: block.pageTitle.trim() || 'Миссия компании',
      introText: block.introText?.trim() || null,
      footerLinkName: null,
      content,
      isPublished: true,
    };
  }

  async getAdmin(): Promise<MissionPageData> {
    const [block, footerLinkName] = await Promise.all([
      this.prisma.missionPageBlock.findUnique({ where: { id: 'main' } }),
      this.getFooterLinkName(),
    ]);

    if (!block) {
      return {
        pageTitle: 'Миссия компании',
        introText: DEFAULT_INTRO,
        footerLinkName,
        content: DEFAULT_CONTENT,
        isPublished: true,
      };
    }

    return {
      pageTitle: block.pageTitle.trim() || 'Миссия компании',
      introText: block.introText?.trim() || null,
      footerLinkName,
      content: block.content.trim() || DEFAULT_CONTENT,
      isPublished: block.isPublished,
    };
  }

  async updateAdmin(dto: UpdateMissionPageDto): Promise<MissionPageData> {
    await this.syncFooterLinkName(dto.footerLinkName);

    const block = await this.prisma.missionPageBlock.upsert({
      where: { id: 'main' },
      update: {
        ...(dto.pageTitle !== undefined && { pageTitle: dto.pageTitle.trim() }),
        ...(dto.introText !== undefined && { introText: dto.introText?.trim() || null }),
        ...(dto.content !== undefined && { content: dto.content.trim() }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      create: {
        id: 'main',
        pageTitle: dto.pageTitle?.trim() || 'Миссия компании',
        introText: dto.introText?.trim() || DEFAULT_INTRO,
        content: dto.content?.trim() || DEFAULT_CONTENT,
        isPublished: dto.isPublished ?? true,
      },
    });

    const footerLinkName = await this.getFooterLinkName();

    return {
      pageTitle: block.pageTitle.trim() || 'Миссия компании',
      introText: block.introText?.trim() || null,
      footerLinkName,
      content: block.content.trim() || DEFAULT_CONTENT,
      isPublished: block.isPublished,
    };
  }
}
