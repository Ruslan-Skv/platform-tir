import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';
import { CreateBlogPostDto, PostStatus } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { deriveSeoTitle, resolveSeoDescription } from './blog-seo.util';
import {
  assertBlogBlocks,
  assertFeaturedImageAlt,
  computeReadingTimeMinutes,
  mapBlocksForCreate,
  mergeContentFromBlocks,
} from './blog-post-blocks.util';

@Injectable()
export class BlogPostsAdminService {
  constructor(private prisma: PrismaService) {}

  async createPost(authorId: string, createBlogPostDto: CreateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({
      where: { slug: createBlogPostDto.slug },
    });

    if (existing) {
      throw new ConflictException(`Post with slug "${createBlogPostDto.slug}" already exists`);
    }

    const featuredImage = createBlogPostDto.featuredImage?.trim() || null;
    const featuredImageAlt = (createBlogPostDto.featuredImageAlt ?? '').trim();
    assertFeaturedImageAlt(featuredImage, featuredImageAlt);

    const blocksPayload = createBlogPostDto.blocks ?? [];
    assertBlogBlocks(blocksPayload.length ? blocksPayload : undefined);

    const mergedContent = blocksPayload.length
      ? mergeContentFromBlocks(blocksPayload)
      : createBlogPostDto.content;
    const readingTimeMinutes = computeReadingTimeMinutes(mergedContent);

    const seoTitle = deriveSeoTitle(createBlogPostDto.title, createBlogPostDto.seoTitle);
    const seoDescription = resolveSeoDescription(
      mergedContent,
      createBlogPostDto.excerpt ?? null,
      createBlogPostDto.seoDescription,
    );

    return this.prisma.blogPost.create({
      data: {
        title: createBlogPostDto.title,
        slug: createBlogPostDto.slug,
        content: mergedContent,
        contentAlign: createBlogPostDto.contentAlign ?? 'JUSTIFY',
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
        seoTitle,
        seoDescription,
        authorId,
        publishedAt: createBlogPostDto.status === PostStatus.PUBLISHED ? new Date() : null,
        ...(blocksPayload.length
          ? {
              blocks: {
                create: mapBlocksForCreate(blocksPayload),
              },
            }
          : {}),
      } as unknown as Prisma.BlogPostCreateInput,
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
        _count: {
          select: {
            comments: true,
          },
        },
      } as unknown as Prisma.BlogPostInclude,
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
        blocks: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
      } as Prisma.BlogPostInclude,
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
    assertFeaturedImageAlt(mergedFeaturedImage, mergedFeaturedImageAlt);

    const { blocks: blocksPayload, ...updateRest } = updateBlogPostDto;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- вложенные blocks после prisma generate
    const data: any = { ...updateRest };

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

    if (blocksPayload !== undefined) {
      assertBlogBlocks(blocksPayload.length ? blocksPayload : undefined);
      if (blocksPayload.length) {
        const merged = mergeContentFromBlocks(blocksPayload);
        data.content = merged;
        data.readingTimeMinutes = computeReadingTimeMinutes(merged);
        data.blocks = {
          deleteMany: {},
          create: mapBlocksForCreate(blocksPayload),
        };
      } else {
        data.blocks = { deleteMany: {} };
        if (updateBlogPostDto.content !== undefined) {
          data.readingTimeMinutes = computeReadingTimeMinutes(updateBlogPostDto.content);
        }
      }
    } else if (updateBlogPostDto.content !== undefined) {
      data.readingTimeMinutes = computeReadingTimeMinutes(updateBlogPostDto.content);
    }

    const mergedTitle = String(data.title !== undefined ? data.title : post.title);
    const mergedContentHtml = String(data.content !== undefined ? data.content : post.content);
    const mergedExcerpt = data.excerpt !== undefined ? data.excerpt : post.excerpt;

    if (updateBlogPostDto.seoTitle !== undefined) {
      data.seoTitle = deriveSeoTitle(mergedTitle, updateBlogPostDto.seoTitle);
    }
    if (updateBlogPostDto.seoDescription !== undefined) {
      data.seoDescription = resolveSeoDescription(
        mergedContentHtml,
        mergedExcerpt,
        updateBlogPostDto.seoDescription,
      );
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
        blocks: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
      } as Prisma.BlogPostInclude,
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
}
