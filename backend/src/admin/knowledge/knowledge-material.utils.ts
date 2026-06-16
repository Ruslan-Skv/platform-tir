import { BadRequestException } from '@nestjs/common';
import { KnowledgeMaterialType, PageStatus, Prisma } from '@prisma/client';
import { KnowledgeAttachmentDto } from './dto/knowledge-attachment.dto';

export function buildMaterialInclude(userId?: string) {
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

export type MaterialWithRelations = Prisma.KnowledgeMaterialGetPayload<{
  include: ReturnType<typeof buildMaterialInclude>;
}>;

export function mapMaterialResponse(material: MaterialWithRelations, editorView = false) {
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

export function assertMaterialPayload(
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

export function mapAttachmentsForCreate(attachments: KnowledgeAttachmentDto[] | undefined) {
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
