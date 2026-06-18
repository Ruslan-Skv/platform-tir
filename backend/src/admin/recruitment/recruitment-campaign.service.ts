import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecruitmentCampaignStatus, SalesCandidateStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CloseRecruitmentCampaignDto,
  CreateRecruitmentCampaignDto,
} from './dto/create-recruitment-campaign.dto';

const campaignInclude = {
  selectedCandidate: {
    select: {
      id: true,
      lastName: true,
      firstName: true,
      middleName: true,
      overallScore: true,
    },
  },
  _count: { select: { candidates: true } },
} as const;

@Injectable()
export class RecruitmentCampaignService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.recruitmentCampaign.findMany({
      include: campaignInclude,
      orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
    });

    return items.map((c) => this.mapCampaign(c));
  }

  async findOne(id: string) {
    const campaign = await this.prisma.recruitmentCampaign.findUnique({
      where: { id },
      include: campaignInclude,
    });
    if (!campaign) {
      throw new NotFoundException('Отбор не найден');
    }
    return this.mapCampaign(campaign);
  }

  async getActive() {
    const campaign = await this.prisma.recruitmentCampaign.findFirst({
      where: { status: RecruitmentCampaignStatus.OPEN },
      include: campaignInclude,
      orderBy: { startedAt: 'desc' },
    });
    return campaign ? this.mapCampaign(campaign) : null;
  }

  async requireActiveCampaignId(): Promise<string> {
    const active = await this.prisma.recruitmentCampaign.findFirst({
      where: { status: RecruitmentCampaignStatus.OPEN },
      select: { id: true },
      orderBy: { startedAt: 'desc' },
    });
    if (!active) {
      throw new BadRequestException(
        'Нет открытого отбора. Создайте новый отбор перед добавлением кандидатов.',
      );
    }
    return active.id;
  }

  async resolveCampaignId(campaignId?: string): Promise<string> {
    if (campaignId) {
      const exists = await this.prisma.recruitmentCampaign.findUnique({
        where: { id: campaignId },
        select: { id: true },
      });
      if (!exists) {
        throw new NotFoundException('Отбор не найден');
      }
      return campaignId;
    }
    return this.requireActiveCampaignId();
  }

  async create(createdById: string, dto: CreateRecruitmentCampaignDto) {
    const existingOpen = await this.prisma.recruitmentCampaign.findFirst({
      where: { status: RecruitmentCampaignStatus.OPEN },
    });
    if (existingOpen) {
      throw new ConflictException(
        `Сначала закройте текущий отбор «${existingOpen.title}», затем создайте новый.`,
      );
    }

    const campaign = await this.prisma.recruitmentCampaign.create({
      data: {
        title: dto.title.trim(),
        status: RecruitmentCampaignStatus.OPEN,
        createdBy: { connect: { id: createdById } },
      },
      include: campaignInclude,
    });

    return this.mapCampaign(campaign);
  }

  async close(id: string, dto: CloseRecruitmentCampaignDto) {
    const campaign = await this.prisma.recruitmentCampaign.findUnique({
      where: { id },
      include: { _count: { select: { candidates: true } } },
    });
    if (!campaign) {
      throw new NotFoundException('Отбор не найден');
    }
    if (campaign.status === RecruitmentCampaignStatus.CLOSED) {
      throw new BadRequestException('Отбор уже закрыт');
    }

    if (dto.selectedCandidateId) {
      const candidate = await this.prisma.salesCandidate.findFirst({
        where: { id: dto.selectedCandidateId, campaignId: id },
      });
      if (!candidate) {
        throw new BadRequestException('Выбранный кандидат не принадлежит этому отбору');
      }
    }

    const closed = await this.prisma.$transaction(async (tx) => {
      if (dto.selectedCandidateId) {
        await tx.salesCandidate.update({
          where: { id: dto.selectedCandidateId },
          data: { status: SalesCandidateStatus.HIRED },
        });
        await tx.salesCandidate.updateMany({
          where: {
            campaignId: id,
            id: { not: dto.selectedCandidateId },
            status: { notIn: [SalesCandidateStatus.HIRED, SalesCandidateStatus.REJECTED] },
          },
          data: { status: SalesCandidateStatus.REJECTED },
        });
      }

      return tx.recruitmentCampaign.update({
        where: { id },
        data: {
          status: RecruitmentCampaignStatus.CLOSED,
          closedAt: new Date(),
          notes: dto.notes?.trim() || null,
          selectedCandidateId: dto.selectedCandidateId || null,
        },
        include: campaignInclude,
      });
    });

    return this.mapCampaign(closed);
  }

  private mapCampaign(campaign: {
    id: string;
    title: string;
    status: RecruitmentCampaignStatus;
    startedAt: Date;
    closedAt: Date | null;
    notes: string | null;
    selectedCandidateId: string | null;
    selectedCandidate: {
      id: string;
      lastName: string;
      firstName: string;
      middleName: string | null;
      overallScore: number | null;
    } | null;
    _count: { candidates: number };
  }) {
    return {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      startedAt: campaign.startedAt.toISOString(),
      closedAt: campaign.closedAt?.toISOString() ?? null,
      notes: campaign.notes,
      selectedCandidateId: campaign.selectedCandidateId,
      selectedCandidate: campaign.selectedCandidate
        ? {
            id: campaign.selectedCandidate.id,
            fullName: [
              campaign.selectedCandidate.lastName,
              campaign.selectedCandidate.firstName,
              campaign.selectedCandidate.middleName,
            ]
              .filter(Boolean)
              .join(' '),
            overallScore: campaign.selectedCandidate.overallScore,
          }
        : null,
      candidatesCount: campaign._count.candidates,
    };
  }
}
