import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  KnowledgeMaterialType,
  KnowledgeThumbnailDisplay,
  PageStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { KnowledgeMaterialCommentsService } from './services/knowledge-material-comments.service';
import { KnowledgeMaterialLikesService } from './services/knowledge-material-likes.service';
import { KnowledgeMaterialListService } from './knowledge-material-list.service';
import { KnowledgeStructureService } from './knowledge-structure.service';
import { KnowledgeTargetAudienceService } from './knowledge-target-audience.service';
import { KnowledgeTrashService } from './knowledge-trash.service';
import { KnowledgeUploadService } from './knowledge-upload.service';
import { CreateKnowledgeCategoryDto } from './dto/create-knowledge-category.dto';
import { CreateKnowledgeModuleDto } from './dto/create-knowledge-module.dto';
import { CreateKnowledgeMaterialDto } from './dto/create-knowledge-material.dto';
import { ImportKnowledgeCategoryOutlineDto } from './dto/import-knowledge-category-outline.dto';
import { CreateKnowledgeTargetAudienceDto } from './dto/create-knowledge-target-audience.dto';
import { UpdateKnowledgeMaterialDto } from './dto/update-knowledge-material.dto';
import { KnowledgeAttachmentDto } from './dto/knowledge-attachment.dto';
import { UpdateVideoProgressDto } from './dto/update-video-progress.dto';
import {
  assertMaterialPayload,
  buildMaterialInclude,
  mapAttachmentsForCreate,
  mapMaterialResponse,
} from './knowledge-material.utils';

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    private materialListService: KnowledgeMaterialListService,
    private structureService: KnowledgeStructureService,
    private targetAudienceService: KnowledgeTargetAudienceService,
    private trashService: KnowledgeTrashService,
    private uploadService: KnowledgeUploadService,
    private knowledgeMaterialLikesService: KnowledgeMaterialLikesService,
    private knowledgeMaterialCommentsService: KnowledgeMaterialCommentsService,
  ) {}

  findAllTargetAudiences() {
    return this.targetAudienceService.findAllTargetAudiences();
  }

  createTargetAudience(dto: CreateKnowledgeTargetAudienceDto) {
    return this.targetAudienceService.createTargetAudience(dto);
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
      await this.structureService.assertModuleBelongsToCategory(dto.moduleId, dto.categoryId);
    }

    const status = dto.status ?? PageStatus.DRAFT;
    assertMaterialPayload(dto.type, dto, status);

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
        managerPracticalAssignment: dto.managerPracticalAssignment?.trim() || null,
        videoUrl: dto.videoUrl?.trim() || null,
        externalUrl: dto.externalUrl?.trim() || null,
        thumbnailUrl: dto.thumbnailUrl?.trim() || null,
        thumbnailDisplay: dto.thumbnailDisplay ?? KnowledgeThumbnailDisplay.COVER,
        sortOrder: dto.sortOrder ?? 0,
        isPinned: dto.isPinned ?? false,
        status,
        publishedAt: status === PageStatus.PUBLISHED ? new Date() : null,
        authorId,
        attachments: mapAttachmentsForCreate(dto.attachments),
      },
      include: buildMaterialInclude(authorId),
    });
    if (dto.targetAudienceIds?.length) {
      await this.targetAudienceService.syncTargetAudiences(material.id, dto.targetAudienceIds);
      return this.findOneMaterial(material.id, true, authorId);
    }
    return mapMaterialResponse(material, true);
  }

  findAllMaterials(params: Parameters<KnowledgeMaterialListService['findAllMaterials']>[0]) {
    return this.materialListService.findAllMaterials(params);
  }

  searchMaterialSuggestions(
    params: Parameters<KnowledgeMaterialListService['searchMaterialSuggestions']>[0],
  ) {
    return this.materialListService.searchMaterialSuggestions(params);
  }

  async findOneMaterial(id: string, editorView = false, userId?: string) {
    const material = await this.prisma.knowledgeMaterial.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
        category: { deletedAt: null },
        AND: [{ OR: [{ moduleId: null }, { module: { deletedAt: null } }] }],
      },
      include: buildMaterialInclude(userId),
    });
    if (!material) {
      throw new NotFoundException('Материал не найден');
    }
    if (!editorView && material.status !== PageStatus.PUBLISHED) {
      throw new NotFoundException('Материал не найден');
    }
    const mapped = mapMaterialResponse(material, editorView);
    const [withLikes] = await this.knowledgeMaterialLikesService.attachLikeStats([mapped], userId);
    const [withCounts] = await this.knowledgeMaterialCommentsService.attachCommentCounts([
      withLikes,
    ]);
    return withCounts;
  }

  toggleLike(materialId: string, userId: string) {
    return this.knowledgeMaterialLikesService.toggleLike(materialId, userId);
  }

  getMaterialLikers(materialId: string) {
    return this.knowledgeMaterialLikesService.getMaterialLikers(materialId);
  }

  listMaterialComments(materialId: string, userId?: string) {
    return this.knowledgeMaterialCommentsService.listComments(materialId, userId);
  }

  createMaterialComment(materialId: string, userId: string, text: string) {
    return this.knowledgeMaterialCommentsService.createComment(materialId, userId, text);
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
        await this.structureService.assertModuleBelongsToCategory(dto.moduleId, nextCategoryId);
      }
    } else if (dto.categoryId && existing.moduleId) {
      await this.structureService.assertModuleBelongsToCategory(existing.moduleId, dto.categoryId);
    }

    const nextType = dto.type ?? existing.type;
    const nextStatus = dto.status ?? existing.status;
    assertMaterialPayload(
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
      await this.targetAudienceService.syncTargetAudiences(id, dto.targetAudienceIds);
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
        ...(dto.managerPracticalAssignment !== undefined
          ? { managerPracticalAssignment: dto.managerPracticalAssignment?.trim() || null }
          : {}),
        ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl?.trim() || null } : {}),
        ...(dto.externalUrl !== undefined ? { externalUrl: dto.externalUrl?.trim() || null } : {}),
        ...(dto.thumbnailUrl !== undefined
          ? { thumbnailUrl: dto.thumbnailUrl?.trim() || null }
          : {}),
        ...(dto.thumbnailDisplay !== undefined ? { thumbnailDisplay: dto.thumbnailDisplay } : {}),
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
    return mapMaterialResponse(material, true);
  }

  async togglePin(id: string) {
    const material = await this.findOneMaterial(id, true);
    const updated = await this.prisma.knowledgeMaterial.update({
      where: { id },
      data: { isPinned: !material.isPinned },
      include: buildMaterialInclude(),
    });
    return mapMaterialResponse(updated, true);
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
    return mapMaterialResponse(material, true);
  }

  async removeMaterial(id: string, deletedById: string) {
    return this.trashService.softDeleteMaterial(id, deletedById);
  }

  listTrash(params: { search?: string; page?: number; limit?: number }) {
    return this.trashService.listTrash(params);
  }

  getTrashCount() {
    return this.trashService.getTrashCount();
  }

  restoreTrashItem(type: 'material' | 'category' | 'module', id: string) {
    if (type === 'material') return this.trashService.restoreMaterial(id);
    if (type === 'category') return this.trashService.restoreCategory(id);
    return this.trashService.restoreModule(id);
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

  createCategory(dto: CreateKnowledgeCategoryDto) {
    return this.structureService.createCategory(dto);
  }

  importCategoryOutline(
    categoryId: string,
    authorId: string,
    dto: ImportKnowledgeCategoryOutlineDto,
  ) {
    return this.structureService.importCategoryOutline(categoryId, authorId, dto);
  }

  findAllCategories(editorView = false) {
    return this.structureService.findAllCategories(editorView);
  }

  updateCategory(id: string, data: Partial<CreateKnowledgeCategoryDto>) {
    return this.structureService.updateCategory(id, data);
  }

  removeCategory(id: string, deletedById: string) {
    return this.trashService.softDeleteCategory(id, deletedById);
  }

  createModule(dto: CreateKnowledgeModuleDto) {
    return this.structureService.createModule(dto);
  }

  findAllModules(categoryId: string, editorView = false) {
    return this.structureService.findAllModules(categoryId, editorView);
  }

  updateModule(id: string, data: Partial<CreateKnowledgeModuleDto>) {
    return this.structureService.updateModule(id, data);
  }

  removeModule(id: string, deletedById: string) {
    return this.trashService.softDeleteModule(id, deletedById);
  }

  async getStats() {
    const activeMaterialWhere: Prisma.KnowledgeMaterialWhereInput = {
      deletedAt: null,
      category: { deletedAt: null },
      OR: [{ moduleId: null }, { module: { deletedAt: null } }],
    };

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
      this.prisma.knowledgeMaterial.count({ where: activeMaterialWhere }),
      this.prisma.knowledgeMaterial.count({
        where: { ...activeMaterialWhere, status: PageStatus.PUBLISHED },
      }),
      this.prisma.knowledgeMaterial.count({
        where: { ...activeMaterialWhere, status: PageStatus.DRAFT },
      }),
      this.prisma.knowledgeMaterial.count({
        where: { ...activeMaterialWhere, type: KnowledgeMaterialType.VIDEO },
      }),
      this.prisma.knowledgeMaterial.count({
        where: { ...activeMaterialWhere, type: KnowledgeMaterialType.ARTICLE },
      }),
      this.prisma.knowledgeMaterial.count({
        where: { ...activeMaterialWhere, type: KnowledgeMaterialType.LINK },
      }),
      this.prisma.knowledgeCategory.count({ where: { deletedAt: null } }),
      this.prisma.knowledgeMaterial.count({
        where: { ...activeMaterialWhere, isPinned: true },
      }),
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

  uploadThumbnail(file: Express.Multer.File, baseUrl: string) {
    return this.uploadService.uploadThumbnail(file, baseUrl);
  }

  uploadAttachment(file: Express.Multer.File, baseUrl: string) {
    return this.uploadService.uploadAttachment(file, baseUrl);
  }
}
