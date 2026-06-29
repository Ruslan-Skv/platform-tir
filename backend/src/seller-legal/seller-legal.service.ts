import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateSellerLegalDto } from './dto/update-seller-legal.dto';

export type SellerLegalEntityType = 'IP' | 'UL';

export interface SellerLegalPublicData {
  pageTitle: string;
  legalName: string;
  entityType: SellerLegalEntityType;
  inn: string;
  ogrn: string;
  ogrnLabel: string;
  legalAddress: string;
  phone: string;
  email: string;
  isPublished: boolean;
  isConfigured: boolean;
}

const DEFAULT_SELLER_LEGAL: SellerLegalPublicData = {
  pageTitle: 'Информация о продавце',
  legalName: '',
  entityType: 'IP',
  inn: '',
  ogrn: '',
  ogrnLabel: 'ОГРНИП',
  legalAddress: '',
  phone: '8 (8152) 60-12-70',
  email: 'skvirya@mail.ru',
  isPublished: true,
  isConfigured: false,
};

function getOgrnLabel(entityType: string): string {
  return entityType === 'UL' ? 'ОГРН' : 'ОГРНИП';
}

function normalizeEntityType(entityType: string): SellerLegalEntityType {
  return entityType === 'UL' ? 'UL' : 'IP';
}

function mapBlock(block: {
  pageTitle: string;
  legalName: string;
  entityType: string;
  inn: string;
  ogrn: string;
  legalAddress: string;
  phone: string;
  email: string;
  isPublished: boolean;
}): SellerLegalPublicData {
  const entityType = normalizeEntityType(block.entityType);
  const legalName = block.legalName.trim();
  const ogrn = block.ogrn.trim();
  const legalAddress = block.legalAddress.trim();
  const phone = block.phone.trim();
  const email = block.email.trim();

  return {
    pageTitle: block.pageTitle.trim() || DEFAULT_SELLER_LEGAL.pageTitle,
    legalName,
    entityType,
    inn: block.inn.trim(),
    ogrn,
    ogrnLabel: getOgrnLabel(entityType),
    legalAddress,
    phone,
    email,
    isPublished: block.isPublished,
    isConfigured: Boolean(legalName && ogrn && legalAddress && phone && email),
  };
}

@Injectable()
export class SellerLegalService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic(): Promise<SellerLegalPublicData | null> {
    const block = await this.prisma.sellerLegalBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block || !block.isPublished) {
      return null;
    }
    return mapBlock(block);
  }

  async getAdmin() {
    const block = await this.prisma.sellerLegalBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return mapBlock({
        ...DEFAULT_SELLER_LEGAL,
        isPublished: true,
      });
    }
    return mapBlock(block);
  }

  async update(dto: UpdateSellerLegalDto) {
    const block = await this.prisma.sellerLegalBlock.upsert({
      where: { id: 'main' },
      update: {
        ...(dto.pageTitle !== undefined && { pageTitle: dto.pageTitle }),
        ...(dto.legalName !== undefined && { legalName: dto.legalName }),
        ...(dto.entityType !== undefined && { entityType: dto.entityType }),
        ...(dto.inn !== undefined && { inn: dto.inn }),
        ...(dto.ogrn !== undefined && { ogrn: dto.ogrn }),
        ...(dto.legalAddress !== undefined && { legalAddress: dto.legalAddress }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      create: {
        id: 'main',
        pageTitle: dto.pageTitle ?? DEFAULT_SELLER_LEGAL.pageTitle,
        legalName: dto.legalName ?? '',
        entityType: dto.entityType ?? 'IP',
        inn: dto.inn ?? '',
        ogrn: dto.ogrn ?? '',
        legalAddress: dto.legalAddress ?? '',
        phone: dto.phone ?? DEFAULT_SELLER_LEGAL.phone,
        email: dto.email ?? DEFAULT_SELLER_LEGAL.email,
        isPublished: dto.isPublished ?? true,
      },
    });
    return mapBlock(block);
  }

  async requirePublic(): Promise<SellerLegalPublicData> {
    const data = await this.getPublic();
    if (!data) {
      throw new NotFoundException('Информация о продавце не опубликована');
    }
    return data;
  }
}
