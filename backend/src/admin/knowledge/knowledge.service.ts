import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { KnowledgeMaterialType, PageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { KnowledgeQuizService } from './knowledge-quiz.service';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';
import { CreateKnowledgeCategoryDto } from './dto/create-knowledge-category.dto';
import { CreateKnowledgeModuleDto } from './dto/create-knowledge-module.dto';
import { CreateKnowledgeMaterialDto } from './dto/create-knowledge-material.dto';
import { CreateKnowledgeTargetAudienceDto } from './dto/create-knowledge-target-audience.dto';
import { UpdateKnowledgeMaterialDto } from './dto/update-knowledge-material.dto';
import { KnowledgeAttachmentDto } from './dto/knowledge-attachment.dto';
import { UpdateVideoProgressDto } from './dto/update-video-progress.dto';

function buildMaterialInclude(userId?: string) {
  return {
    author: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    },
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
      },
    },
    module: {
      select: {
        id: true,
        name: true,
        slug: true,
        order: true,
      },
    },
    attachments: {
      orderBy: { sortOrder: 'asc' as const },
    },
    targetAudiences: {
      include: {
        audience: {
          select: {
            id: true,
            label: true,
            sortOrder: true,
          },
        },
      },
      orderBy: { audience: { sortOrder: 'asc' } },
    },
    ...(userId
      ? {
          videoProgress: {
            where: { userId },
            take: 1,
          },
        }
      : {}),
  } satisfies Prisma.KnowledgeMaterialInclude;
}

type MaterialWithRelations = Prisma.KnowledgeMaterialGetPayload<{
  include: ReturnType<typeof buildMaterialInclude>;
}>;

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    private knowledgeQuizService: KnowledgeQuizService,
  ) {}

  private mapMaterialResponse(material: MaterialWithRelations, editorView = false) {
    const {
      videoProgress,
      tutorRecommendation,
      targetAudiences: targetAudienceLinks,
      ...rest
    } = material as MaterialWithRelations & {
      videoProgress?: Array<{
        id: string;
        progressPercent: number;
        positionSeconds: number;
        completed: boolean;
        updatedAt: Date;
      }>;
      tutorRecommendation?: string | null;
      targetAudiences?: Array<{
        audience: { id: string; label: string; sortOrder: number };
      }>;
    };
    const targetAudiences =
      targetAudienceLinks
        ?.map((link) => link.audience)
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.label.localeCompare(b.label, 'ru');
        }) ?? [];
    return {
      ...rest,
      targetAudiences,
      ...(editorView ? { tutorRecommendation: tutorRecommendation ?? null } : {}),
      myVideoProgress: videoProgress?.[0] ?? null,
    };
  }

  private async syncTargetAudiences(materialId: string, audienceIds: string[]) {
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

  async findAllTargetAudiences() {
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

  private mapAttachmentsForCreate(attachments: KnowledgeAttachmentDto[] | undefined) {
    if (!attachments?.length) return undefined;
    return {
      create: attachments.map((a, i) => ({
        fileName: a.fileName.trim(),
        fileUrl: a.fileUrl.trim(),
        fileSize: a.fileSize ?? null,
        mimeType: a.mimeType?.trim() || null,
        sortOrder: a.sortOrder ?? i,
      })),
    };
  }

  private async syncAttachments(materialId: string, attachments: KnowledgeAttachmentDto[]) {
    await this.prisma.knowledgeMaterialAttachment.deleteMany({ where: { materialId } });
    if (!attachments.length) return;
    await this.prisma.knowledgeMaterialAttachment.createMany({
      data: attachments.map((a, i) => ({
        materialId,
        fileName: a.fileName.trim(),
        fileUrl: a.fileUrl.trim(),
        fileSize: a.fileSize ?? null,
        mimeType: a.mimeType?.trim() || null,
        sortOrder: a.sortOrder ?? i,
      })),
    });
  }

  private assertMaterialPayload(
    type: KnowledgeMaterialType,
    data: {
      content?: string | null;
      videoUrl?: string | null;
      externalUrl?: string | null;
    },
    status: PageStatus = PageStatus.DRAFT,
  ) {
    const content = data.content?.trim() || '';
    const videoUrl = data.videoUrl?.trim() || '';
    const externalUrl = data.externalUrl?.trim() || '';

    if (type === KnowledgeMaterialType.VIDEO && !videoUrl) {
      throw new BadRequestException('Для видеоматериала укажите ссылку на видео');
    }
    if (type === KnowledgeMaterialType.LINK && !externalUrl) {
      throw new BadRequestException('Для ссылки укажите внешний URL');
    }
    if (type === KnowledgeMaterialType.ARTICLE && !content && status !== PageStatus.DRAFT) {
      throw new BadRequestException('Для статьи добавьте текстовое содержание');
    }
  }

  private async assertModuleBelongsToCategory(moduleId: string, categoryId: string) {
    const mod = await this.prisma.knowledgeModule.findUnique({
      where: { id: moduleId },
    });
    if (!mod) {
      throw new NotFoundException('Модуль не найден');
    }
    if (mod.categoryId !== categoryId) {
      throw new BadRequestException('Модуль не принадлежит выбранной категории');
    }
  }

  async createMaterial(authorId: string, dto: CreateKnowledgeMaterialDto) {
    const existing = await this.prisma.knowledgeMaterial.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Материал со slug "${dto.slug}" уже существует`);
    }

    const category = await this.prisma.knowledgeCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    if (dto.moduleId) {
      await this.assertModuleBelongsToCategory(dto.moduleId, dto.categoryId);
    }

    const status = dto.status ?? PageStatus.DRAFT;
    this.assertMaterialPayload(dto.type, dto, status);

    const material = await this.prisma.knowledgeMaterial.create({
      data: {
        categoryId: dto.categoryId,
        moduleId: dto.moduleId || null,
        type: dto.type,
        title: dto.title.trim(),
        slug: dto.slug.trim(),
        excerpt: dto.excerpt?.trim() || null,
        content: dto.content?.trim() || null,
        readingTimeMinutes: dto.readingTimeMinutes ?? null,
        tutorRecommendation: dto.tutorRecommendation?.trim() || null,
        videoUrl: dto.videoUrl?.trim() || null,
        externalUrl: dto.externalUrl?.trim() || null,
        thumbnailUrl: dto.thumbnailUrl?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        isPinned: dto.isPinned ?? false,
        status,
        publishedAt: status === PageStatus.PUBLISHED ? new Date() : null,
        authorId,
        attachments: this.mapAttachmentsForCreate(dto.attachments),
      },
      include: buildMaterialInclude(authorId),
    });
    if (dto.targetAudienceIds?.length) {
      await this.syncTargetAudiences(material.id, dto.targetAudienceIds);
      return this.findOneMaterial(material.id, true, authorId);
    }
    return this.mapMaterialResponse(material, true);
  }

  async findAllMaterials(params: {
    status?: string;
    categoryId?: string;
    moduleId?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
    editorView?: boolean;
    userId?: string;
  }) {
    const {
      status,
      categoryId,
      moduleId,
      type,
      search,
      page = 1,
      limit = 24,
      editorView = false,
      userId,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.KnowledgeMaterialWhereInput = {};

    if (editorView && status) {
      where.status = status as PageStatus;
    } else if (!editorView) {
      where.status = PageStatus.PUBLISHED;
    } else if (status) {
      where.status = status as PageStatus;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (moduleId) {
      where.moduleId = moduleId === 'none' ? null : moduleId;
    }

    if (type) {
      where.type = type as KnowledgeMaterialType;
    }

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.knowledgeMaterial.findMany({
        where,
        include: buildMaterialInclude(userId),
        orderBy: [
          { isPinned: 'desc' },
          { module: { order: 'asc' } },
          { sortOrder: 'asc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.knowledgeMaterial.count({ where }),
    ]);

    const mapped = data.map((m) => this.mapMaterialResponse(m, editorView));
    let enriched = mapped;

    if (userId && mapped.length > 0) {
      const statusMap = await this.knowledgeQuizService.getUserQuizStatusForMaterials(
        mapped.map((m) => m.id),
        userId,
      );
      enriched = mapped.map((m) => ({
        ...m,
        myQuizStatus: statusMap[m.id] ?? { hasQuiz: false, passed: false, scorePercent: null },
      }));
    }

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOneMaterial(id: string, editorView = false, userId?: string) {
    const material = await this.prisma.knowledgeMaterial.findUnique({
      where: { id },
      include: buildMaterialInclude(userId),
    });
    if (!material) {
      throw new NotFoundException('Материал не найден');
    }
    if (!editorView && material.status !== PageStatus.PUBLISHED) {
      throw new NotFoundException('Материал не найден');
    }
    return this.mapMaterialResponse(material, editorView);
  }

  async updateMaterial(id: string, dto: UpdateKnowledgeMaterialDto) {
    const existing = await this.findOneMaterial(id, true);

    if (dto.slug && dto.slug !== existing.slug) {
      const slugTaken = await this.prisma.knowledgeMaterial.findUnique({
        where: { slug: dto.slug },
      });
      if (slugTaken) {
        throw new ConflictException(`Материал со slug "${dto.slug}" уже существует`);
      }
    }

    if (dto.categoryId) {
      const category = await this.prisma.knowledgeCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Категория не найдена');
      }
    }

    const nextCategoryId = dto.categoryId ?? existing.categoryId;
    if (dto.moduleId !== undefined) {
      if (dto.moduleId) {
        await this.assertModuleBelongsToCategory(dto.moduleId, nextCategoryId);
      }
    } else if (dto.categoryId && existing.moduleId) {
      await this.assertModuleBelongsToCategory(existing.moduleId, dto.categoryId);
    }

    const nextType = dto.type ?? existing.type;
    const nextStatus = dto.status ?? existing.status;
    this.assertMaterialPayload(
      nextType,
      {
        content: dto.content !== undefined ? dto.content : existing.content,
        videoUrl: dto.videoUrl !== undefined ? dto.videoUrl : existing.videoUrl,
        externalUrl: dto.externalUrl !== undefined ? dto.externalUrl : existing.externalUrl,
      },
      nextStatus,
    );

    const wasPublished = existing.status === PageStatus.PUBLISHED;
    const willPublish = nextStatus === PageStatus.PUBLISHED;

    if (dto.attachments !== undefined) {
      await this.syncAttachments(id, dto.attachments);
    }

    if (dto.targetAudienceIds !== undefined) {
      await this.syncTargetAudiences(id, dto.targetAudienceIds);
    }

    const material = await this.prisma.knowledgeMaterial.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.moduleId !== undefined ? { moduleId: dto.moduleId || null } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug.trim() } : {}),
        ...(dto.excerpt !== undefined ? { excerpt: dto.excerpt?.trim() || null } : {}),
        ...(dto.content !== undefined ? { content: dto.content?.trim() || null } : {}),
        ...(dto.readingTimeMinutes !== undefined
          ? { readingTimeMinutes: dto.readingTimeMinutes }
          : {}),
        ...(dto.tutorRecommendation !== undefined
          ? { tutorRecommendation: dto.tutorRecommendation?.trim() || null }
          : {}),
        ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl?.trim() || null } : {}),
        ...(dto.externalUrl !== undefined ? { externalUrl: dto.externalUrl?.trim() || null } : {}),
        ...(dto.thumbnailUrl !== undefined
          ? { thumbnailUrl: dto.thumbnailUrl?.trim() || null }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        publishedAt:
          willPublish && !wasPublished
            ? new Date()
            : willPublish
              ? existing.publishedAt
              : dto.status !== undefined
                ? null
                : undefined,
      },
      include: buildMaterialInclude(),
    });
    return this.mapMaterialResponse(material, true);
  }

  async togglePin(id: string) {
    const material = await this.findOneMaterial(id, true);
    const updated = await this.prisma.knowledgeMaterial.update({
      where: { id },
      data: { isPinned: !material.isPinned },
      include: buildMaterialInclude(),
    });
    return this.mapMaterialResponse(updated, true);
  }

  async publishMaterial(id: string) {
    await this.findOneMaterial(id, true);
    const material = await this.prisma.knowledgeMaterial.update({
      where: { id },
      data: {
        status: PageStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: buildMaterialInclude(),
    });
    return this.mapMaterialResponse(material, true);
  }

  async removeMaterial(id: string) {
    await this.findOneMaterial(id, true);
    return this.prisma.knowledgeMaterial.delete({ where: { id } });
  }

  async upsertVideoProgress(userId: string, materialId: string, dto: UpdateVideoProgressDto) {
    const material = await this.findOneMaterial(materialId, false, userId);
    if (material.type !== KnowledgeMaterialType.VIDEO) {
      throw new BadRequestException('Прогресс доступен только для видеоматериалов');
    }

    const progressPercent = Math.min(100, Math.max(0, dto.progressPercent));
    const completed = dto.completed ?? progressPercent >= 90;

    const progress = await this.prisma.knowledgeVideoProgress.upsert({
      where: {
        materialId_userId: { materialId, userId },
      },
      create: {
        materialId,
        userId,
        progressPercent,
        positionSeconds: dto.positionSeconds ?? 0,
        completed,
      },
      update: {
        progressPercent,
        positionSeconds: dto.positionSeconds ?? undefined,
        completed,
      },
    });

    return progress;
  }

  async getVideoProgress(userId: string, materialId: string) {
    await this.findOneMaterial(materialId, false, userId);
    return this.prisma.knowledgeVideoProgress.findUnique({
      where: {
        materialId_userId: { materialId, userId },
      },
    });
  }

  async createCategory(dto: CreateKnowledgeCategoryDto) {
    const existing = await this.prisma.knowledgeCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Категория со slug "${dto.slug}" уже существует`);
    }
    return this.prisma.knowledgeCategory.create({ data: dto });
  }

  async findAllCategories(editorView = false) {
    const materialsWhere: Prisma.KnowledgeMaterialWhereInput = editorView
      ? {}
      : { status: PageStatus.PUBLISHED };

    return this.prisma.knowledgeCategory.findMany({
      include: {
        _count: {
          select: {
            materials: { where: materialsWhere },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async updateCategory(id: string, data: Partial<CreateKnowledgeCategoryDto>) {
    await this.prisma.knowledgeCategory.findUniqueOrThrow({ where: { id } });
    if (data.slug) {
      const existing = await this.prisma.knowledgeCategory.findFirst({
        where: { slug: data.slug, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Категория со slug "${data.slug}" уже существует`);
      }
    }
    return this.prisma.knowledgeCategory.update({ where: { id }, data });
  }

  async removeCategory(id: string) {
    return this.prisma.knowledgeCategory.delete({ where: { id } });
  }

  async createModule(dto: CreateKnowledgeModuleDto) {
    const category = await this.prisma.knowledgeCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    const existing = await this.prisma.knowledgeModule.findUnique({
      where: {
        categoryId_slug: { categoryId: dto.categoryId, slug: dto.slug },
      },
    });
    if (existing) {
      throw new ConflictException(`Модуль со slug "${dto.slug}" уже существует в этой категории`);
    }

    return this.prisma.knowledgeModule.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        slug: dto.slug.trim(),
        description: dto.description?.trim() || null,
        order: dto.order ?? 0,
      },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });
  }

  async findAllModules(categoryId: string, editorView = false) {
    const materialsWhere: Prisma.KnowledgeMaterialWhereInput = editorView
      ? {}
      : { status: PageStatus.PUBLISHED };

    return this.prisma.knowledgeModule.findMany({
      where: { categoryId },
      include: {
        _count: {
          select: {
            materials: { where: materialsWhere },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async updateModule(id: string, data: Partial<CreateKnowledgeModuleDto>) {
    const existing = await this.prisma.knowledgeModule.findUniqueOrThrow({ where: { id } });

    if (data.slug) {
      const slugTaken = await this.prisma.knowledgeModule.findFirst({
        where: {
          categoryId: existing.categoryId,
          slug: data.slug,
          NOT: { id },
        },
      });
      if (slugTaken) {
        throw new ConflictException(
          `Модуль со slug "${data.slug}" уже существует в этой категории`,
        );
      }
    }

    if (data.categoryId && data.categoryId !== existing.categoryId) {
      const category = await this.prisma.knowledgeCategory.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Категория не найдена');
      }
    }

    return this.prisma.knowledgeModule.update({
      where: { id },
      data: {
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.slug !== undefined ? { slug: data.slug.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
      },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });
  }

  async removeModule(id: string) {
    return this.prisma.knowledgeModule.delete({ where: { id } });
  }

  async getStats() {
    const [
      total,
      published,
      draft,
      videoCount,
      articleCount,
      linkCount,
      categoryCount,
      pinnedCount,
    ] = await Promise.all([
      this.prisma.knowledgeMaterial.count(),
      this.prisma.knowledgeMaterial.count({ where: { status: PageStatus.PUBLISHED } }),
      this.prisma.knowledgeMaterial.count({ where: { status: PageStatus.DRAFT } }),
      this.prisma.knowledgeMaterial.count({ where: { type: KnowledgeMaterialType.VIDEO } }),
      this.prisma.knowledgeMaterial.count({ where: { type: KnowledgeMaterialType.ARTICLE } }),
      this.prisma.knowledgeMaterial.count({ where: { type: KnowledgeMaterialType.LINK } }),
      this.prisma.knowledgeCategory.count(),
      this.prisma.knowledgeMaterial.count({ where: { isPinned: true } }),
    ]);

    return {
      totalMaterials: total,
      publishedMaterials: published,
      draftMaterials: draft,
      videoCount,
      articleCount,
      linkCount,
      categoryCount,
      pinnedCount,
    };
  }

  private saveUploadedFile(
    file: Express.Multer.File,
    baseUrl: string,
    prefix: string,
  ): { imageUrl: string } {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'knowledge');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = extname(file.originalname) || '';
    const filename = `${prefix}-${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destPath);
    const rel = `/uploads/knowledge/${filename}`;
    const urlPrefix = uploadsBaseUrl(baseUrl);
    return { imageUrl: `${urlPrefix}${rel}` };
  }

  async uploadThumbnail(file: Express.Multer.File, baseUrl: string): Promise<{ imageUrl: string }> {
    return this.saveUploadedFile(file, baseUrl, 'knowledge');
  }

  async uploadAttachment(
    file: Express.Multer.File,
    baseUrl: string,
  ): Promise<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string }> {
    const result = this.saveUploadedFile(file, baseUrl, 'attachment');
    return {
      fileUrl: result.imageUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }
}
