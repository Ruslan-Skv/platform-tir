import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePageDto, PageStatus } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

  async create(createPageDto: CreatePageDto) {
    // Check for slug uniqueness
    const existing = await this.prisma.page.findUnique({
      where: { slug: createPageDto.slug },
    });

    if (existing) {
      throw new ConflictException(`Page with slug "${createPageDto.slug}" already exists`);
    }

    return this.prisma.page.create({
      data: {
        ...createPageDto,
        publishedAt: createPageDto.status === PageStatus.PUBLISHED ? new Date() : null,
      },
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });
  }

  async findAll(params?: {
    status?: string;
    search?: string;
    parentId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, search, parentId, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.PageWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumPageStatusFilter;
    }

    if (parentId) {
      where.parentId = parentId;
    } else if (parentId === null) {
      where.parentId = null;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [pages, total] = await Promise.all([
      this.prisma.page.findMany({
        where,
        include: {
          parent: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          _count: {
            select: {
              children: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.page.count({ where }),
    ]);

    return {
      data: pages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(`Page with ID ${id} not found`);
    }

    return page;
  }

  async findBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({
      where: { slug, status: 'PUBLISHED' },
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        children: {
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            title: true,
            slug: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(`Page with slug "${slug}" not found`);
    }

    return page;
  }

  async update(id: string, updatePageDto: UpdatePageDto) {
    const page = await this.findOne(id);

    // Check for slug uniqueness if slug is being changed
    if (updatePageDto.slug && updatePageDto.slug !== page.slug) {
      const existing = await this.prisma.page.findUnique({
        where: { slug: updatePageDto.slug },
      });

      if (existing) {
        throw new ConflictException(`Page with slug "${updatePageDto.slug}" already exists`);
      }
    }

    const data: Prisma.PageUpdateInput = { ...updatePageDto };

    // Set publishedAt when publishing
    if (updatePageDto.status === PageStatus.PUBLISHED && page.status !== 'PUBLISHED') {
      data.publishedAt = new Date();
    }

    return this.prisma.page.update({
      where: { id },
      data,
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.page.delete({
      where: { id },
    });
  }

  async publish(id: string) {
    await this.findOne(id);
    return this.prisma.page.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }

  async unpublish(id: string) {
    await this.findOne(id);
    return this.prisma.page.update({
      where: { id },
      data: {
        status: 'DRAFT',
      },
    });
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.page.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
      },
    });
  }

  // Get page tree (for navigation builder)
  async getTree() {
    const pages = await this.prisma.page.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return pages;
  }

  // Reorder pages
  async reorder(items: { id: string; order: number; parentId?: string }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.page.update({
          where: { id: item.id },
          data: { order: item.order, parentId: item.parentId || null },
        }),
      ),
    );

    return { success: true };
  }
}
