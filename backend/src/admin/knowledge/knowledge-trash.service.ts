import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { KnowledgeUploadService } from './knowledge-upload.service';

export const KNOWLEDGE_TRASH_RETENTION_DAYS = 30;
const KNOWLEDGE_TRASH_RETENTION_MS = KNOWLEDGE_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type KnowledgeTrashItemType = 'material' | 'category' | 'module';

export type KnowledgeTrashUserRef = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

export type KnowledgeTrashRow = {
  id: string;
  type: KnowledgeTrashItemType;
  title: string;
  subtitle: string | null;
  deletedAt: string;
  permanentDeleteAt: string;
  deletedBy: KnowledgeTrashUserRef | null;
};

const deletedBySelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

const materialFilesSelect = {
  videoUrl: true,
  thumbnailUrl: true,
  attachments: { select: { fileUrl: true } },
} satisfies Prisma.KnowledgeMaterialSelect;

type MaterialWithFiles = {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  attachments: { fileUrl: string }[];
};

@Injectable()
export class KnowledgeTrashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: KnowledgeUploadService,
  ) {}

  private materialFileUrls(material: MaterialWithFiles): (string | null)[] {
    return [
      material.videoUrl,
      material.thumbnailUrl,
      ...material.attachments.map((a) => a.fileUrl),
    ];
  }

  permanentDeleteAtIso(deletedAt: Date): string {
    return new Date(deletedAt.getTime() + KNOWLEDGE_TRASH_RETENTION_MS).toISOString();
  }

  private isTrashExpired(deletedAt: Date): boolean {
    return deletedAt.getTime() < Date.now() - KNOWLEDGE_TRASH_RETENTION_MS;
  }

  private async purgeExpiredTrash(): Promise<void> {
    const cutoff = new Date(Date.now() - KNOWLEDGE_TRASH_RETENTION_MS);

    const expiredCategories = await this.prisma.knowledgeCategory.findMany({
      where: { deletedAt: { lt: cutoff } },
      select: { id: true, image: true },
    });
    const expiredCategoryIds = expiredCategories.map((c) => c.id);

    // Материалы истёкших категорий удаляются каскадом вместе с категорией,
    // даже если сами ещё не истекли, — их файлы тоже нужно удалить с диска.
    const [expiredMaterials, categoryMaterials] = await Promise.all([
      this.prisma.knowledgeMaterial.findMany({
        where: { deletedAt: { lt: cutoff } },
        select: materialFilesSelect,
      }),
      expiredCategoryIds.length
        ? this.prisma.knowledgeMaterial.findMany({
            where: { categoryId: { in: expiredCategoryIds } },
            select: materialFilesSelect,
          })
        : Promise.resolve<MaterialWithFiles[]>([]),
    ]);

    await this.prisma.$transaction([
      this.prisma.knowledgeMaterial.deleteMany({
        where: { deletedAt: { lt: cutoff } },
      }),
      this.prisma.knowledgeModule.deleteMany({
        where: { deletedAt: { lt: cutoff } },
      }),
      this.prisma.knowledgeCategory.deleteMany({
        where: { deletedAt: { lt: cutoff } },
      }),
    ]);

    const fileUrls = [
      ...expiredCategories.flatMap((c) => [c.image]),
      ...[...expiredMaterials, ...categoryMaterials].flatMap((m) => this.materialFileUrls(m)),
    ];
    await this.uploadService.removeLocalFilesByUrls(fileUrls);
  }

  async softDeleteMaterial(id: string, deletedById: string) {
    const material = await this.prisma.knowledgeMaterial.findFirst({
      where: { id, deletedAt: null },
    });
    if (!material) {
      throw new NotFoundException('Материал не найден');
    }
    return this.prisma.knowledgeMaterial.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById },
    });
  }

  async softDeleteCategory(id: string, deletedById: string) {
    const category = await this.prisma.knowledgeCategory.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    const materialCount = await this.prisma.knowledgeMaterial.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (materialCount > 0) {
      throw new BadRequestException(
        'Нельзя удалить категорию: в ней есть материалы. Сначала переместите или удалите материалы.',
      );
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.knowledgeModule.updateMany({
        where: { categoryId: id, deletedAt: null },
        data: { deletedAt: now, deletedById },
      }),
      this.prisma.knowledgeCategory.update({
        where: { id },
        data: { deletedAt: now, deletedById },
      }),
    ]);
  }

  async softDeleteModule(id: string, deletedById: string) {
    const mod = await this.prisma.knowledgeModule.findFirst({
      where: { id, deletedAt: null },
    });
    if (!mod) {
      throw new NotFoundException('Модуль не найден');
    }
    return this.prisma.knowledgeModule.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById },
    });
  }

  async getTrashCount(): Promise<number> {
    await this.purgeExpiredTrash();
    const [materials, categories, modules] = await Promise.all([
      this.prisma.knowledgeMaterial.count({ where: { deletedAt: { not: null } } }),
      this.prisma.knowledgeCategory.count({ where: { deletedAt: { not: null } } }),
      this.prisma.knowledgeModule.count({ where: { deletedAt: { not: null } } }),
    ]);
    return materials + categories + modules;
  }

  async listTrash(params: { search?: string; page?: number; limit?: number }) {
    await this.purgeExpiredTrash();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(1, params.limit ?? 25), 100);
    const term = params.search?.trim().toLowerCase();

    const [materials, categories, modules] = await Promise.all([
      this.prisma.knowledgeMaterial.findMany({
        where: { deletedAt: { not: null } },
        include: {
          category: { select: { name: true } },
          module: { select: { name: true } },
          deletedBy: { select: deletedBySelect },
        },
      }),
      this.prisma.knowledgeCategory.findMany({
        where: { deletedAt: { not: null } },
        include: { deletedBy: { select: deletedBySelect } },
      }),
      this.prisma.knowledgeModule.findMany({
        where: { deletedAt: { not: null } },
        include: {
          category: { select: { name: true } },
          deletedBy: { select: deletedBySelect },
        },
      }),
    ]);

    let rows: KnowledgeTrashRow[] = [
      ...materials.map((m) => ({
        id: m.id,
        type: 'material' as const,
        title: m.title,
        subtitle: [m.category.name, m.module?.name].filter(Boolean).join(' · ') || null,
        deletedAt: m.deletedAt!.toISOString(),
        permanentDeleteAt: this.permanentDeleteAtIso(m.deletedAt!),
        deletedBy: m.deletedBy,
      })),
      ...categories.map((c) => ({
        id: c.id,
        type: 'category' as const,
        title: c.name,
        subtitle: 'Категория',
        deletedAt: c.deletedAt!.toISOString(),
        permanentDeleteAt: this.permanentDeleteAtIso(c.deletedAt!),
        deletedBy: c.deletedBy,
      })),
      ...modules.map((m) => ({
        id: m.id,
        type: 'module' as const,
        title: m.name,
        subtitle: `Модуль · ${m.category.name}`,
        deletedAt: m.deletedAt!.toISOString(),
        permanentDeleteAt: this.permanentDeleteAtIso(m.deletedAt!),
        deletedBy: m.deletedBy,
      })),
    ];

    if (term) {
      rows = rows.filter(
        (row) =>
          row.title.toLowerCase().includes(term) ||
          row.subtitle?.toLowerCase().includes(term) ||
          row.type.includes(term),
      );
    }

    rows.sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt));

    const total = rows.length;
    const start = (page - 1) * limit;
    const data = rows.slice(start, start + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      trashRetentionDays: KNOWLEDGE_TRASH_RETENTION_DAYS,
    };
  }

  restoreTrashItem(type: KnowledgeTrashItemType, id: string) {
    if (type === 'material') return this.restoreMaterial(id);
    if (type === 'category') return this.restoreCategory(id);
    return this.restoreModule(id);
  }

  permanentDeleteTrashItem(type: KnowledgeTrashItemType, id: string) {
    if (type === 'material') return this.permanentDeleteMaterial(id);
    if (type === 'category') return this.permanentDeleteCategory(id);
    return this.permanentDeleteModule(id);
  }

  async restoreMaterial(id: string) {
    const row = await this.prisma.knowledgeMaterial.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!row) {
      throw new NotFoundException('Материал не найден в корзине');
    }
    if (this.isTrashExpired(row.deletedAt!)) {
      throw new NotFoundException('Срок восстановления материала истёк');
    }
    const category = await this.prisma.knowledgeCategory.findFirst({
      where: { id: row.categoryId, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Нельзя восстановить: категория в корзине');
    }
    if (row.moduleId) {
      const mod = await this.prisma.knowledgeModule.findFirst({
        where: { id: row.moduleId, deletedAt: null },
      });
      if (!mod) {
        throw new NotFoundException('Нельзя восстановить: модуль в корзине');
      }
    }
    const slugTaken = await this.prisma.knowledgeMaterial.findFirst({
      where: { slug: row.slug, deletedAt: null, NOT: { id } },
    });
    if (slugTaken) {
      throw new NotFoundException('Нельзя восстановить: slug уже занят другим материалом');
    }
    return this.prisma.knowledgeMaterial.update({
      where: { id },
      data: { deletedAt: null, deletedById: null },
    });
  }

  async restoreCategory(id: string) {
    const row = await this.prisma.knowledgeCategory.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!row) {
      throw new NotFoundException('Категория не найдена в корзине');
    }
    if (this.isTrashExpired(row.deletedAt!)) {
      throw new NotFoundException('Срок восстановления категории истёк');
    }
    const slugTaken = await this.prisma.knowledgeCategory.findFirst({
      where: { slug: row.slug, deletedAt: null, NOT: { id } },
    });
    if (slugTaken) {
      throw new NotFoundException('Нельзя восстановить: slug уже занят другой категорией');
    }
    const deletedAt = row.deletedAt!;
    await this.prisma.$transaction([
      this.prisma.knowledgeCategory.update({
        where: { id },
        data: { deletedAt: null, deletedById: null },
      }),
      this.prisma.knowledgeModule.updateMany({
        where: { categoryId: id, deletedAt },
        data: { deletedAt: null, deletedById: null },
      }),
      this.prisma.knowledgeMaterial.updateMany({
        where: { categoryId: id, deletedAt },
        data: { deletedAt: null, deletedById: null },
      }),
    ]);
  }

  async permanentDeleteMaterial(id: string): Promise<void> {
    const row = await this.prisma.knowledgeMaterial.findFirst({
      where: { id, deletedAt: { not: null } },
      select: materialFilesSelect,
    });
    if (!row) {
      throw new NotFoundException('Материал не найден в корзине');
    }
    await this.prisma.knowledgeMaterial.delete({ where: { id } });
    await this.uploadService.removeLocalFilesByUrls(this.materialFileUrls(row));
  }

  async permanentDeleteCategory(id: string): Promise<void> {
    const row = await this.prisma.knowledgeCategory.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, image: true },
    });
    if (!row) {
      throw new NotFoundException('Категория не найдена в корзине');
    }
    const liveMaterialCount = await this.prisma.knowledgeMaterial.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (liveMaterialCount > 0) {
      throw new BadRequestException(
        'Нельзя удалить категорию безвозвратно: в ней есть активные материалы. Сначала переместите или удалите материалы.',
      );
    }
    // Каскадом удалятся модули и материалы категории, находящиеся в корзине.
    const materials = await this.prisma.knowledgeMaterial.findMany({
      where: { categoryId: id },
      select: materialFilesSelect,
    });
    await this.prisma.knowledgeCategory.delete({ where: { id } });
    const fileUrls = [row.image, ...materials.flatMap((m) => this.materialFileUrls(m))];
    await this.uploadService.removeLocalFilesByUrls(fileUrls);
  }

  async permanentDeleteModule(id: string): Promise<void> {
    const row = await this.prisma.knowledgeModule.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!row) {
      throw new NotFoundException('Модуль не найден в корзине');
    }
    // Материалы модуля остаются (moduleId → null по схеме).
    await this.prisma.knowledgeModule.delete({ where: { id } });
  }

  async restoreModule(id: string) {
    const row = await this.prisma.knowledgeModule.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!row) {
      throw new NotFoundException('Модуль не найден в корзине');
    }
    if (this.isTrashExpired(row.deletedAt!)) {
      throw new NotFoundException('Срок восстановления модуля истёк');
    }
    const category = await this.prisma.knowledgeCategory.findFirst({
      where: { id: row.categoryId, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Нельзя восстановить: категория в корзине');
    }
    const slugTaken = await this.prisma.knowledgeModule.findFirst({
      where: {
        categoryId: row.categoryId,
        slug: row.slug,
        deletedAt: null,
        NOT: { id },
      },
    });
    if (slugTaken) {
      throw new NotFoundException('Нельзя восстановить: slug уже занят другим модулем');
    }
    return this.prisma.knowledgeModule.update({
      where: { id },
      data: { deletedAt: null, deletedById: null },
    });
  }
}
