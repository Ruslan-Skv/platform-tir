import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as path from 'path';

export interface FooterLink {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
}

export interface FooterSectionData {
  id: string;
  title: string;
  links: FooterLink[];
  sortOrder: number;
}

export interface FooterData {
  block: {
    workingHours: { weekdays: string; saturday: string; sunday: string };
    phone: string;
    email: string;
    developer: string;
    copyrightCompanyName: string;
    socialLinks: {
      vk: { name: string; href: string; icon: string; ariaLabel: string };
    };
  };
  sections: FooterSectionData[];
}

@Injectable()
export class FooterService {
  constructor(private prisma: PrismaService) {}

  async getData(baseUrl?: string): Promise<FooterData> {
    const [block, sections] = await Promise.all([
      this.prisma.footerBlock.findFirst({ where: { id: 'main' } }),
      this.prisma.footerSection.findMany({
        include: {
          links: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const prefix = baseUrl ? baseUrl.replace(/\/$/, '') : '';

    const vkIconRaw = block?.vkIcon ?? '/images/icons-vk.png';
    const vkIcon = vkIconRaw.startsWith('http')
      ? vkIconRaw
      : vkIconRaw.startsWith('/uploads/')
        ? prefix
          ? `${prefix}${vkIconRaw}`
          : vkIconRaw
        : vkIconRaw;

    return {
      block: block
        ? {
            workingHours: {
              weekdays: block.workingHoursWeekdays,
              saturday: block.workingHoursSaturday,
              sunday: block.workingHoursSunday,
            },
            phone: block.phone,
            email: block.email,
            developer: block.developer,
            copyrightCompanyName: block.copyrightCompanyName,
            socialLinks: {
              vk: {
                name: 'ВКонтакте',
                href: block.vkHref,
                icon: vkIcon,
                ariaLabel: 'ВКонтакте',
              },
            },
          }
        : {
            workingHours: {
              weekdays: 'пн-пт: 11-19',
              saturday: 'сб: 12-16',
              sunday: 'вс: выходной',
            },
            phone: '8 (8152) 60-12-70',
            email: 'skvirya@mail.ru',
            developer: 'ИП Сквиря Р.В.',
            copyrightCompanyName: 'Территория интерьерных решений',
            socialLinks: {
              vk: {
                name: 'ВКонтакте',
                href: 'https://vk.com/pskpobeda',
                icon: '/images/icons-vk.png',
                ariaLabel: 'ВКонтакте',
              },
            },
          },
      sections: sections
        .filter((s, i, arr) => arr.findIndex((x) => x.title === s.title) === i)
        .map((s) => ({
          id: s.id,
          title: s.title,
          sortOrder: s.sortOrder,
          links: s.links.map((l) => ({
            id: l.id,
            name: l.name,
            href: l.href,
            sortOrder: l.sortOrder,
          })),
        })),
    };
  }

  async updateBlock(data: {
    workingHoursWeekdays?: string;
    workingHoursSaturday?: string;
    workingHoursSunday?: string;
    phone?: string;
    email?: string;
    developer?: string;
    copyrightCompanyName?: string;
    vkHref?: string;
    vkIcon?: string;
  }) {
    return this.prisma.footerBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        workingHoursWeekdays: data.workingHoursWeekdays ?? 'пн-пт: 11-19',
        workingHoursSaturday: data.workingHoursSaturday ?? 'сб: 12-16',
        workingHoursSunday: data.workingHoursSunday ?? 'вс: выходной',
        phone: data.phone ?? '8 (8152) 60-12-70',
        email: data.email ?? 'skvirya@mail.ru',
        developer: data.developer ?? 'ИП Сквиря Р.В.',
        copyrightCompanyName: data.copyrightCompanyName ?? 'Территория интерьерных решений',
        vkHref: data.vkHref ?? 'https://vk.com/pskpobeda',
        vkIcon: data.vkIcon ?? '/images/icons-vk.png',
      },
      update: {
        ...(data.workingHoursWeekdays !== undefined && {
          workingHoursWeekdays: data.workingHoursWeekdays,
        }),
        ...(data.workingHoursSaturday !== undefined && {
          workingHoursSaturday: data.workingHoursSaturday,
        }),
        ...(data.workingHoursSunday !== undefined && {
          workingHoursSunday: data.workingHoursSunday,
        }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.developer !== undefined && { developer: data.developer }),
        ...(data.copyrightCompanyName !== undefined && {
          copyrightCompanyName: data.copyrightCompanyName,
        }),
        ...(data.vkHref !== undefined && { vkHref: data.vkHref }),
        ...(data.vkIcon !== undefined && { vkIcon: data.vkIcon }),
      },
    });
  }

  async uploadVkIcon(file: Express.Multer.File, baseUrl: string): Promise<{ vkIcon: string }> {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const filename = path.basename(file.path);
    const iconUrl = `/uploads/footer/${filename}`;
    const prefix = baseUrl.replace(/\/$/, '');
    const fullUrl = `${prefix}${iconUrl}`;

    await this.prisma.footerBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        workingHoursWeekdays: 'пн-пт: 11-19',
        workingHoursSaturday: 'сб: 12-16',
        workingHoursSunday: 'вс: выходной',
        phone: '8 (8152) 60-12-70',
        email: 'skvirya@mail.ru',
        developer: 'ИП Сквиря Р.В.',
        copyrightCompanyName: 'Территория интерьерных решений',
        vkHref: 'https://vk.com/pskpobeda',
        vkIcon: iconUrl,
      },
      update: { vkIcon: iconUrl },
    });

    return { vkIcon: fullUrl };
  }

  async createSection(title: string) {
    const count = await this.prisma.footerSection.count();
    return this.prisma.footerSection.create({
      data: { title, sortOrder: count },
    });
  }

  async updateSection(id: string, data: { title?: string }) {
    const section = await this.prisma.footerSection.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Секция не найдена');
    return this.prisma.footerSection.update({
      where: { id },
      data: { ...(data.title !== undefined && { title: data.title }) },
    });
  }

  async deleteSection(id: string) {
    const section = await this.prisma.footerSection.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Секция не найдена');
    await this.prisma.footerSection.delete({ where: { id } });
    return { success: true };
  }

  async reorderSections(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.footerSection.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.prisma.footerSection.findMany({
      include: { links: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createLink(sectionId: string, data: { name: string; href: string }) {
    const count = await this.prisma.footerSectionLink.count({
      where: { sectionId },
    });
    return this.prisma.footerSectionLink.create({
      data: { ...data, sectionId, sortOrder: count },
    });
  }

  async updateLink(id: string, data: { name?: string; href?: string }) {
    const link = await this.prisma.footerSectionLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Ссылка не найдена');
    return this.prisma.footerSectionLink.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.href !== undefined && { href: data.href }),
      },
    });
  }

  async deleteLink(id: string) {
    const link = await this.prisma.footerSectionLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Ссылка не найдена');
    await this.prisma.footerSectionLink.delete({ where: { id } });
    return { success: true };
  }

  async reorderLinks(sectionId: string, ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.footerSectionLink.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.prisma.footerSectionLink.findMany({
      where: { sectionId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
