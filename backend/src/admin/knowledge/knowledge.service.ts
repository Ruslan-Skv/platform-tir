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
import { uploadsBaseUrl } from '../../common/utils/uploads-url';
import { CreateKnowledgeCategoryDto } from './dto/create-knowledge-category.dto';
import { CreateKnowledgeMaterialDto } from './dto/create-knowledge-material.dto';
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
    attachments: {
      orderBy: { sortOrder: 'asc' as const },
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
  constructor(private prisma: PrismaService) {}

  private mapMaterialResponse(material: MaterialWithRelations) {
    const { videoProgress, ...rest } = material as MaterialWithRelations & {
      videoProgress?: Array<{
        id: string;
        progressPercent: number;
        positionSeconds: number;
        completed: boolean;
        updatedAt: Date;
      }>;
    };
    return {
      ...rest,
      myVideoProgress: videoProgress?.[0] ?? null,
    };
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
    if (type === KnowledgeMaterialType.ARTICLE && !content) {
      throw new BadRequestException('Для статьи добавьте текстовое содержание');
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

    this.assertMaterialPayload(dto.type, dto);

    const status = dto.status ?? PageStatus.DRAFT;
    const material = await this.prisma.knowledgeMaterial.create({
      data: {
        categoryId: dto.categoryId,
        type: dto.type,
        title: dto.title.trim(),
        slug: dto.slug.trim(),
        excerpt: dto.excerpt?.trim() || null,
        content: dto.content?.trim() || null,
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
    return this.mapMaterialResponse(material);
  }

  async findAllMaterials(params: {
    status?: string;
    categoryId?: string;
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
          { sortOrder: 'asc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.knowledgeMaterial.count({ where }),
    ]);

    return {
      data: data.map((m) => this.mapMaterialResponse(m)),
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
    return this.mapMaterialResponse(material);
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

    const nextType = dto.type ?? existing.type;
    this.assertMaterialPayload(nextType, {
      content: dto.content !== undefined ? dto.content : existing.content,
      videoUrl: dto.videoUrl !== undefined ? dto.videoUrl : existing.videoUrl,
      externalUrl: dto.externalUrl !== undefined ? dto.externalUrl : existing.externalUrl,
    });

    const nextStatus = dto.status ?? existing.status;
    const wasPublished = existing.status === PageStatus.PUBLISHED;
    const willPublish = nextStatus === PageStatus.PUBLISHED;

    if (dto.attachments !== undefined) {
      await this.syncAttachments(id, dto.attachments);
    }

    const material = await this.prisma.knowledgeMaterial.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug.trim() } : {}),
        ...(dto.excerpt !== undefined ? { excerpt: dto.excerpt?.trim() || null } : {}),
        ...(dto.content !== undefined ? { content: dto.content?.trim() || null } : {}),
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
    return this.mapMaterialResponse(material);
  }

  async togglePin(id: string) {
    const material = await this.findOneMaterial(id, true);
    const updated = await this.prisma.knowledgeMaterial.update({
      where: { id },
      data: { isPinned: !material.isPinned },
      include: buildMaterialInclude(),
    });
    return this.mapMaterialResponse(updated);
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
    return this.mapMaterialResponse(material);
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
