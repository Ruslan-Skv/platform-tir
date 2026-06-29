import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCareerVacancyDto, UpdateCareersPageDto } from './dto/careers.dto';
import { UpdateCareerVacancyDto } from './dto/update-career-vacancy.dto';

export interface CareersPageData {
  pageTitle: string;
  introText: string | null;
  isPublished: boolean;
}

export interface CareerVacancyData {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  conditions: string | null;
  contactEmail: string | null;
  sortOrder: number;
  isPublished: boolean;
}

export interface PublicCareersData {
  page: CareersPageData | null;
  vacancies: CareerVacancyData[];
}

function mapVacancy(v: {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  conditions: string | null;
  contactEmail: string | null;
  sortOrder: number;
  isPublished: boolean;
}): CareerVacancyData {
  return {
    id: v.id,
    title: v.title.trim(),
    description: v.description.trim(),
    requirements: v.requirements?.trim() || null,
    conditions: v.conditions?.trim() || null,
    contactEmail: v.contactEmail?.trim() || null,
    sortOrder: v.sortOrder,
    isPublished: v.isPublished,
  };
}

@Injectable()
export class CareersService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic(): Promise<PublicCareersData> {
    const [pageBlock, vacancies] = await Promise.all([
      this.prisma.careersPageBlock.findUnique({ where: { id: 'main' } }),
      this.prisma.careerVacancy.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    const page =
      pageBlock && pageBlock.isPublished
        ? {
            pageTitle: pageBlock.pageTitle.trim() || 'Вакансии',
            introText: pageBlock.introText?.trim() || null,
            isPublished: true,
          }
        : null;

    return {
      page,
      vacancies: vacancies.map(mapVacancy),
    };
  }

  async getAdminPage(): Promise<CareersPageData> {
    const block = await this.prisma.careersPageBlock.findUnique({ where: { id: 'main' } });
    if (!block) {
      return {
        pageTitle: 'Вакансии',
        introText: null,
        isPublished: true,
      };
    }
    return {
      pageTitle: block.pageTitle.trim() || 'Вакансии',
      introText: block.introText?.trim() || null,
      isPublished: block.isPublished,
    };
  }

  async updateAdminPage(dto: UpdateCareersPageDto): Promise<CareersPageData> {
    const block = await this.prisma.careersPageBlock.upsert({
      where: { id: 'main' },
      update: {
        ...(dto.pageTitle !== undefined && { pageTitle: dto.pageTitle.trim() }),
        ...(dto.introText !== undefined && { introText: dto.introText?.trim() || null }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      create: {
        id: 'main',
        pageTitle: dto.pageTitle?.trim() || 'Вакансии',
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

  async listAdminVacancies(): Promise<CareerVacancyData[]> {
    const items = await this.prisma.careerVacancy.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return items.map(mapVacancy);
  }

  async getAdminVacancy(id: string): Promise<CareerVacancyData> {
    const item = await this.prisma.careerVacancy.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Вакансия не найдена');
    return mapVacancy(item);
  }

  async createVacancy(dto: CreateCareerVacancyDto): Promise<CareerVacancyData> {
    const item = await this.prisma.careerVacancy.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        requirements: dto.requirements?.trim() || null,
        conditions: dto.conditions?.trim() || null,
        contactEmail: dto.contactEmail?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        isPublished: dto.isPublished ?? true,
      },
    });
    return mapVacancy(item);
  }

  async updateVacancy(id: string, dto: UpdateCareerVacancyDto): Promise<CareerVacancyData> {
    await this.getAdminVacancy(id);
    const item = await this.prisma.careerVacancy.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.requirements !== undefined && {
          requirements: dto.requirements?.trim() || null,
        }),
        ...(dto.conditions !== undefined && { conditions: dto.conditions?.trim() || null }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail?.trim() || null,
        }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
    });
    return mapVacancy(item);
  }

  async removeVacancy(id: string): Promise<void> {
    await this.getAdminVacancy(id);
    await this.prisma.careerVacancy.delete({ where: { id } });
  }
}
