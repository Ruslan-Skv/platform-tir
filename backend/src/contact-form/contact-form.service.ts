import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface ContactFormBlockData {
  title: string;
  subtitle: string;
  backgroundImage: string | null;
  backgroundOpacity: number | null;
}

const DEFAULT_TITLE = 'Готовы начать проект?';
const DEFAULT_SUBTITLE = 'Оставьте заявку и получите бесплатную консультацию специалиста';

@Injectable()
export class ContactFormService {
  constructor(private prisma: PrismaService) {}

  async getBlock(): Promise<ContactFormBlockData> {
    const block = await this.prisma.contactFormBlock.findUnique({
      where: { id: 'main' },
    });
    return block
      ? {
          title: block.title,
          subtitle: block.subtitle,
          backgroundImage: block.backgroundImage ?? null,
          backgroundOpacity: block.backgroundOpacity ?? null,
        }
      : {
          title: DEFAULT_TITLE,
          subtitle: DEFAULT_SUBTITLE,
          backgroundImage: null,
          backgroundOpacity: null,
        };
  }

  async updateBlock(data: {
    title?: string;
    subtitle?: string;
    backgroundImage?: string | null;
    backgroundOpacity?: number | null;
  }) {
    return this.prisma.contactFormBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        title: data.title ?? DEFAULT_TITLE,
        subtitle: data.subtitle ?? DEFAULT_SUBTITLE,
        backgroundImage: data.backgroundImage ?? null,
        backgroundOpacity: data.backgroundOpacity ?? null,
      },
      update: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
        ...(data.backgroundImage !== undefined && {
          backgroundImage: data.backgroundImage,
        }),
        ...(data.backgroundOpacity !== undefined && {
          backgroundOpacity: data.backgroundOpacity,
        }),
      },
    });
  }
}
