import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';
import { CreateBlogPostDto, PostStatus } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  /** ~200 слов/мин для русскоязычного текста; не менее 1 мин. */
  computeReadingTimeMinutes(content: string): number {
    const text = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return 1;
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  private assertFeaturedImageAlt(featuredImage: string | null, featuredImageAlt: string) {
    if (featuredImage && !featuredImageAlt.trim()) {
      throw new BadRequestException('Alt-текст обязателен при указании изображения статьи');
    }
  }

  // Blog Posts
  async createPost(authorId: string, createBlogPostDto: CreateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({
      where: { slug: createBlogPostDto.slug },
    });

    if (existing) {
      throw new ConflictException(`Post with slug "${createBlogPostDto.slug}" already exists`);
    }

    const featuredImage = createBlogPostDto.featuredImage?.trim() || null;
    const featuredImageAlt = (createBlogPostDto.featuredImageAlt ?? '').trim();
    this.assertFeaturedImageAlt(featuredImage, featuredImageAlt);

    const readingTimeMinutes = this.computeReadingTimeMinutes(createBlogPostDto.content);

    return this.prisma.blogPost.create({
      data: {
        title: createBlogPostDto.title,
        slug: createBlogPostDto.slug,
        content: createBlogPostDto.content,
        excerpt: createBlogPostDto.excerpt,
        featuredImage,
        featuredImageAlt,
        badge: createBlogPostDto.badge?.trim() || null,
        sortOrder: createBlogPostDto.sortOrder ?? 0,
        authorByline: createBlogPostDto.authorByline?.trim() || null,
        readingTimeMinutes,
        status: createBlogPostDto.status ?? PostStatus.DRAFT,
        categoryId: createBlogPostDto.categoryId?.trim() || undefined,
        tags: createBlogPostDto.tags ?? [],
        seoTitle: createBlogPostDto.seoTitle,
        seoDescription: createBlogPostDto.seoDescription,
        authorId,
        publishedAt: createBlogPostDto.status === PostStatus.PUBLISHED ? new Date() : null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async findAllPosts(params?: {
    status?: string;
    categoryId?: string;
    authorId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, categoryId, authorId, search, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {};

    if (status) {
      where.status = status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
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
          _count: {
            select: {
              comments: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data: posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOnePost(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        category: true,
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async updatePost(id: string, updateBlogPostDto: UpdateBlogPostDto) {
    const post = await this.findOnePost(id);

    if (updateBlogPostDto.slug && updateBlogPostDto.slug !== post.slug) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug: updateBlogPostDto.slug },
      });

      if (existing) {
        throw new ConflictException(`Post with slug "${updateBlogPostDto.slug}" already exists`);
      }
    }

    const mergedFeaturedImage =
      updateBlogPostDto.featuredImage !== undefined
        ? updateBlogPostDto.featuredImage?.trim() || null
        : post.featuredImage;
    const mergedFeaturedImageAlt =
      updateBlogPostDto.featuredImageAlt !== undefined
        ? (updateBlogPostDto.featuredImageAlt ?? '').trim()
        : post.featuredImageAlt;
    this.assertFeaturedImageAlt(mergedFeaturedImage, mergedFeaturedImageAlt);

    const data: Prisma.BlogPostUpdateInput = { ...updateBlogPostDto };

    if (updateBlogPostDto.featuredImage !== undefined) {
      data.featuredImage = mergedFeaturedImage;
    }
    if (updateBlogPostDto.featuredImageAlt !== undefined) {
      data.featuredImageAlt = mergedFeaturedImageAlt;
    }
    if (updateBlogPostDto.badge !== undefined) {
      data.badge = updateBlogPostDto.badge?.trim() || null;
    }
    if (updateBlogPostDto.authorByline !== undefined) {
      data.authorByline = updateBlogPostDto.authorByline?.trim() || null;
    }
    if (updateBlogPostDto.sortOrder !== undefined) {
      data.sortOrder = updateBlogPostDto.sortOrder;
    }

    if (updateBlogPostDto.content !== undefined) {
      data.readingTimeMinutes = this.computeReadingTimeMinutes(updateBlogPostDto.content);
    }

    if (updateBlogPostDto.status === PostStatus.PUBLISHED && post.status !== 'PUBLISHED') {
      data.publishedAt = new Date();
    }

    return this.prisma.blogPost.update({
      where: { id },
      data,
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
    });
  }

  async removePost(id: string) {
    await this.findOnePost(id);
    return this.prisma.blogPost.delete({
      where: { id },
    });
  }

  async publishPost(id: string) {
    await this.findOnePost(id);
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }

  // Blog Categories
  async createCategory(createBlogCategoryDto: CreateBlogCategoryDto) {
    const existing = await this.prisma.blogCategory.findUnique({
      where: { slug: createBlogCategoryDto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Category with slug "${createBlogCategoryDto.slug}" already exists`,
      );
    }

    return this.prisma.blogCategory.create({
      data: createBlogCategoryDto,
    });
  }

  async findAllCategories() {
    return this.prisma.blogCategory.findMany({
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async updateCategory(id: string, data: Partial<CreateBlogCategoryDto>) {
    return this.prisma.blogCategory.update({
      where: { id },
      data,
    });
  }

  async removeCategory(id: string) {
    return this.prisma.blogCategory.delete({
      where: { id },
    });
  }

  async findAllBadgePresets() {
    return this.prisma.blogBadgePreset.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async createBadgePreset(label: string) {
    const t = label.trim();
    if (!t) {
      throw new BadRequestException('Укажите текст плашки');
    }
    const existing = await this.prisma.blogBadgePreset.findUnique({
      where: { label: t },
    });
    if (existing) {
      throw new ConflictException('Такая плашка уже есть в списке');
    }
    return this.prisma.blogBadgePreset.create({
      data: { label: t },
    });
  }

  async uploadFeaturedImage(
    file: Express.Multer.File,
    baseUrl: string,
  ): Promise<{ imageUrl: string }> {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'blog');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = extname(file.originalname) || '.jpg';
    const filename = `blog-${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destPath);
    const rel = `/uploads/blog/${filename}`;
    const prefix = uploadsBaseUrl(baseUrl);
    return { imageUrl: `${prefix}${rel}` };
  }

  // Public API (published posts only)
  async getPublishedPosts(params?: {
    categorySlug?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { categorySlug, search, page = 1, limit = 12 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = { status: 'PUBLISHED' };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
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
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with slug "${slug}" not found`);
    }

    // Increment view count
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
    } else {
      await this.prisma.blogPostLike.create({
        data: { postId, likerId },
      });
      const count = await this.prisma.blogPostLike.count({ where: { postId } });
      return { liked: true, likeCount: count };
    }
  }

  async getPublicCategories() {
    return this.prisma.blogCategory.findMany({
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  // Stats
  async getStats() {
    const [totalPosts, publishedPosts, draftPosts] = await Promise.all([
      this.prisma.blogPost.count(),
      this.prisma.blogPost.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.blogPost.count({ where: { status: 'DRAFT' } }),
    ]);

    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      /** Комментарии к статьям отключены; поле сохранено для совместимости API. */
      pendingComments: 0,
    };
  }
}
