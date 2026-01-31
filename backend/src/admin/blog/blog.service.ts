import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBlogPostDto, PostStatus } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  // Blog Posts
  async createPost(authorId: string, createBlogPostDto: CreateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({
      where: { slug: createBlogPostDto.slug },
    });

    if (existing) {
      throw new ConflictException(`Post with slug "${createBlogPostDto.slug}" already exists`);
    }

    return this.prisma.blogPost.create({
      data: {
        ...createBlogPostDto,
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
        orderBy: { createdAt: 'desc' },
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
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          where: { parentId: null },
          orderBy: { createdAt: 'desc' },
        },
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

    const data: Prisma.BlogPostUpdateInput = { ...updateBlogPostDto };

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

  // Comments Management
  async findAllComments(params?: {
    status?: string;
    postId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, postId, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.CommentWhereInput = { parentId: null };

    if (status) {
      where.status = status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM';
    }

    if (postId) {
      where.postId = postId;
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data: comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveComment(id: string) {
    return this.prisma.comment.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async rejectComment(id: string) {
    return this.prisma.comment.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }

  async markCommentAsSpam(id: string) {
    return this.prisma.comment.update({
      where: { id },
      data: { status: 'SPAM' },
    });
  }

  async removeComment(id: string) {
    return this.prisma.comment.delete({
      where: { id },
    });
  }

  async replyToComment(commentId: string, content: string, authorId: string) {
    const parent = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });
    if (!parent) {
      throw new NotFoundException('Комментарий не найден');
    }
    return this.prisma.comment.create({
      data: {
        postId: parent.postId,
        content: content.trim(),
        authorId,
        parentId: commentId,
        status: 'APPROVED',
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
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
        orderBy: { publishedAt: 'desc' },
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
        comments: {
          where: { status: 'APPROVED', parentId: null },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            replies: {
              where: { status: 'APPROVED' },
              include: {
                author: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
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

    const { comments, ...postData } = post;
    return {
      ...postData,
      comments,
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

  async createComment(
    postId: string,
    dto: { content: string; authorName?: string; authorEmail?: string; parentId?: string },
    userId?: string,
  ) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId, status: 'PUBLISHED' },
    });
    if (!post) {
      throw new NotFoundException('Пост не найден');
    }
    if (!post.allowComments) {
      throw new ConflictException('Комментарии отключены для этого поста');
    }

    return this.prisma.comment.create({
      data: {
        postId,
        content: dto.content.trim(),
        authorId: userId,
        authorName: dto.authorName?.trim(),
        authorEmail: dto.authorEmail?.trim(),
        parentId: dto.parentId,
        status: 'PENDING',
      },
    });
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
    const [totalPosts, publishedPosts, draftPosts, pendingComments] = await Promise.all([
      this.prisma.blogPost.count(),
      this.prisma.blogPost.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.blogPost.count({ where: { status: 'DRAFT' } }),
      this.prisma.comment.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      pendingComments,
    };
  }
}
