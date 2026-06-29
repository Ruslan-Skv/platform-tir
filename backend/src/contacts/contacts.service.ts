import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { PrismaService } from '../database/prisma.service';
import { uploadsBaseUrl } from '../common/utils/uploads-url';
import {
  ContactSalonManagerDto,
  CreateContactSalonDto,
  UpdateContactsPageDto,
} from './dto/contacts.dto';
import { UpdateContactSalonDto } from './dto/update-contact-salon.dto';

export interface ContactsPageData {
  pageTitle: string;
  introText: string | null;
  isPublished: boolean;
}

export interface ContactSalonManagerData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  sortOrder: number;
}

export interface ContactSalonData {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  managers: ContactSalonManagerData[];
}

export interface PublicContactsData {
  page: ContactsPageData | null;
  salons: ContactSalonData[];
}

type SalonWithManagers = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  managers: Array<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    sortOrder: number;
  }>;
};

function mapManager(m: SalonWithManagers['managers'][number]): ContactSalonManagerData {
  return {
    id: m.id,
    name: m.name.trim(),
    phone: m.phone?.trim() || null,
    email: m.email?.trim() || null,
    sortOrder: m.sortOrder,
  };
}

function mapSalon(salon: SalonWithManagers): ContactSalonData {
  return {
    id: salon.id,
    name: salon.name.trim(),
    address: salon.address.trim(),
    phone: salon.phone?.trim() || null,
    imageUrl: salon.imageUrl?.trim() || null,
    sortOrder: salon.sortOrder,
    isPublished: salon.isPublished,
    managers: salon.managers
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map(mapManager),
  };
}

const salonInclude = {
  managers: { orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }] },
};

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic(): Promise<PublicContactsData> {
    const [pageBlock, salons] = await Promise.all([
      this.prisma.contactsPageBlock.findUnique({ where: { id: 'main' } }),
      this.prisma.contactSalon.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: salonInclude,
      }),
    ]);

    const page =
      pageBlock && pageBlock.isPublished
        ? {
            pageTitle: pageBlock.pageTitle.trim() || 'Контакты',
            introText: pageBlock.introText?.trim() || null,
            isPublished: true,
          }
        : null;

    return {
      page,
      salons: salons.map(mapSalon),
    };
  }

  async getAdminPage(): Promise<ContactsPageData> {
    const block = await this.prisma.contactsPageBlock.findUnique({ where: { id: 'main' } });
    if (!block) {
      return {
        pageTitle: 'Контакты',
        introText: null,
        isPublished: true,
      };
    }
    return {
      pageTitle: block.pageTitle.trim() || 'Контакты',
      introText: block.introText?.trim() || null,
      isPublished: block.isPublished,
    };
  }

  async updateAdminPage(dto: UpdateContactsPageDto): Promise<ContactsPageData> {
    const block = await this.prisma.contactsPageBlock.upsert({
      where: { id: 'main' },
      update: {
        ...(dto.pageTitle !== undefined && { pageTitle: dto.pageTitle.trim() }),
        ...(dto.introText !== undefined && { introText: dto.introText?.trim() || null }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      create: {
        id: 'main',
        pageTitle: dto.pageTitle?.trim() || 'Контакты',
        introText: dto.introText?.trim() || null,
        isPublished: dto.isPublished ?? true,
      },
    });
    return {
      pageTitle: block.pageTitle,
      introText: block.introText,
      isPublished: block.isPublished,
    };
  }

  async listAdminSalons(): Promise<ContactSalonData[]> {
    const items = await this.prisma.contactSalon.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: salonInclude,
    });
    return items.map(mapSalon);
  }

  async getAdminSalon(id: string): Promise<ContactSalonData> {
    const item = await this.prisma.contactSalon.findUnique({
      where: { id },
      include: salonInclude,
    });
    if (!item) throw new NotFoundException('Салон не найден');
    return mapSalon(item);
  }

  async createSalon(dto: CreateContactSalonDto): Promise<ContactSalonData> {
    const item = await this.prisma.contactSalon.create({
      data: {
        name: dto.name.trim(),
        address: dto.address.trim(),
        phone: dto.phone?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        isPublished: dto.isPublished ?? true,
        managers: {
          create: this.buildManagersCreate(dto.managers),
        },
      },
      include: salonInclude,
    });
    return mapSalon(item);
  }

  async updateSalon(id: string, dto: UpdateContactSalonDto): Promise<ContactSalonData> {
    await this.getAdminSalon(id);
    const item = await this.prisma.$transaction(async (tx) => {
      if (dto.managers !== undefined) {
        await tx.contactSalonManager.deleteMany({ where: { salonId: id } });
      }
      return tx.contactSalon.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.address !== undefined && { address: dto.address.trim() }),
          ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
          ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl?.trim() || null }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
          ...(dto.managers !== undefined && {
            managers: { create: this.buildManagersCreate(dto.managers) },
          }),
        },
        include: salonInclude,
      });
    });
    return mapSalon(item);
  }

  async removeSalon(id: string): Promise<void> {
    await this.getAdminSalon(id);
    await this.prisma.contactSalon.delete({ where: { id } });
  }

  async uploadImage(file: Express.Multer.File, baseUrl: string): Promise<{ imageUrl: string }> {
    if (!file?.path) {
      throw new ConflictException('Файл не загружен');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'contacts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = extname(file.originalname) || '.jpg';
    const filename = `salon-${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destPath);
    const imageUrl = `/uploads/contacts/${filename}`;
    const prefix = uploadsBaseUrl(baseUrl);
    return { imageUrl: `${prefix}${imageUrl}` };
  }

  private buildManagersCreate(managers?: ContactSalonManagerDto[]) {
    if (!managers?.length) return [];
    return managers
      .filter((m) => m.name.trim())
      .map((m, index) => ({
        name: m.name.trim(),
        phone: m.phone?.trim() || null,
        email: m.email?.trim() || null,
        sortOrder: m.sortOrder ?? index,
      }));
  }
}
