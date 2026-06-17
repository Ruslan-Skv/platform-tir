import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KnowledgeMaterialType, PageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateKnowledgeCategoryDto } from './dto/create-knowledge-category.dto';
import { CreateKnowledgeModuleDto } from './dto/create-knowledge-module.dto';
import { ImportKnowledgeCategoryOutlineDto } from './dto/import-knowledge-category-outline.dto';

@Injectable()
export class KnowledgeStructureService {
  constructor(private readonly prisma: PrismaService) {}

  async assertModuleBelongsToCategory(moduleId: string, categoryId: string) {
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

  async createCategory(dto: CreateKnowledgeCategoryDto) {
    const existing = await this.prisma.knowledgeCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Категория со slug "${dto.slug}" уже существует`);
    }
    return this.prisma.knowledgeCategory.create({ data: dto });
  }

  findAllCategories(editorView = false) {
    const materialsWhere: Prisma.KnowledgeMaterialWhereInput = editorView
      ? { deletedAt: null }
      : {
          deletedAt: null,
          status: PageStatus.PUBLISHED,
          OR: [{ moduleId: null }, { module: { deletedAt: null } }],
        };

    return this.prisma.knowledgeCategory.findMany({
      where: { deletedAt: null },
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

  findAllModules(categoryId: string, editorView = false) {
    const materialsWhere: Prisma.KnowledgeMaterialWhereInput = {
      deletedAt: null,
      ...(editorView ? {} : { status: PageStatus.PUBLISHED }),
    };

    return this.prisma.knowledgeModule.findMany({
      where: { categoryId, deletedAt: null },
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

  private buildModuleSlug(moduleOrder: number): string {
    return `module-${String(moduleOrder).padStart(2, '0')}`;
  }

  private buildArticleSlug(
    categorySlug: string,
    moduleOrder: number,
    articleOrder: number,
  ): string {
    return `${categorySlug}-m${String(moduleOrder).padStart(2, '0')}-t${String(articleOrder).padStart(2, '0')}`;
  }

  async importCategoryOutline(
    categoryId: string,
    authorId: string,
    dto: ImportKnowledgeCategoryOutlineDto,
  ) {
    const category = await this.prisma.knowledgeCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    const [existingModules, existingMaterials] = await Promise.all([
      this.prisma.knowledgeModule.count({
        where: { categoryId, deletedAt: null },
      }),
      this.prisma.knowledgeMaterial.count({
        where: { categoryId, deletedAt: null },
      }),
    ]);

    if (existingModules > 0 || existingMaterials > 0) {
      throw new BadRequestException(
        'Импорт доступен только для пустой категории без модулей и материалов',
      );
    }

    let modulesCreated = 0;
    let articlesCreated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const [moduleIndex, moduleDto] of dto.modules.entries()) {
        const moduleOrder = moduleDto.order ?? moduleIndex + 1;
        const moduleSlug = this.buildModuleSlug(moduleOrder);

        const createdModule = await tx.knowledgeModule.create({
          data: {
            categoryId,
            name: moduleDto.name.trim(),
            slug: moduleSlug,
            description: moduleDto.description?.trim() || null,
            order: moduleOrder,
          },
        });
        modulesCreated += 1;

        for (const [articleIndex, articleDto] of moduleDto.articles.entries()) {
          const articleOrder = articleDto.sortOrder ?? articleIndex + 1;
          const articleSlug = this.buildArticleSlug(category.slug, moduleOrder, articleOrder);

          await tx.knowledgeMaterial.create({
            data: {
              categoryId,
              moduleId: createdModule.id,
              type: KnowledgeMaterialType.ARTICLE,
              title: articleDto.title.trim(),
              slug: articleSlug,
              excerpt: articleDto.excerpt?.trim() || null,
              sortOrder: articleOrder,
              status: PageStatus.DRAFT,
              authorId,
            },
          });
          articlesCreated += 1;
        }
      }
    });

    return {
      categoryId,
      modulesCreated,
      articlesCreated,
    };
  }
}
