import { KnowledgeMaterialType, PageStatus, Prisma } from '@prisma/client';

export function buildKnowledgeMaterialTitleExcerptSearch(
  term: string,
): Prisma.KnowledgeMaterialWhereInput {
  const query = term.trim();
  return {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { excerpt: { contains: query, mode: 'insensitive' } },
    ],
  };
}

export function buildKnowledgeMaterialListBaseWhere(params: {
  editorView?: boolean;
  status?: string;
  categoryId?: string;
  moduleId?: string;
  type?: string;
}): Prisma.KnowledgeMaterialWhereInput {
  const { editorView = false, status, categoryId, moduleId, type } = params;

  const where: Prisma.KnowledgeMaterialWhereInput = {
    deletedAt: null,
    category: { deletedAt: null },
    AND: [
      {
        OR: [{ moduleId: null }, { module: { deletedAt: null } }],
      },
    ],
  };

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

  return where;
}
