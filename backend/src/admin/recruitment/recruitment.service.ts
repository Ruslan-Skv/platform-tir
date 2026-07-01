import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, SalesCandidateStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateSalesCandidateDto } from './dto/create-sales-candidate.dto';
import { UpdateSalesCandidateDto } from './dto/update-sales-candidate.dto';
import {
  RecruitmentKnowledgeSyncService,
  calculateCandidateScore,
} from './recruitment-knowledge-sync.service';
import { RecruitmentResumeParserService } from './recruitment-resume-parser.service';
import { RecruitmentCampaignService } from './recruitment-campaign.service';

const candidateInclude = {
  campaign: {
    select: { id: true, title: true, status: true },
  },
  traineeUser: {
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
} satisfies Prisma.SalesCandidateInclude;

@Injectable()
export class RecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledgeSync: RecruitmentKnowledgeSyncService,
    private readonly resumeParser: RecruitmentResumeParserService,
    private readonly campaignService: RecruitmentCampaignService,
  ) {}

  async create(createdById: string, dto: CreateSalesCandidateDto) {
    if (dto.traineeUserId) {
      await this.assertTraineeUserAvailable(dto.traineeUserId);
    }

    const campaignId = await this.campaignService.requireActiveCampaignId();

    const candidate = await this.prisma.salesCandidate.create({
      data: this.mapDtoToCreateData(dto, createdById, campaignId),
      include: candidateInclude,
    });

    return this.enrichCandidate(candidate);
  }

  async findAll(params: {
    search?: string;
    status?: SalesCandidateStatus;
    campaignId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SalesCandidateWhereInput = {};

    if (params.campaignId) {
      where.campaignId = params.campaignId;
    } else {
      const active = await this.campaignService.getActive();
      if (!active) {
        return { items: [], total: 0, page, limit, totalPages: 0 };
      }
      where.campaignId = active.id;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { lastName: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { middleName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.salesCandidate.findMany({
        where,
        include: candidateInclude,
        orderBy: [{ overallScore: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.salesCandidate.count({ where }),
    ]);

    const enriched = await Promise.all(items.map((c) => this.enrichCandidate(c)));

    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const candidate = await this.prisma.salesCandidate.findUnique({
      where: { id },
      include: candidateInclude,
    });
    if (!candidate) {
      throw new NotFoundException('Кандидат не найден');
    }
    return this.enrichCandidate(candidate);
  }

  async update(id: string, dto: UpdateSalesCandidateDto) {
    await this.findOne(id);

    if (dto.traineeUserId) {
      await this.assertTraineeUserAvailable(dto.traineeUserId, id);
    }

    const candidate = await this.prisma.salesCandidate.update({
      where: { id },
      data: this.mapDtoToUpdateData(dto),
      include: candidateInclude,
    });

    return this.enrichCandidate(candidate);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.salesCandidate.delete({ where: { id } });
    return { success: true };
  }

  async parseResumeForCandidate(id: string, filePath: string, mimeType?: string | null) {
    const candidate = await this.prisma.salesCandidate.findUnique({ where: { id } });
    if (!candidate) {
      throw new NotFoundException('Кандидат не найден');
    }

    const text = await this.resumeParser.extractText(filePath, mimeType);
    const parsedData = this.resumeParser.parseResumeText(text);

    const updated = await this.prisma.salesCandidate.update({
      where: { id },
      data: {
        resumeParsedText: text,
        resumeParsedData: parsedData as unknown as Prisma.InputJsonValue,
      },
      include: candidateInclude,
    });

    return this.enrichCandidate(updated);
  }

  async getTrainingProgress(id: string) {
    const candidate = await this.prisma.salesCandidate.findUnique({
      where: { id },
      select: { traineeUserId: true },
    });
    if (!candidate) {
      throw new NotFoundException('Кандидат не найден');
    }
    if (!candidate.traineeUserId) {
      return null;
    }
    return this.knowledgeSync.getTrainingProgress(candidate.traineeUserId);
  }

  async linkTraineeByEmail(id: string, email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new NotFoundException(`Пользователь с email «${email.trim()}» не найден или неактивен`);
    }
    return this.linkTraineeUser(id, user.id);
  }

  async linkTraineeUser(id: string, userId: string) {
    await this.assertTraineeUserAvailable(userId, id);
    const candidate = await this.prisma.salesCandidate.update({
      where: { id },
      data: { traineeUserId: userId, status: SalesCandidateStatus.TRAINING },
      include: candidateInclude,
    });
    return this.enrichCandidate(candidate);
  }

  async unlinkTraineeUser(id: string) {
    const candidate = await this.prisma.salesCandidate.update({
      where: { id },
      data: { traineeUserId: null },
      include: candidateInclude,
    });
    return this.enrichCandidate(candidate);
  }

  private async enrichCandidate(
    candidate: Prisma.SalesCandidateGetPayload<{ include: typeof candidateInclude }>,
  ) {
    const trainingProgress = candidate.traineeUserId
      ? await this.knowledgeSync.getTrainingProgress(candidate.traineeUserId)
      : null;

    const scoreBreakdown = calculateCandidateScore(candidate, trainingProgress);

    if (scoreBreakdown.overallScore !== candidate.overallScore) {
      await this.prisma.salesCandidate.update({
        where: { id: candidate.id },
        data: { overallScore: scoreBreakdown.overallScore },
      });
    }

    return {
      ...candidate,
      trainingProgress,
      scoreBreakdown,
    };
  }

  private async assertTraineeUserAvailable(userId: string, excludeCandidateId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new NotFoundException('Пользователь не найден или неактивен');
    }

    const existing = await this.prisma.salesCandidate.findFirst({
      where: {
        traineeUserId: userId,
        ...(excludeCandidateId ? { id: { not: excludeCandidateId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException('Этот пользователь уже привязан к другому кандидату');
    }
  }

  private mapDtoToCreateData(
    dto: CreateSalesCandidateDto,
    createdById: string,
    campaignId: string,
  ): Prisma.SalesCandidateCreateInput {
    return {
      lastName: dto.lastName.trim(),
      firstName: dto.firstName.trim(),
      middleName: dto.middleName?.trim() || null,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      phone: dto.phone.trim(),
      email: dto.email?.trim() || null,
      city: dto.city?.trim() || null,
      address: dto.address?.trim() || null,
      educationLevel: dto.educationLevel?.trim() || null,
      educationInstitution: dto.educationInstitution?.trim() || null,
      educationSpecialty: dto.educationSpecialty?.trim() || null,
      educationYear: dto.educationYear ?? null,
      additionalEducation: dto.additionalEducation?.trim() || null,
      totalExperienceYears: dto.totalExperienceYears ?? null,
      salesExperienceYears: dto.salesExperienceYears ?? null,
      workHistory: dto.workHistory
        ? (dto.workHistory as unknown as Prisma.InputJsonValue)
        : undefined,
      industryExperience: dto.industryExperience ?? [],
      salesAchievements: dto.salesAchievements?.trim() || null,
      communicationSkill: dto.communicationSkill ?? null,
      stressResistance: dto.stressResistance ?? null,
      motivation: dto.motivation ?? null,
      teamworkSkill: dto.teamworkSkill ?? null,
      selfOrganization: dto.selfOrganization ?? null,
      pcSkill: dto.pcSkill ?? null,
      presentationSkill: dto.presentationSkill ?? null,
      motivationReason: dto.motivationReason?.trim() || null,
      salaryExpectation: dto.salaryExpectation?.trim() || null,
      availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null,
      hasDriversLicense: dto.hasDriversLicense ?? null,
      hasPersonalCar: dto.hasPersonalCar ?? null,
      readyForTravel: dto.readyForTravel ?? null,
      plannedTenure: dto.plannedTenure?.trim() || null,
      readyToStudyWorkInfo: dto.readyToStudyWorkInfo ?? null,
      readyForContinuousLearning: dto.readyForContinuousLearning ?? null,
      productKnowledge: dto.productKnowledge?.trim() || null,
      interviewDate: dto.interviewDate ? new Date(dto.interviewDate) : null,
      interviewScore: dto.interviewScore ?? null,
      interviewNotes: dto.interviewNotes?.trim() || null,
      adminNotes: dto.adminNotes?.trim() || null,
      resumeFileUrl: dto.resumeFileUrl?.trim() || null,
      resumeFileName: dto.resumeFileName?.trim() || null,
      traineeUser: dto.traineeUserId ? { connect: { id: dto.traineeUserId } } : undefined,
      status: dto.status ?? SalesCandidateStatus.NEW,
      campaign: { connect: { id: campaignId } },
      createdBy: { connect: { id: createdById } },
    };
  }

  private mapDtoToUpdateData(dto: UpdateSalesCandidateDto): Prisma.SalesCandidateUpdateInput {
    const data: Prisma.SalesCandidateUpdateInput = {};

    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.middleName !== undefined) data.middleName = dto.middleName?.trim() || null;
    if (dto.birthDate !== undefined)
      data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.city !== undefined) data.city = dto.city?.trim() || null;
    if (dto.address !== undefined) data.address = dto.address?.trim() || null;
    if (dto.educationLevel !== undefined) data.educationLevel = dto.educationLevel?.trim() || null;
    if (dto.educationInstitution !== undefined)
      data.educationInstitution = dto.educationInstitution?.trim() || null;
    if (dto.educationSpecialty !== undefined)
      data.educationSpecialty = dto.educationSpecialty?.trim() || null;
    if (dto.educationYear !== undefined) data.educationYear = dto.educationYear ?? null;
    if (dto.additionalEducation !== undefined)
      data.additionalEducation = dto.additionalEducation?.trim() || null;
    if (dto.totalExperienceYears !== undefined)
      data.totalExperienceYears = dto.totalExperienceYears ?? null;
    if (dto.salesExperienceYears !== undefined)
      data.salesExperienceYears = dto.salesExperienceYears ?? null;
    if (dto.workHistory !== undefined) {
      data.workHistory = dto.workHistory
        ? (dto.workHistory as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }
    if (dto.industryExperience !== undefined) data.industryExperience = dto.industryExperience;
    if (dto.salesAchievements !== undefined)
      data.salesAchievements = dto.salesAchievements?.trim() || null;
    if (dto.communicationSkill !== undefined) data.communicationSkill = dto.communicationSkill;
    if (dto.stressResistance !== undefined) data.stressResistance = dto.stressResistance;
    if (dto.motivation !== undefined) data.motivation = dto.motivation;
    if (dto.teamworkSkill !== undefined) data.teamworkSkill = dto.teamworkSkill;
    if (dto.selfOrganization !== undefined) data.selfOrganization = dto.selfOrganization;
    if (dto.pcSkill !== undefined) data.pcSkill = dto.pcSkill;
    if (dto.presentationSkill !== undefined) data.presentationSkill = dto.presentationSkill;
    if (dto.motivationReason !== undefined)
      data.motivationReason = dto.motivationReason?.trim() || null;
    if (dto.salaryExpectation !== undefined)
      data.salaryExpectation = dto.salaryExpectation?.trim() || null;
    if (dto.availableFrom !== undefined)
      data.availableFrom = dto.availableFrom ? new Date(dto.availableFrom) : null;
    if (dto.hasDriversLicense !== undefined) data.hasDriversLicense = dto.hasDriversLicense;
    if (dto.hasPersonalCar !== undefined) data.hasPersonalCar = dto.hasPersonalCar;
    if (dto.readyForTravel !== undefined) data.readyForTravel = dto.readyForTravel;
    if (dto.plannedTenure !== undefined) data.plannedTenure = dto.plannedTenure?.trim() || null;
    if (dto.readyToStudyWorkInfo !== undefined)
      data.readyToStudyWorkInfo = dto.readyToStudyWorkInfo;
    if (dto.readyForContinuousLearning !== undefined)
      data.readyForContinuousLearning = dto.readyForContinuousLearning;
    if (dto.productKnowledge !== undefined)
      data.productKnowledge = dto.productKnowledge?.trim() || null;
    if (dto.interviewDate !== undefined)
      data.interviewDate = dto.interviewDate ? new Date(dto.interviewDate) : null;
    if (dto.interviewScore !== undefined) data.interviewScore = dto.interviewScore;
    if (dto.interviewNotes !== undefined) data.interviewNotes = dto.interviewNotes?.trim() || null;
    if (dto.adminNotes !== undefined) data.adminNotes = dto.adminNotes?.trim() || null;
    if (dto.resumeFileUrl !== undefined) data.resumeFileUrl = dto.resumeFileUrl?.trim() || null;
    if (dto.resumeFileName !== undefined) data.resumeFileName = dto.resumeFileName?.trim() || null;
    if (dto.traineeUserId !== undefined) {
      data.traineeUser = dto.traineeUserId
        ? { connect: { id: dto.traineeUserId } }
        : { disconnect: true };
    }
    if (dto.status !== undefined) data.status = dto.status;

    return data;
  }
}
