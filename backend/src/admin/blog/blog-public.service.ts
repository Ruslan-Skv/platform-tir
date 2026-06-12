import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BlogPublicService {
  constructor(private prisma: PrismaService) {}

  async getPublishedTagStats() {
    const posts = await this.prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { tags: true },
    });
    const counts = new Map<string, number>();
    for (const p of posts) {
      for (const raw of p.tags) {
        const t = raw.trim();
        if (!t) continue;
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ru'));
  }

  async getPublishedPosts(params?: {
    categorySlug?: string;
    search?: string;
    tag?: string;
    page?: number;
    limit?: number;
  }) {
    const { categorySlug, search, tag, page = 1, limit = 12 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = { status: 'PUBLISHED' };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    const tagTrim = tag?.trim();
    if (tagTrim) {
      where.tags = { has: tagTrim };
    }

    if (search?.trim()) {
      const s = search.trim();
      const tagIds = await this.findPublishedPostIdsMatchingTagIlike(s);
      const or: Prisma.BlogPostWhereInput[] = [
        { title: { contains: s, mode: 'insensitive' } },
        { content: { contains: s, mode: 'insensitive' } },
        { excerpt: { contains: s, mode: 'insensitive' } },
      ];
      if (tagIds.length) {
        or.push({ id: { in: tagIds } });
      }
      const prevAnd = where.AND;
      const andList = Array.isArray(prevAnd) ? prevAnd : prevAnd ? [prevAnd] : [];
      where.AND = [...andList, { OR: or }];
    }

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          category: true,
        },
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    const postIds = posts.map((p) => p.id);
    const likeCounts =
      postIds.length > 0
        ? await this.prisma.blogPostLike.groupBy({
            by: ['postId'],
            _count: true,
            where: { postId: { in: postIds } },
          })
        : [];
    const likeCountMap = Object.fromEntries(likeCounts.map((lc) => [lc.postId, lc._count]));

    const postsWithLikeCount = posts.map((p) => ({
      ...p,
      likeCount: likeCountMap[p.id] ?? 0,
    }));

    return {
      data: postsWithLikeCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPublishedPostBySlug(slug: string, likerId?: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
        blocks: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
      } as Prisma.BlogPostInclude,
    });

    if (!post) {
      throw new NotFoundException(`Post with slug "${slug}" not found`);
    }

    await this.prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    let isLiked = false;
    if (likerId) {
      const like = await this.prisma.blogPostLike.findUnique({
        where: {
          postId_likerId: { postId: post.id, likerId },
        },
      });
      isLiked = !!like;
    }

    const likeCount = await this.prisma.blogPostLike.count({
      where: { postId: post.id },
    });

    return {
      ...post,
      viewCount: post.viewCount + 1,
      likeCount,
      isLiked,
    };
  }

  async toggleLike(postId: string, userId?: string, guestId?: string) {
    const likerId = userId || (guestId ? `g_${guestId}` : null);
    if (!likerId) {
      throw new ConflictException('Требуется авторизация или guestId');
    }

    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId, status: 'PUBLISHED' },
    });
    if (!post) {
      throw new NotFoundException('Пост не найден');
    }

    const existing = await this.prisma.blogPostLike.findUnique({
      where: { postId_likerId: { postId, likerId } },
    });

    if (existing) {
      await this.prisma.blogPostLike.delete({
        where: { id: existing.id },
      });
      const count = await this.prisma.blogPostLike.count({ where: { postId } });
      return { liked: false, likeCount: count };
    }

    await this.prisma.blogPostLike.create({
      data: { postId, likerId },
    });
    const count = await this.prisma.blogPostLike.count({ where: { postId } });
    return { liked: true, likeCount: count };
  }

  private async findPublishedPostIdsMatchingTagIlike(search: string): Promise<string[]> {
    const term = search.trim();
    if (!term) return [];
    const escaped = term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    const pattern = `%${escaped}%`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT bp.id
      FROM blog_posts bp
      WHERE bp.status = 'PUBLISHED'
      AND EXISTS (
        SELECT 1 FROM unnest(bp.tags) AS t
        WHERE t::text ILIKE ${pattern}
      )
    `;
    return rows.map((r) => String(r.id));
  }
}
