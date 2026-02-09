import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface ContactFormBlockData {
  title: string;
  subtitle: string;
}

@Injectable()
export class ContactFormService {
  constructor(private prisma: PrismaService) {}

  async getBlock(): Promise<ContactFormBlockData> {
    const block = await this.prisma.contactFormBlock.findUnique({
      where: { id: 'main' },
    });
    return block
      ? { title: block.title, subtitle: block.subtitle }
      : {
          title: 'Готовы начать проект?',
          subtitle: 'Оставьте заявку и получите бесплатную консультацию специалиста',
        };
  }

  async updateBlock(data: { title?: string; subtitle?: string }) {
    return this.prisma.contactFormBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        title: data.title ?? 'Готовы начать проект?',
        subtitle: data.subtitle ?? 'Оставьте заявку и получите бесплатную консультацию специалиста',
      },
      update: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
      },
    });
  }
}
