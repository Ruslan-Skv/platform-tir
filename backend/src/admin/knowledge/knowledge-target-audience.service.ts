import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateKnowledgeTargetAudienceDto } from './dto/create-knowledge-target-audience.dto';

@Injectable()
export class KnowledgeTargetAudienceService {
  constructor(private readonly prisma: PrismaService) {}

  async syncTargetAudiences(materialId: string, audienceIds: string[]) {
    const uniqueIds = [...new Set(audienceIds.filter(Boolean))];
    if (uniqueIds.length) {
      const found = await this.prisma.knowledgeTargetAudience.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true },
      });
      if (found.length !== uniqueIds.length) {
        throw new BadRequestException('Указана несуществующая целевая аудитория');
      }
    }
    await this.prisma.knowledgeMaterialTargetAudience.deleteMany({ where: { materialId } });
    if (!uniqueIds.length) return;
    await this.prisma.knowledgeMaterialTargetAudience.createMany({
      data: uniqueIds.map((audienceId) => ({ materialId, audienceId })),
    });
  }

  findAllTargetAudiences() {
    return this.prisma.knowledgeTargetAudience.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: {
        id: true,
        label: true,
        sortOrder: true,
      },
    });
  }

  async createTargetAudience(dto: CreateKnowledgeTargetAudienceDto) {
    const label = dto.label.trim();
    if (!label) {
      throw new BadRequestException('Укажите название целевой аудитории');
    }
    const existing = await this.prisma.knowledgeTargetAudience.findUnique({
      where: { label },
    });
    if (existing) {
      return existing;
    }
    const maxOrder = await this.prisma.knowledgeTargetAudience.aggregate({
      _max: { sortOrder: true },
    });
    return this.prisma.knowledgeTargetAudience.create({
      data: {
        label,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      select: {
        id: true,
        label: true,
        sortOrder: true,
      },
    });
  }
}
