import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { KnowledgeMaterialFavoritesService } from './services/knowledge-material-favorites.service';
import { KnowledgeSequentialAccessService } from './services/knowledge-sequential-access.service';
import { KnowledgeMaterialCommentsService } from './services/knowledge-material-comments.service';
import { KnowledgeMaterialLikesService } from './services/knowledge-material-likes.service';
import { KnowledgeQuizService } from './knowledge-quiz.service';
import { sortKnowledgeMaterialIdsForList } from './knowledge-material-list-order';
import { buildMaterialInclude, mapMaterialResponse } from './knowledge-material.utils';
import {
  buildKnowledgeMaterialListBaseWhere,
  buildKnowledgeMaterialTitleExcerptSearch,
} from './knowledge-material-search.utils';

@Injectable()
export class KnowledgeMaterialListService {
  constructor(
    private prisma: PrismaService,
    private knowledgeQuizService: KnowledgeQuizService,
    private knowledgeMaterialLikesService: KnowledgeMaterialLikesService,
    private knowledgeMaterialFavoritesService: KnowledgeMaterialFavoritesService,
    private knowledgeMaterialCommentsService: KnowledgeMaterialCommentsService,
    private knowledgeSequentialAccessService: KnowledgeSequentialAccessService,
  ) {}

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
    allowedCategoryIds?: string[];
    favoritesOnly?: boolean;
    applySequentialLearning?: boolean;
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
      allowedCategoryIds,
      favoritesOnly = false,
      applySequentialLearning = false,
    } = params;
    const skip = (page - 1) * limit;

    const where = buildKnowledgeMaterialListBaseWhere({
      editorView,
      status,
      categoryId,
      moduleId,
      type,
      allowedCategoryIds,
      favoritesOnly,
      userId,
    });

    if (search?.trim()) {
      const andClauses = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...andClauses, buildKnowledgeMaterialTitleExcerptSearch(search)];
    }

    const listMode = categoryId ? 'category' : 'all';
    const totalPromise = this.prisma.knowledgeMaterial.count({ where });

    if (favoritesOnly && userId) {
      const favoriteIds =
        await this.knowledgeMaterialFavoritesService.listFavoriteMaterialIds(userId);
      const [allRows, total] = await Promise.all([
        this.prisma.knowledgeMaterial.findMany({
          where: { ...where, id: { in: favoriteIds } },
          select: {
            id: true,
            status: true,
            sortOrder: true,
            isPinned: true,
            createdAt: true,
            publishedAt: true,
            module: { select: { order: true } },
          },
        }),
        totalPromise,
      ]);
      const rowIds = new Set(allRows.map((row) => row.id));
      const sortedIds = favoriteIds.filter((id) => rowIds.has(id));
      const pageIds = sortedIds.slice(skip, skip + limit);
      const rows = await this.loadMaterialsByIds(pageIds, userId);
      const mapped = rows.map((m) => mapMaterialResponse(m, editorView));
      const withQuiz = await this.enrichWithQuizStatus(mapped, editorView, userId);
      const withLikes = await this.knowledgeMaterialLikesService.attachLikeStats(withQuiz, userId);
      const withFavorites = await this.knowledgeMaterialFavoritesService.attachFavoriteStats(
        withLikes,
        userId,
      );
      const enriched =
        await this.knowledgeMaterialCommentsService.attachCommentCounts(withFavorites);
      const finalized = await this.finalizeMaterialsForViewer(enriched, {
        editorView,
        userId,
        categoryId,
        applySequentialLearning: applySequentialLearning && Boolean(categoryId),
      });

      return {
        data: finalized,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    const [allRows, total] = await Promise.all([
      this.prisma.knowledgeMaterial.findMany({
        where,
        select: {
          id: true,
          status: true,
          sortOrder: true,
          isPinned: true,
          createdAt: true,
          publishedAt: true,
          module: { select: { order: true } },
        },
      }),
      totalPromise,
    ]);

    const sortedIds = sortKnowledgeMaterialIdsForList(allRows, listMode);
    const pageIds = sortedIds.slice(skip, skip + limit);
    const rows = await this.loadMaterialsByIds(pageIds, userId);
    const mapped = rows.map((m) => mapMaterialResponse(m, editorView));
    const withQuiz = await this.enrichWithQuizStatus(mapped, editorView, userId);
    const withLikes = await this.knowledgeMaterialLikesService.attachLikeStats(withQuiz, userId);
    const withFavorites = await this.knowledgeMaterialFavoritesService.attachFavoriteStats(
      withLikes,
      userId,
    );
    const enriched = await this.knowledgeMaterialCommentsService.attachCommentCounts(withFavorites);
    const finalized = await this.finalizeMaterialsForViewer(enriched, {
      editorView,
      userId,
      categoryId,
      applySequentialLearning: applySequentialLearning && Boolean(categoryId),
    });

    return {
      data: finalized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async searchMaterialSuggestions(params: {
    q: string;
    limit?: number;
    categoryId?: string;
    moduleId?: string;
    type?: string;
    editorView?: boolean;
    allowedCategoryIds?: string[];
  }) {
    const query = params.q.trim();
    if (query.length < 2) {
      return [];
    }

    const take = Math.min(Math.max(params.limit ?? 8, 1), 20);
    const where = buildKnowledgeMaterialListBaseWhere({
      editorView: params.editorView,
      categoryId: params.categoryId,
      moduleId: params.moduleId,
      type: params.type,
      allowedCategoryIds: params.allowedCategoryIds,
    });

    const andClauses = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [...andClauses, buildKnowledgeMaterialTitleExcerptSearch(query)];

    const rows = await this.prisma.knowledgeMaterial.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        thumbnailUrl: true,
        type: true,
        category: { select: { name: true } },
        module: { select: { name: true } },
      },
      take,
      orderBy: [{ title: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      thumbnailUrl: row.thumbnailUrl,
      type: row.type,
      categoryName: row.category.name,
      moduleName: row.module?.name ?? null,
    }));
  }

  private async loadMaterialsByIds(ids: string[], userId?: string) {
    if (ids.length === 0) {
      return [];
    }

    const pageRows = await this.prisma.knowledgeMaterial.findMany({
      where: { id: { in: ids } },
      include: buildMaterialInclude(userId),
    });

    const rowsById = new Map(pageRows.map((row) => [row.id, row]));
    return ids
      .map((id) => rowsById.get(id))
      .filter((row): row is NonNullable<typeof row> => row != null);
  }

  private async finalizeMaterialsForViewer<T extends { id: string; type: string }>(
    materials: T[],
    options: {
      editorView: boolean;
      userId?: string;
      categoryId?: string;
      applySequentialLearning: boolean;
    },
  ) {
    if (!options.userId || materials.length === 0) {
      return materials.map((material) => ({
        ...material,
        studyCompleted: false,
        sequentialLocked: false,
      }));
    }

    if (options.applySequentialLearning && options.categoryId) {
      return this.knowledgeSequentialAccessService.attachSequentialAccess(
        materials,
        options.categoryId,
        options.userId,
      );
    }

    const withStudyFlags = await this.knowledgeSequentialAccessService.attachStudyCompletedFlags(
      materials,
      options.userId,
    );
    return withStudyFlags.map((material) => ({
      ...material,
      sequentialLocked: false,
    }));
  }

  private async enrichWithQuizStatus<T extends { id: string }>(
    materials: T[],
    editorView: boolean,
    userId?: string,
  ) {
    if (!userId || materials.length === 0) {
      return materials;
    }

    const statusMap = await this.knowledgeQuizService.getUserQuizStatusForMaterials(
      materials.map((m) => m.id),
      userId,
    );

    return materials.map((m) => ({
      ...m,
      myQuizStatus: statusMap[m.id] ?? { hasQuiz: false, passed: false, scorePercent: null },
    }));
  }
}
